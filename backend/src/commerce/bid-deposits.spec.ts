import { requiredDeposit } from "./bid-deposits.service";
import { StripeClientService } from "./stripe-client.service";
import { ConfigService } from "@nestjs/config";
describe("bid guarantee accounting", () => {
  it("uses integer bani and rounds the 10% guarantee up", () => {
    expect(requiredDeposit(3000)).toBe(300);
    expect(requiredDeposit(5500)).toBe(550);
    expect(requiredDeposit(5501)).toBe(551);
    expect(requiredDeposit(99999999)).toBe(10000000);
    for (const maximum of [0, -1, 2999, 3000.5, NaN, Infinity, 100000000])
      expect(() => requiredDeposit(maximum)).toThrow();
  });
  it("exposes only the sandbox publishable key and fails closed without it", () => {
    const make = (values: Record<string, string>) =>
      new StripeClientService({
        get: (key: string) => values[key],
      } as ConfigService);
    expect(
      make({
        STRIPE_ENABLED: "true",
        STRIPE_SECRET_KEY: "sk_test_private",
      }).mobileConfig().ready,
    ).toBe(false);
    expect(
      make({
        STRIPE_ENABLED: "true",
        STRIPE_PUBLISHABLE_KEY: "pk_live_wrong",
      }).mobileConfig().publishableKey,
    ).toBeNull();
    const config = make({
      STRIPE_ENABLED: "true",
      STRIPE_PUBLISHABLE_KEY: "pk_test_public",
      STRIPE_SECRET_KEY: "sk_test_private",
    }).mobileConfig();
    expect(config.ready).toBe(true);
    expect(JSON.stringify(config)).not.toContain("sk_test_private");
  });
});
