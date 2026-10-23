// Explicit sandbox fixture repair, authorized for the three DEMO listings.
// Defaults to a read-only plan. Never reprices a bid, paid order, or real listing.
require("reflect-metadata");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const mongoose = require("mongoose");
const Stripe = require("stripe");
const { CommerceLockSchema } = require("../dist/commerce/commerce.schemas");
const {
  CommerceLockService,
} = require("../dist/commerce/commerce-lock.service");
const { priceSnapshot } = require("../dist/commerce/commerce.policy");
const env = require("dotenv").parse(
  fs.readFileSync(process.env.ENV_FILE || ".env"),
);
const apply = process.argv.includes("--apply");
const rows = [
  {
    id: "b39c8e1d4e10dbda200bdcef",
    title: "BMW — DEMO",
    starting: 5000000,
    buy: 12500000,
    increment: 10000,
  },
  {
    id: "cae2c23ec2305b6536bf44ba",
    title: "Audi A4 — DEMO",
    starting: 2000000,
    buy: 4500000,
    increment: 10000,
  },
  {
    id: "7b0bda49ad9da984b89b95f7",
    title: "Poster Bichon — DEMO",
    starting: 3000,
    buy: 10000,
    increment: 500,
  },
];
async function main() {
  if (!env.STRIPE_SECRET_KEY?.startsWith("sk_test_"))
    throw Error("Sandbox required");
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    timeout: 15000,
    maxNetworkRetries: 1,
  });
  await mongoose.connect(env.MONGODB_URI, {
    autoIndex: false,
    autoCreate: false,
    serverSelectionTimeoutMS: 15000,
  });
  const db = mongoose.connection.db;
  const locks = new CommerceLockService(
    mongoose.model("CommerceLock", CommerceLockSchema),
  );
  const backup = [];
  for (const row of rows) {
    const id = new mongoose.Types.ObjectId(row.id);
    const initialOrder = await db
      .collection("commerceorders")
      .findOne({ product: id });
    const repair = async () => {
      const product = await db
        .collection("products")
        .findOne({
          _id: id,
          title: row.title,
          "demoFixture.batch": "pinbind-display-demo-2026-10-v1",
        });
      if (!product || !["active", "reserved"].includes(product.status))
        throw Error("Unexpected demo fixture");
      if (
        (await db.collection("bids").countDocuments({ product: id })) ||
        (await db.collection("biddeposits").countDocuments({ product: id }))
      )
        throw Error("Existing bids or deposits must not be repriced");
      const order = await db
        .collection("commerceorders")
        .findOne({ product: id });
      if (
        !!initialOrder !== !!order ||
        (order && String(initialOrder._id) !== String(order._id))
      )
        throw Error("Concurrent order creation");
      if (
        order &&
        (String(order._id) !== "6adb8e75a657b0e7a047c54d" ||
          order.status !== "awaiting_payment" ||
          order.chargeId ||
          order.transferId ||
          order.depositCredit ||
          order.refundedAmount ||
          String(order.buyer) !== "6a3a7f813fd2d32e2247b74a")
      )
        throw Error(
          "Only the authorized unpaid BMW test reservation may be repaired",
        );
      if (order?.amount === row.buy && product.buyNowPrice === row.buy) {
        console.log("Already corrected:", row.title);
        return;
      }
      if (order?.paymentStartedAt && !order.paymentIntentId)
        throw Error("Unresolved payment creation requires review");
      let intent;
      if (order?.paymentIntentId) {
        intent = await stripe.paymentIntents.retrieve(order.paymentIntentId);
        if (
          intent.livemode ||
          intent.amount_received !== 0 ||
          !["requires_payment_method", "canceled"].includes(intent.status) ||
          intent.amount !== order.amount ||
          intent.metadata.orderId !== String(order._id) ||
          intent.metadata.attempt !== order.paymentAttempt
        )
          throw Error("Payment is not safe to replace");
      }
      backup.push({ product, order });
      if (!apply) {
        console.log("Plan:", row.title, row.buy / 100, "RON simulated");
        return;
      }
      const backupFile = path.join(
        os.tmpdir(),
        "pinbind-demo-prices-" + Date.now() + "-" + randomUUID() + ".json",
      );
      fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), {
        mode: 0o600,
        flag: "wx",
      });
      if (intent && intent.status !== "canceled") {
        intent = await stripe.paymentIntents.cancel(
          intent.id,
          {},
          { idempotencyKey: "repair-demo-prices:cancel:" + intent.id },
        );
        if (intent.status !== "canceled")
          throw Error("Payment cancellation not confirmed");
      }
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          if (
            (await db
              .collection("bids")
              .countDocuments({ product: id }, { session })) ||
            (await db
              .collection("biddeposits")
              .countDocuments({ product: id }, { session }))
          )
            throw Error("Concurrent bid/deposit");
          const changed = await db.collection("products").updateOne(
            {
              _id: id,
              status: product.status,
              buyNowPrice: product.buyNowPrice,
              currentPrice: product.currentPrice,
            },
            {
              $set: {
                startingPrice: row.starting,
                buyNowPrice: row.buy,
                minBidIncrement: row.increment,
                currentPrice: order ? row.buy : row.starting,
                updatedAt: new Date(),
                demoPriceRepair: {
                  version: 1,
                  at: new Date(),
                  previousBuyNowPrice: product.buyNowPrice,
                },
              },
            },
            { session },
          );
          if (changed.matchedCount !== 1)
            throw Error("Concurrent product change");
          if (order) {
            const updated = await db.collection("commerceorders").updateOne(
              {
                _id: order._id,
                status: "awaiting_payment",
                amount: order.amount,
                paymentAttempt: order.paymentAttempt,
              },
              {
                $set: {
                  ...priceSnapshot(row.buy, order.feeBps),
                  paymentAttempt: randomUUID(),
                  updatedAt: new Date(),
                  nextCheckAt: new Date(),
                  demoPriceRepair: {
                    previousAmount: order.amount,
                    at: new Date(),
                  },
                },
                $unset: { paymentIntentId: "", paymentStartedAt: "" },
              },
              { session },
            );
            if (updated.matchedCount !== 1)
              throw Error("Concurrent order change");
          }
        });
      } finally {
        await session.endSession();
      }
      console.log(
        "Corrected:",
        row.title,
        row.buy / 100,
        "RON simulated; no card charged",
      );
    };
    if (apply)
      await locks.run("product-order:" + row.id, () =>
        initialOrder
          ? locks.run("order:" + initialOrder._id, repair)
          : repair(),
      );
    else await repair();
  }
}
main()
  .catch((error) => {
    console.error(
      "Demo repair stopped:",
      error.code || error.type || error.name,
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
