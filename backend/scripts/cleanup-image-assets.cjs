// Preview by default. Retention cleanup uses Mongo receipts, never a broad S3 prefix deletion.
require("dotenv").config({ path: process.env.ENV_FILE || ".env", quiet: true });
const mongoose = require("mongoose");
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const apply = process.argv.includes("--apply");
async function main() {
  if (!process.env.MONGODB_URI || !process.env.AWS_S3_BUCKET)
    throw new Error("MissingConfig");
  await mongoose.connect(process.env.MONGODB_URI, {
    autoIndex: false,
    autoCreate: false,
    serverSelectionTimeoutMS: 15000,
  });
  const assets = mongoose.connection.db.collection("imageassets");
  const products = mongoose.connection.db.collection("products");
  const cutoff = new Date(Date.now() - 7 * 86400000);
  const rows = await assets
    .find({
      status: { $in: ["ready", "failed", "deleting"] },
      updatedAt: { $lt: cutoff },
    })
    .limit(100)
    .toArray();
  const s3 = new S3Client({ region: process.env.AWS_REGION || "eu-central-1" });
  let eligible = 0,
    deleted = 0,
    failed = 0;
  for (const row of rows) {
    const reference = row.imageKey
      ? await products.findOne(
          { imageKey: row.imageKey },
          { projection: { _id: 1 } },
        )
      : null;
    if (reference) continue;
    eligible++;
    if (!apply) continue;
    // requireImage refreshes updatedAt atomically, so concurrent publication wins this race safely.
    const claimed = await assets.findOneAndUpdate(
      { _id: row._id, status: row.status, updatedAt: row.updatedAt },
      { $set: { status: "deleting", updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!claimed) continue;
    if (
      row.imageKey &&
      (await products.findOne(
        { imageKey: row.imageKey },
        { projection: { _id: 1 } },
      ))
    ) {
      await assets.updateOne(
        { _id: row._id, status: "deleting" },
        { $set: { status: "ready", updatedAt: new Date() } },
      );
      continue;
    }
    try {
      if (!/^[a-f0-9]{64}$/.test(row._id)) throw new Error("InvalidAssetId");
      for (const key of new Set(
        (row.variants || []).map((variant) => variant.key),
      )) {
        if (
          !new RegExp("^images/v1/" + row._id + "/[0-9]+x[0-9]+[.]webp$").test(
            key,
          )
        )
          throw new Error("InvalidAssetKey");
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
          }),
          { abortSignal: AbortSignal.timeout(15000) },
        );
      }
      await assets.deleteOne({ _id: row._id, status: "deleting" });
      deleted++;
    } catch {
      await assets.updateOne(
        { _id: row._id, status: "deleting" },
        { $set: { status: "failed", updatedAt: new Date() } },
      );
      failed++;
    }
  }
  console.log(
    JSON.stringify({
      mode: apply ? "apply" : "preview",
      eligible,
      deleted,
      failed,
    }),
  );
  if (failed) process.exitCode = 1;
}
main()
  .catch((error) => {
    console.error("Image cleanup failed: " + error.name);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
