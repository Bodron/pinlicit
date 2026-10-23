import { validateEnvironment } from "./environment";

const server = {
  NODE_ENV: "production",
  MONGODB_URI: "mongodb+srv://fixture.example/test",
  JWT_SECRET: "fixture-secret-with-more-than-32-characters",
  APP_ORIGIN: "https://pinbind.example,https://admin.pinbind.example",
};
const sandbox = {
  ...server,
  STRIPE_ENABLED: "true",
  STRIPE_PUBLISHABLE_KEY: "pk_test_fixture",
  STRIPE_SECRET_KEY: "sk_test_fixture",
  STRIPE_WEBHOOK_SECRET: "whsec_platform",
  STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_connect",
  STRIPE_PLATFORM_FEE_BPS: "500",
  STRIPE_PAYMENT_WINDOW_HOURS: "48",
  STRIPE_RELEASE_DELAY_HOURS: "48",
  STRIPE_MAX_FULFILLMENT_DAYS: "30",
  STRIPE_IDENTITY_RETURN_URL: "https://pinbind.example/return",
  STRIPE_CONNECT_RETURN_URL: "https://pinbind.example/return",
  STRIPE_CONNECT_REFRESH_URL: "https://pinbind.example/refresh",
};
describe("Server environment", () => {
  it("accepts cloud DB with Stripe disabled or fully configured sandbox", () => {
    expect(validateEnvironment(server)).toEqual(server);
    expect(validateEnvironment(sandbox)).toEqual(sandbox);
  });
  it.each([
    { MONGODB_URI: "" },
    { JWT_SECRET: "dev-secret" },
    { APP_ORIGIN: "*" },
    { APP_ORIGIN: "https://pinbind.example/path" },
    { PORT: "0" },
    { PORT: "3000oops" },
    { STRIPE_ENABLED: "yes" },
    { STRIPE_AUTOMATIC_TRANSFERS_ENABLED: "true" },
  ])("rejects unsafe server configuration %p", (override) => {
    expect(() => validateEnvironment({ ...server, ...override })).toThrow();
  });
  it.each([
    { STRIPE_WEBHOOK_SECRET: "" },
    { STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_platform" },
    { STRIPE_SECRET_KEY: "sk_live_fixture" },
    { STRIPE_PUBLISHABLE_KEY: "" },
    { STRIPE_PUBLISHABLE_KEY: "pk_live_fixture" },
    { STRIPE_PLATFORM_FEE_BPS: "" },
    { STRIPE_CONNECT_RETURN_URL: "http://public.example/return" },
  ])("rejects incomplete or live Stripe configuration %p", (override) => {
    expect(() => validateEnvironment({ ...sandbox, ...override })).toThrow();
  });
});
