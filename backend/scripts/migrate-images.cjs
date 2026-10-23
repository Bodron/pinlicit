// Preview by default. --apply migrates metadata; --delete-videos also deletes
// only the reviewed application's video objects, never images or whole listings.
require("dotenv").config({ path: process.env.ENV_FILE || ".env", quiet: true });
const mongoose = require("mongoose");
const {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const fs = require("node:fs");
const apply = process.argv.includes("--apply");
const deleteVideos = process.argv.includes("--delete-videos");
if (deleteVideos && !apply) throw new Error("--delete-videos requires --apply");
const image = (url) => {
  try {
    return (
      /^https?:$/.test(new URL(url).protocol) &&
      /\.(jpe?g|png|webp)$/i.test(new URL(url).pathname)
    );
  } catch {
    return false;
  }
};
async function main() {
  if (!process.env.MONGODB_URI || !process.env.AWS_S3_BUCKET)
    throw new Error("MissingConfig");
  await mongoose.connect(process.env.MONGODB_URI, {
    autoIndex: false,
    autoCreate: false,
    serverSelectionTimeoutMS: 15000,
  });
  const products = mongoose.connection.db.collection("products");
  const rows = await products
    .find(
      {
        $or: [
          { videoKey: { $exists: true } },
          { videoUrl: { $exists: true } },
          { thumbnailUrl: { $exists: true } },
        ],
      },
      { projection: { _id: 1, videoKey: 1, imageUrl: 1, thumbnailUrl: 1 } },
    )
    .toArray();
  const s3 = new S3Client({ region: process.env.AWS_REGION || "eu-central-1" });
  const candidates = new Map();
  let token;
  let storageAccess = "ok";
  try {
    do {
      const page = await s3.send(
        new ListObjectsV2Command({
          Bucket: process.env.AWS_S3_BUCKET,
          Prefix: "videos/",
          ContinuationToken: token,
        }),
      );
      for (const object of page.Contents || []) {
        if (object.Key && /\.(mp4|mov|webm|m4v|avi|mkv)$/i.test(object.Key))
          candidates.set(object.Key, {
            key: object.Key,
            size: object.Size,
            etag: object.ETag,
          });
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
  } catch (error) {
    storageAccess = error.name || "Error";
    if (storageAccess !== "AccessDenied") throw error;
  }
  const plan = {
    storageAccess,
    productCount: rows.length,
    photosPreserved: rows.filter(
      (row) => image(row.imageUrl) || image(row.thumbnailUrl),
    ).length,
    productsWithoutPhoto: rows.filter(
      (row) => !image(row.imageUrl) && !image(row.thumbnailUrl),
    ).length,
    videoObjectCount: storageAccess === "ok" ? candidates.size : null,
    videoBytes: [...candidates.values()].reduce(
      (sum, item) => sum + item.size,
      0,
    ),
  };
  if (process.env.MEDIA_PLAN_FILE) {
    fs.writeFileSync(
      process.env.MEDIA_PLAN_FILE,
      JSON.stringify(
        {
          ...plan,
          products: rows.map((row) => String(row._id)),
          objects: [...candidates.values()],
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "preview", ...plan }));
  if (!apply) return;
  // Delete objects before discarding their old database references so failures are recoverable.
  if (deleteVideos) {
    if (storageAccess !== "ok") throw new Error("S3AccessRequired");
    for (const object of candidates.values()) {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: object.key,
          IfMatch: object.etag,
        }),
      );
    }
    console.log("Removed current video objects: " + candidates.size);
  }
  for (const row of rows) {
    const photo = image(row.imageUrl)
      ? row.imageUrl
      : image(row.thumbnailUrl)
        ? row.thumbnailUrl
        : null;
    await products.updateOne(
      { _id: row._id },
      {
        $unset: { videoKey: "", videoUrl: "", thumbnailUrl: "" },
        ...(photo ? { $set: { imageUrl: photo } } : {}),
      },
    );
  }
  console.log("Migrated product media metadata: " + rows.length);
}
main()
  .catch((error) => {
    console.error(
      "Media migration failed: " +
        (error.codeName || error.name || "UnknownError"),
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
