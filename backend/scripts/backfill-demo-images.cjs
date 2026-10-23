/* Explicitly scoped media backfill for the three existing demo listings.
 * Dry run by default. Never changes prices, bids, reservations, status or dates.
 * Originals are public-domain/CC0 illustrations, not photos of the actual items. */
require("reflect-metadata");
const fs = require("node:fs");
const mongoose = require("mongoose");
const { ConfigService } = require("@nestjs/config");
const { UploadsService } = require("../dist/uploads/uploads.service");
const { ImageOptimizer } = require("../dist/uploads/image-optimizer.service");
const { ImageAssetSchema } = require("../dist/uploads/image-asset.schema");
const values = require("dotenv").parse(
  fs.readFileSync(process.env.ENV_FILE || ".env"),
);
const apply = process.argv.includes("--apply");
const path = require("node:path"),
  os = require("node:os");
const dir =
  process.env.DEMO_IMAGE_WORK_DIR ||
  (fs.existsSync("/private/tmp/pinbind-listing-illustrations")
    ? "/private/tmp/pinbind-listing-illustrations"
    : path.join(os.tmpdir(), "pinbind-listing-illustrations"));
fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
const allowed = new Map([
  ["6a3cc75db3b75c8e86525c75", "BMW"],
  ["6a3d4f2fd66bdd2ade3d8a25", "Audi A4"],
  ["6a3a3eac3fd2d32e2247b5ed", "Caine Bichon"],
]);
const marker =
  "Imagine ilustrativă pentru testare; nu reprezintă produsul real.";
async function main() {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, "demo-listing-images.json"), "utf8"),
  );
  if (
    manifest.length !== 3 ||
    manifest.some((row) => allowed.get(row.id) !== row.title)
  )
    throw new Error("Unexpected backfill scope");
  // AWS SDK gets credentials only in this server-side process, never in a client or log.
  for (const key of [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_REGION",
  ])
    if (values[key]) process.env[key] = values[key];
  await mongoose.connect(values.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    autoIndex: false,
    autoCreate: false,
  });
  const products = mongoose.connection.db.collection("products");
  const assets = mongoose.model("ImageAsset", ImageAssetSchema);
  const uploads = new UploadsService(
    new ConfigService(values),
    assets,
    new ImageOptimizer(),
  );
  const before = fs.existsSync(dir + "/product-media-backup.json")
      ? JSON.parse(fs.readFileSync(dir + "/product-media-backup.json", "utf8"))
      : [],
    results = [];
  for (const row of manifest) {
    const product = await products.findOne({
      _id: new mongoose.Types.ObjectId(row.id),
    });
    if (
      !product ||
      product.title !== row.title ||
      (product.imageUrl && !product.demoImage?.illustrative)
    )
      throw new Error("Listing changed or already has a real photo");
    const url = new URL(row.url);
    url.search = "";
    if (url.protocol !== "https:" || url.hostname !== "thumb.wikimedia.org")
      throw new Error("Unexpected image source");
    const variants = [];
    let input;
    for (const width of [330, 960, 1280]) {
      const variantUrl = url.href.replace("/1280px-", `/${width}px-`);
      const response = await fetch(variantUrl, {
        signal: AbortSignal.timeout(15000),
      });
      if (
        !response.ok ||
        !response.headers.get("content-type")?.startsWith("image/")
      )
        throw new Error("Public image unavailable");
      const data = Buffer.from(await response.arrayBuffer());
      if (width === 1280) input = data;
      const sharp = require("sharp");
      const metadata = await sharp(data).metadata();
      variants.push({
        url: variantUrl,
        width: metadata.width,
        height: metadata.height,
        bytes: data.length,
        contentType: "image/jpeg",
      });
    }
    if (!before.some((item) => item.id === row.id))
      before.push({
        id: row.id,
        title: row.title,
        media: {
          imageKey: product.imageKey,
          imageUrl: product.imageUrl,
          imageVariants: product.imageVariants,
          description: product.description,
          demoImage: product.demoImage,
        },
      });
    if (!apply) {
      console.log(
        "Ready:",
        row.title,
        "illustrative photo + optimized S3 upload",
      );
      continue;
    }
    fs.writeFileSync(
      dir + "/product-media-backup.json",
      JSON.stringify(before, null, 2),
      { mode: 0o600 },
    );
    const asset = await uploads.uploadImage(String(product.seller), input);
    const readable = await fetch(asset.imageUrl, {
      signal: AbortSignal.timeout(15000),
    });
    const useS3 = readable.ok;
    if (readable.body) await readable.body.cancel();
    const description = (product.description || "").includes(marker)
      ? product.description
      : marker + "\n\n" + (product.description || "");
    const update = {
      imageKey: asset.imageKey,
      imageUrl: useS3 ? asset.imageUrl : variants[variants.length - 1].url,
      imageVariants: useS3 ? asset.variants : variants,
      description,
      demoImage: {
        illustrative: true,
        sourcePage: row.sourcePage,
        author: row.author,
        license: row.license,
        optimizedImageUrl: asset.imageUrl,
        delivery: useS3 ? "s3" : "public_source_until_aws_read_enabled",
      },
    };
    const changed = await products.updateOne(
      {
        _id: product._id,
        description: product.description,
        imageUrl: product.imageUrl ?? { $exists: false },
      },
      { $set: update },
    );
    if (changed.matchedCount !== 1)
      throw new Error("Concurrent listing edit: stopped");
    results.push({
      title: row.title,
      id: row.id,
      delivery: update.demoImage.delivery,
      imageUrl: update.imageUrl,
      optimizedImageUrl: asset.imageUrl,
    });
    console.log("Updated:", row.title, "delivery:", update.demoImage.delivery);
  }
  if (apply)
    fs.writeFileSync(dir + "/results.json", JSON.stringify(results, null, 2));
}
main()
  .catch((error) => {
    console.error(
      "Backfill stopped (" +
        (error.code || error.name) +
        "). Existing auction commitments are unchanged.",
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
