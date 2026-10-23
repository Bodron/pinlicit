import { ConfigService } from "@nestjs/config";
import { StripeClientService } from "../commerce/stripe-client.service";

// Shared by Nest startup and the server preflight command. Never print values.
export function validateEnvironment(values: Record<string, any>) {
  const required = (key: string) => {
    if (!String(values[key] || "").trim()) throw new Error(`Missing ${key}.`);
  };
  for (const key of ["STRIPE_ENABLED", "STRIPE_AUTOMATIC_TRANSFERS_ENABLED"]) {
    if (values[key] !== undefined && !["true", "false"].includes(values[key]))
      throw new Error(`${key} must be true or false.`);
  }
  if (values.PORT !== undefined && !/^[0-9]+$/.test(String(values.PORT)))
    throw new Error("PORT must be an integer.");
  if (values.PORT !== undefined && (+values.PORT < 1 || +values.PORT > 65535))
    throw new Error("PORT must be between 1 and 65535.");
  const stripe = new StripeClientService(new ConfigService(values));
  if (values.NODE_ENV === "production") {
    required("MONGODB_URI");
    if (!/^mongodb(?:\+srv)?:\/\//.test(values.MONGODB_URI))
      throw new Error("MONGODB_URI must be a MongoDB connection string.");
    stripe.assertSecureAuth();
    required("APP_ORIGIN");
    for (const origin of String(values.APP_ORIGIN).split(",")) {
      try {
        const url = new URL(origin.trim());
        if (
          !["https:", "http:"].includes(url.protocol) ||
          url.origin !== origin.trim()
        )
          throw new Error();
      } catch {
        throw new Error(
          "APP_ORIGIN must contain comma-separated HTTP(S) origins without paths.",
        );
      }
    }
  }
  if (!stripe.enabled && stripe.transfersEnabled)
    throw new Error("Automatic transfers require STRIPE_ENABLED=true.");
  if (stripe.enabled) {
    stripe.assertSecureAuth();
    stripe.sdk;
    if (!stripe.mobileConfig().ready)
      throw new Error("A sandbox STRIPE_PUBLISHABLE_KEY is required.");
    for (const key of [
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_CONNECT_WEBHOOK_SECRET",
    ]) {
      required(key);
      if (!String(values[key]).startsWith("whsec_"))
        throw new Error(`${key} must be a Stripe webhook signing secret.`);
    }
    if (values.STRIPE_WEBHOOK_SECRET === values.STRIPE_CONNECT_WEBHOOK_SECRET)
      throw new Error(
        "Platform and Connect webhook secrets must be different.",
      );
    stripe.setting("STRIPE_PLATFORM_FEE_BPS", 0, 5000);
    stripe.setting("STRIPE_PAYMENT_WINDOW_HOURS", 1, 168);
    stripe.setting("STRIPE_RELEASE_DELAY_HOURS", 1, 720);
    stripe.setting("STRIPE_MAX_FULFILLMENT_DAYS", 1, 60);
    for (const key of [
      "STRIPE_IDENTITY_RETURN_URL",
      "STRIPE_CONNECT_RETURN_URL",
      "STRIPE_CONNECT_REFRESH_URL",
    ])
      stripe.returnUrl(key);
  }
  return values;
}
