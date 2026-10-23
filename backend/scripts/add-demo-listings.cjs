/* Additive, sandbox-only display fixtures. Never resets an existing listing,
 * creates financial records, or bypasses Stripe seller verification. */
require("reflect-metadata");
const fs = require("node:fs");
const { createHash } = require("node:crypto");
const mongoose = require("mongoose");
const values = require("dotenv").parse(
  fs.readFileSync(process.env.ENV_FILE || ".env"),
);
const { ProductSchema } = require("../dist/products/schemas/product.schema");
const apply = process.argv.includes("--apply");
const enableStripe = process.argv.includes("--enable-stripe");
const batch = "pinbind-display-demo-2026-10-v1";
const rows = [
  {
    source: "6a3cc75db3b75c8e86525c75",
    title: "BMW — DEMO",
    category: "auto",
    price: 50,
    buy: 100,
  },
  {
    source: "6a3d4f2fd66bdd2ade3d8a25",
    title: "Audi A4 — DEMO",
    category: "auto",
    price: 60,
    buy: 120,
  },
  {
    source: "6a3a3eac3fd2d32e2247b5ed",
    title: "Poster Bichon — DEMO",
    category: "casa",
    price: 30,
    buy: 60,
  },
];
async function main() {
  if (!values.STRIPE_SECRET_KEY?.startsWith("sk_test_"))
    throw Error("Sandbox required");
  await mongoose.connect(values.MONGODB_URI, {
    autoIndex: false,
    autoCreate: false,
    serverSelectionTimeoutMS: 15000,
  });
  const db = mongoose.connection.db;
  const Product = mongoose.model("Product", ProductSchema);
  const prepared = [];
  for (const row of rows) {
    const id = new mongoose.Types.ObjectId(
      createHash("sha256")
        .update(batch + row.source)
        .digest("hex")
        .slice(0, 24),
    );
    const existing = await db.collection("products").findOne({ _id: id });
    if (existing) {
      if (existing.demoFixture?.batch !== batch)
        throw Error("Fixture ID collision");
      console.log("Already present, unchanged:", existing.title);
      continue;
    }
    const source = await db
      .collection("products")
      .findOne({ _id: new mongoose.Types.ObjectId(row.source) });
    if (
      !source?.demoImage?.illustrative ||
      !source.imageUrl ||
      !source.imageVariants?.length
    )
      throw Error("Illustrative media missing");
    const seller = await db
      .collection("users")
      .findOne({ _id: source.seller, role: "seller", blocked: { $ne: true } });
    const category = await db
      .collection("categories")
      .findOne({ slug: row.category });
    if (!seller || !category) throw Error("Seller or category missing");
    for (const url of new Set([
      source.imageUrl,
      ...source.imageVariants.map((x) => x.url),
    ])) {
      if (new URL(url).protocol !== "https:")
        throw Error("HTTPS image required");
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      const valid =
        response.ok &&
        response.headers.get("content-type")?.startsWith("image/");
      if (response.body) await response.body.cancel();
      if (!valid) throw Error("Image unavailable");
    }
    const now = new Date();
    const document = new Product({
      _id: id,
      seller: seller._id,
      category: category._id,
      title: row.title,
      description:
        "Anunț demonstrativ pentru verificarea imaginilor și a interfeței. Imagine ilustrativă; nu reprezintă un produs oferit efectiv spre vânzare. Prețurile sunt de test. Plata și licitarea prin Stripe necesită activarea explicită de către vânzător după configurarea încasărilor.",
      imageKey: source.imageKey,
      imageUrl: source.imageUrl,
      imageVariants: source.imageVariants,
      status: "active",
      startingPrice: row.price,
      currentPrice: row.price,
      minBidIncrement: 5,
      buyNowPrice: row.buy,
      favoriteCount: 0,
      startsAt: new Date(now.getTime() - 60000),
      endsAt: new Date(now.getTime() + 14 * 86400000),
      createdAt: now,
      updatedAt: now,
    });
    await document.validate();
    const raw = document.toObject();
    raw.demoImage = source.demoImage;
    raw.demoFixture = {
      batch,
      source: source._id,
      purpose: "display-only-until-seller-enrollment",
    };
    // No commerceVersion: normal API guards reject paid bidding/checkout until
    // the seller explicitly enrolls this listing after Identity + Connect.
    prepared.push(raw);
    console.log(apply ? "Prepared:" : "Dry run:", row.title, String(id));
  }
  if (apply && prepared.length) {
    await db.collection("products").bulkWrite(
      prepared.map((p) => ({
        updateOne: {
          filter: { _id: p._id, "demoFixture.batch": batch },
          update: { $setOnInsert: p },
          upsert: true,
        },
      })),
      { ordered: true },
    );
    console.log("Added display fixtures:", prepared.length);
  }
  if (enableStripe) {
    const {
      StripeClientService,
    } = require("../dist/commerce/stripe-client.service");
    const config = new StripeClientService({
      get: (key) => values[key],
    }).mobileConfig();
    if (!config.ready || config.deferredSellerOnboarding !== true)
      throw Error("Build the backend with deferred onboarding first");
    // Only this batch of explicit demo fixtures, with no prior commitments.
    for (const row of rows) {
      const id = new mongoose.Types.ObjectId(
        createHash("sha256")
          .update(batch + row.source)
          .digest("hex")
          .slice(0, 24),
      );
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const product = await db
            .collection("products")
            .findOne({ _id: id, "demoFixture.batch": batch }, { session });
          if (!product || product.commerceVersion === 1) return;
          if (
            product.status !== "active" ||
            product.endsAt <= new Date() ||
            product.highestBid ||
            product.reservedBy ||
            (await db
              .collection("bids")
              .countDocuments({ product: id }, { session })) ||
            (await db
              .collection("commerceorders")
              .countDocuments({ product: id }, { session })) ||
            (await db
              .collection("biddeposits")
              .countDocuments({ product: id }, { session }))
          ) {
            console.log("Skipped existing commitments:", row.title);
            return;
          }
          const seller = await db
            .collection("users")
            .findOne(
              { _id: product.seller, role: "seller", blocked: { $ne: true } },
              { session },
            );
          if (!seller) throw Error("Seller is not eligible");
          if (apply)
            await db.collection("products").updateOne(
              { _id: id, status: "active", "demoFixture.batch": batch },
              {
                $set: {
                  commerceVersion: 1,
                  updatedAt: new Date(),
                  description: product.description.replace(
                    "Plata și licitarea prin Stripe necesită activarea explicită de către vânzător după configurarea încasărilor.",
                    "Plata și garanția de licitare sunt simulate în sandboxul Stripe; nu folosi un card real.",
                  ),
                },
              },
              { session },
            );
          console.log(
            apply ? "Enabled sandbox checkout:" : "Ready for sandbox checkout:",
            row.title,
          );
        });
      } finally {
        await session.endSession();
      }
    }
  }
}
main()
  .catch((error) => {
    console.error("Demo listing operation failed:", error.code || error.name);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
