import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe = require("stripe");
import { StripeClientService } from "./stripe-client.service";
import { assertBuyer, priceSnapshot, publicOrder } from "./commerce.policy";
import { AuctionsGateway } from "../auctions/auctions.gateway";

describe("Stripe policy and trust boundaries", () => {
  function service(values: Record<string, string> = {}) {
    return new StripeClientService({
      get: (key: string) => values[key],
    } as ConfigService);
  }
  it("requires explicit sandbox enablement and rejects live keys", () => {
    expect(() => service({}).sdk).toThrow(ServiceUnavailableException);
    expect(
      () =>
        service({
          STRIPE_ENABLED: "true",
          STRIPE_SECRET_KEY: "sk_live_not_a_real_key",
        }).sdk,
    ).toThrow(ServiceUnavailableException);
    expect(
      service({ STRIPE_ENABLED: "true", STRIPE_SECRET_KEY: "sk_test_fixture" })
        .sdk.paymentIntents.create,
    ).toEqual(expect.any(Function));
  });
  it("does not invent missing fee/delivery policy and validates bounded integers", () => {
    expect(() =>
      service({}).setting("STRIPE_PLATFORM_FEE_BPS", 0, 5000),
    ).toThrow(ServiceUnavailableException);
    expect(() => service({ FEE: "2.5" }).setting("FEE", 0, 5000)).toThrow(
      ServiceUnavailableException,
    );
    expect(() => service({ FEE: "5001" }).setting("FEE", 0, 5000)).toThrow(
      ServiceUnavailableException,
    );
    expect(service({ FEE: "0" }).setting("FEE", 0, 5000)).toBe(0);
    expect(service({}).transfersEnabled).toBe(false);
  });
  it("uses integer bani and preserves the exact accounting sum", () => {
    for (const amount of [1, 99, 5000, 1234567, 99999999]) {
      for (const bps of [0, 1, 350, 5000]) {
        const quote = priceSnapshot(amount, bps);
        expect(quote.fee + quote.sellerAmount).toBe(amount);
        expect(quote.fee).toBe(Math.floor((amount * bps) / 10000));
        expect(quote.currency).toBe("ron");
      }
    }
    for (const amount of [
      -1,
      0,
      10.5,
      NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER,
    ]) {
      expect(() => priceSnapshot(amount, 500)).toThrow(BadRequestException);
    }
  });
  it("restricts return URLs to configured HTTPS or local HTTP", () => {
    for (const URL of [
      "javascript:alert(1)",
      "http://example.com",
      "https://user:pass@example.com",
      "https://example.com/#secret",
    ]) {
      expect(() => service({ URL }).returnUrl("URL")).toThrow(
        ServiceUnavailableException,
      );
    }
    expect(
      service({ URL: "http://localhost:3002/cont/verificare" }).returnUrl(
        "URL",
      ),
    ).toContain("localhost");
  });
  it("never projects Stripe secrets, account IDs or support notes to clients", () => {
    const result = publicOrder({
      _id: "o",
      product: "p",
      buyer: "b",
      seller: "s",
      paymentIntentId: "pi_private",
      paymentAttempt: "attempt",
      connectedAccountId: "acct_private",
      client_secret: "secret",
      refundReason: "private",
      status: "paid",
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("private");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("attempt");
    expect(() => assertBuyer({ buyer: "another" }, "buyer")).toThrow(
      ForbiddenException,
    );
  });
  it("verifies webhook signatures, body integrity, sandbox mode and Connect scope", () => {
    const target = service({
      STRIPE_ENABLED: "true",
      STRIPE_SECRET_KEY: "sk_test_fixture",
      STRIPE_WEBHOOK_SECRET: "whsec_fixture",
      STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_connected_fixture",
    });
    const payload = JSON.stringify({
      id: "evt_fixture",
      type: "payment_intent.succeeded",
      livemode: false,
      data: { object: { id: "pi_fixture" } },
    });
    const signature = target.sdk.webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_fixture",
    });
    expect(target.event(Buffer.from(payload), signature).id).toBe(
      "evt_fixture",
    );
    expect(() => target.event(Buffer.from(payload + " "), signature)).toThrow(
      BadRequestException,
    );
    expect(() => target.event(Buffer.from(payload), "invalid")).toThrow(
      BadRequestException,
    );
    for (const extra of [{ livemode: true }, { account: "acct_foreign" }]) {
      const body = JSON.stringify({ ...JSON.parse(payload), ...extra });
      const header = target.sdk.webhooks.generateTestHeaderString({
        payload: body,
        secret: "whsec_fixture",
      });
      expect(() => target.event(Buffer.from(body), header)).toThrow(
        BadRequestException,
      );
    }
    const connected = JSON.stringify({
      id: "evt_account",
      type: "account.updated",
      livemode: false,
      account: "acct_own",
      data: { object: { id: "acct_own" } },
    });
    const header = target.sdk.webhooks.generateTestHeaderString({
      payload: connected,
      secret: "whsec_connected_fixture",
    });
    expect(target.event(Buffer.from(connected), header, true).id).toBe(
      "evt_account",
    );
    expect(() => target.event(Buffer.from(connected), header)).toThrow(
      BadRequestException,
    );
  });
});

describe("Auction WebSocket boundaries", () => {
  it("does not allow client supplied user IDs to create bids", () => {
    const bids = { placeBid: jest.fn() };
    const client = { emit: jest.fn() };
    const gateway = new AuctionsGateway({} as never, bids as never);
    gateway.place(client as never);
    expect(bids.placeBid).not.toHaveBeenCalled();
    expect(client.emit).toHaveBeenCalledWith(
      "bid:rejected",
      expect.any(Object),
    );
  });
  it("does not broadcast proxy maxima or bidder contact details", () => {
    const emit = jest.fn();
    const gateway = new AuctionsGateway({} as never, {} as never);
    gateway.server = { to: () => ({ emit }) } as never;
    gateway.broadcastBid(
      { _id: "p" },
      {
        _id: "b",
        amount: 5500,
        maxAmount: 90000,
        bidder: { _id: "u", name: "Buyer", email: "private@example.invalid" },
      },
      false,
    );
    const payload = JSON.stringify(emit.mock.calls);
    expect(payload).not.toContain("90000");
    expect(payload).not.toContain("private@");
    expect(payload).toContain("5500");
  });
});
