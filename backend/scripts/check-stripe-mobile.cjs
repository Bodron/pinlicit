/* Sandbox-only: creates an unpaid intent, checks the matching public key, then
 * cancels it. Never charges a card or touches MongoDB. Never prints keys. */
const fs = require("node:fs");
const { randomUUID } = require("node:crypto");
const Stripe = require("stripe");
const values = require("dotenv").parse(
  fs.readFileSync(process.env.ENV_FILE || ".env"),
);
async function main() {
  if (
    !/^sk_test_/.test(values.STRIPE_SECRET_KEY || "") ||
    !/^pk_test_/.test(values.STRIPE_PUBLISHABLE_KEY || "")
  )
    throw new Error("Both sandbox keys are required");
  const stripe = new Stripe(values.STRIPE_SECRET_KEY, {
    timeout: 15000,
    maxNetworkRetries: 1,
  });
  let intent;
  try {
    intent = await stripe.paymentIntents.create(
      {
        amount: 300,
        currency: "ron",
        allowed_payment_method_types: ["card"],
        capture_method: "automatic",
        metadata: { purpose: "pinbind_mobile_config_check" },
      },
      { idempotencyKey: `config-check:${randomUUID()}` },
    );
    const client = new Stripe(values.STRIPE_PUBLISHABLE_KEY, {
      timeout: 15000,
      maxNetworkRetries: 1,
    });
    const visible = await client.paymentIntents.retrieve(intent.id, {
      client_secret: intent.client_secret,
    });
    if (visible.livemode || visible.id !== intent.id || visible.amount !== 300)
      throw new Error("Unexpected payment configuration");
    console.log(
      "PASS: matching Stripe sandbox keys, RON card payments, mobile client-secret access. No card charged.",
    );
  } finally {
    if (intent)
      await stripe.paymentIntents.cancel(
        intent.id,
        {},
        { idempotencyKey: `cancel-config-check:${intent.id}` },
      );
  }
}
main().catch((error) => {
  console.error(
    `Stripe mobile check failed (${error.type || error.name}, ${error.code || "configuration"}). No key or client secret is printed.`,
  );
  process.exitCode = 1;
});
