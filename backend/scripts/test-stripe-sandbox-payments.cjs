/* Explicit sandbox smoke test: Stripe test payment methods only, no MongoDB.
 * All successful simulated payments are refunded, incomplete ones canceled. */
const fs = require("node:fs");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const Stripe = require("stripe");
const values = require("dotenv").parse(
  fs.readFileSync(process.env.ENV_FILE || ".env"),
);
async function main() {
  if (!/^sk_test_/.test(values.STRIPE_SECRET_KEY || ""))
    throw new Error("Sandbox key required");
  const stripe = new Stripe(values.STRIPE_SECRET_KEY, {
    timeout: 15000,
    maxNetworkRetries: 1,
  });
  const run = randomUUID(),
    ids = [];
  const create = async (amount, label) => {
    const intent = await stripe.paymentIntents.create(
      {
        amount,
        currency: "ron",
        allowed_payment_method_types: ["card"],
        capture_method: "automatic",
        metadata: { purpose: "pinbind_sandbox_smoke", run, label },
      },
      { idempotencyKey: `smoke:${run}:${label}` },
    );
    ids.push(intent.id);
    assert.equal(intent.livemode, false);
    return intent;
  };
  try {
    const deposit = await create(1000, "guarantee");
    const first = await stripe.paymentIntents.confirm(deposit.id, {
      payment_method: "pm_card_visa",
    });
    assert.equal(first.status, "succeeded");
    const remaining = await create(9000, "remaining");
    const final = await stripe.paymentIntents.confirm(remaining.id, {
      payment_method: "pm_card_visa",
    });
    assert.equal(final.status, "succeeded");
    assert.equal(first.amount + final.amount, 10000);
    const sca = await create(300, "3ds");
    const challenged = await stripe.paymentIntents.confirm(sca.id, {
      payment_method: "pm_card_authenticationRequired",
      return_url: "https://pinbind.bcmenu.ro/commerce/stripe/return",
    });
    assert.equal(challenged.status, "requires_action");
    const declined = await create(300, "decline");
    try {
      await stripe.paymentIntents.confirm(declined.id, {
        payment_method: "pm_card_chargeDeclined",
      });
      throw new Error("Expected declined test card");
    } catch (error) {
      assert.equal(error.type, "StripeCardError");
    }
    console.log(
      "PASS: Stripe sandbox guarantee + remaining RON payment, 3DS challenge, declined card. No real money.",
    );
  } finally {
    for (const id of ids) {
      const current = await stripe.paymentIntents.retrieve(id);
      if (current.status === "succeeded") {
        const refund = await stripe.refunds.create(
          { payment_intent: id },
          { idempotencyKey: `smoke-refund:${run}:${id}` },
        );
        assert.equal(refund.status, "succeeded");
      } else if (current.status !== "canceled")
        await stripe.paymentIntents.cancel(
          id,
          {},
          { idempotencyKey: `smoke-cancel:${run}:${id}` },
        );
    }
    console.log(
      "Sandbox cleanup: successful test payments refunded, other intents canceled.",
    );
  }
}
main().catch((error) => {
  console.error(
    `Sandbox payments test failed (${error.type || error.name}, ${error.code || "assertion"}). No keys or card data printed.`,
  );
  process.exitCode = 1;
});
