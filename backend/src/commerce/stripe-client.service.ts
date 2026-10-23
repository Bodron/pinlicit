import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe = require("stripe");

@Injectable()
export class StripeClientService {
  private client?: Stripe;
  constructor(private readonly config: ConfigService) {}
  get enabled() {
    return this.config.get<string>("STRIPE_ENABLED") === "true";
  }
  mobileConfig() {
    const key = this.config.get<string>("STRIPE_PUBLISHABLE_KEY") || "";
    return {
      enabled: this.enabled,
      ready: this.enabled && /^pk_test_/.test(key),
      mode: "test",
      deferredSellerOnboarding: true,
      publishableKey: /^pk_test_/.test(key) ? key : null,
      merchantDisplayName: "Pinbind",
      guaranteeBps: 1000,
      minimumGuaranteePayment: 300,
      minimumBidMaximum: 3000,
    };
  }
  assertSecureAuth() {
    const secret = this.config.get<string>("JWT_SECRET") || "";
    if (secret.length < 32 || secret === "dev-secret") {
      throw new ServiceUnavailableException(
        "A strong JWT_SECRET is required before enabling Stripe.",
      );
    }
  }
  get transfersEnabled() {
    return (
      this.config.get<string>("STRIPE_AUTOMATIC_TRANSFERS_ENABLED") === "true"
    );
  }
  get sdk(): Stripe {
    const key = this.config.get<string>("STRIPE_SECRET_KEY") || "";
    // This first integration is deliberately sandbox-only. Live enablement is
    // a separate release after the end-to-end scenarios and business policy.
    if (!this.enabled || !/^(sk|rk)_test_/.test(key)) {
      throw new ServiceUnavailableException(
        "Stripe sandbox is not configured.",
      );
    }
    return (this.client ??= new Stripe(key, {
      maxNetworkRetries: 2,
      timeout: 10000,
    }));
  }
  setting(name: string, min: number, max: number): number {
    const value = this.config.get<string>(name);
    if (value === undefined || value === "" || !/^\d+$/.test(String(value))) {
      throw new ServiceUnavailableException(`Missing Stripe policy: ${name}.`);
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
      throw new ServiceUnavailableException(`Invalid Stripe policy: ${name}.`);
    }
    return parsed;
  }
  returnUrl(name: string) {
    const value = this.config.get<string>(name);
    try {
      const url = new URL(value);
      if (
        url.username ||
        url.password ||
        url.hash ||
        !(
          url.protocol === "https:" ||
          (url.protocol === "http:" &&
            ["localhost", "127.0.0.1"].includes(url.hostname))
        )
      )
        throw new Error();
      return url.toString();
    } catch {
      throw new ServiceUnavailableException(
        `Invalid Stripe return URL: ${name}.`,
      );
    }
  }
  event(body: Buffer, signature: string, connected = false): Stripe.Event {
    const secret = this.config.get<string>(
      connected ? "STRIPE_CONNECT_WEBHOOK_SECRET" : "STRIPE_WEBHOOK_SECRET",
    );
    if (!secret)
      throw new ServiceUnavailableException(
        "Stripe webhook is not configured.",
      );
    if (!body || !signature)
      throw new BadRequestException("Invalid Stripe signature.");
    try {
      const event = this.sdk.webhooks.constructEvent(body, signature, secret);
      if (
        event.livemode ||
        (connected
          ? event.type !== "account.updated" ||
            event.account !== event.data.object.id
          : Boolean(event.account))
      )
        throw new Error();
      return event;
    } catch {
      throw new BadRequestException("Invalid Stripe event.");
    }
  }
}
