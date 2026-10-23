// Additive preparation only: no seed, document migration, deletion or syncIndexes.
require("reflect-metadata");
require("dotenv").config({ path: process.env.ENV_FILE || ".env", quiet: true });
const mongoose = require("mongoose");
const schemas = require("../dist/commerce/commerce.schemas");
async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    autoIndex: false,
    autoCreate: false,
  });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== "isdbgrid")
    throw new Error(
      "MongoDB must support transactions (replica set or sharded cluster)",
    );
  for (const name of [
    "BidDeposit",
    "CommerceAccount",
    "CommerceOrder",
    "StripeInbox",
    "CommerceLock",
  ]) {
    const model = mongoose.model(name, schemas[name + "Schema"]);
    await model.createCollection();
    await model.createIndexes();
    console.log("Ready: " + model.collection.name);
  }
  console.log(
    "Commerce collections/indexes ready; existing listings and users unchanged.",
  );
}
main()
  .catch((error) => {
    // Connection errors may include hosts/credentials: report only a safe category.
    console.error(
      "Commerce preparation failed (" +
        (error.code || error.name) +
        "). Check DB access, transaction support and existing unique-index conflicts.",
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
