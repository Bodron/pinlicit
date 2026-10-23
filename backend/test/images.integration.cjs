/* Local replica-set only; ignores .env and uses an in-memory S3 transport. */
require("reflect-metadata");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { Test } = require("@nestjs/testing");
const { ConfigModule } = require("@nestjs/config");
const {
  MongooseModule,
  getModelToken,
  getConnectionToken,
} = require("@nestjs/mongoose");
const { JwtService } = require("@nestjs/jwt");
const { ValidationPipe } = require("@nestjs/common");
const request = require("supertest");
const sharp = require("sharp");
const { AuthModule } = require("../dist/auth/auth.module");
const { ProductsModule } = require("../dist/products/products.module");
const { UploadsService } = require("../dist/uploads/uploads.service");
const uri =
  process.env.COMMERCE_TEST_MONGO_URI ||
  "mongodb://127.0.0.1:27119/?directConnection=true&replicaSet=commerce-test";
const parsed = new URL(uri);
if (
  parsed.protocol !== "mongodb:" ||
  !["127.0.0.1", "localhost"].includes(parsed.hostname)
)
  throw new Error("Local MongoDB required");
async function main() {
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        ignoreEnvVars: true,
        load: [
          () => ({
            JWT_SECRET: randomUUID(),
            STRIPE_ENABLED: "false",
            AWS_REGION: "eu-north-1",
            AWS_S3_BUCKET: "fixture-bucket",
          }),
        ],
      }),
      MongooseModule.forRoot(uri, {
        dbName: "pinbind_images_test_" + randomUUID().replaceAll("-", ""),
      }),
      AuthModule,
      ProductsModule,
    ],
  }).compile();
  const app = module.createNestApplication();
  app.useLogger(false);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const db = module.get(getConnectionToken());
  try {
    await app.init();
    const users = module.get(getModelToken("User"));
    const seller = await users.create({
      name: "Seller",
      email: "seller@local.invalid",
      passwordHash: "unused",
      role: "seller",
    });
    const buyer = await users.create({
      name: "Buyer",
      email: "buyer@local.invalid",
      passwordHash: "unused",
      role: "user",
    });
    const seller2 = await users.create({
      name: "Other seller",
      email: "other@local.invalid",
      passwordHash: "unused",
      role: "seller",
    });
    const jwt = module.get(JwtService);
    const token = (user) =>
      jwt.sign({ sub: String(user._id), role: user.role });
    const api = request(app.getHttpServer());
    const image = await sharp({
      create: { width: 1600, height: 1000, channels: 3, background: "#6c7545" },
    })
      .png()
      .toBuffer();
    const objects = new Map();
    let writes = 0;
    module.get(UploadsService).s3.send = async (command) => {
      assert.equal(command.input.ContentType, "image/webp");
      assert.equal(
        command.input.CacheControl,
        "public, max-age=31536000, immutable",
      );
      objects.set(command.input.Key, command.input.Body);
      writes++;
      return {};
    };
    const upload = (user) =>
      api
        .post("/uploads/images")
        .set("Authorization", "Bearer " + token(user))
        .attach("image", image, {
          filename: "product.png",
          contentType: "image/png",
        });
    await api
      .post("/uploads/images")
      .attach("image", image, "product.png")
      .expect(401);
    await upload(buyer).expect(403);
    const uploaded = await upload(seller);
    assert.equal(uploaded.status, 201, JSON.stringify(uploaded.body));
    assert(uploaded.body.variants.length >= 2);
    assert.equal(objects.size, uploaded.body.variants.length);
    assert.equal(uploaded.body.sourceBytes, image.length);
    for (const value of objects.values())
      assert.equal((await sharp(value).metadata()).format, "webp");
    const before = writes;
    const repeated = await upload(seller).expect(201);
    assert.equal(repeated.body.imageKey, uploaded.body.imageKey);
    assert.equal(writes, before);
    await api
      .post("/uploads/images")
      .set("Authorization", "Bearer " + token(seller))
      .attach("image", Buffer.from("fake"), {
        filename: "fake.jpg",
        contentType: "image/jpeg",
      })
      .expect(400);
    await api
      .post("/uploads/images")
      .set("Authorization", "Bearer " + token(seller))
      .attach("image", Buffer.from("clip"), {
        filename: "clip.mp4",
        contentType: "video/mp4",
      })
      .expect(400);
    await api
      .post("/uploads/images")
      .set("Authorization", "Bearer " + token(seller))
      .attach("image", Buffer.alloc(10 * 1024 * 1024 + 1), {
        filename: "too-large.jpg",
        contentType: "image/jpeg",
      })
      .expect(413);
    const fresh = await sharp({
      create: { width: 180, height: 120, channels: 3, background: "#a77435" },
    })
      .png()
      .toBuffer();
    const duplicates = await Promise.all(
      [1, 2].map(() =>
        api
          .post("/uploads/images")
          .set("Authorization", "Bearer " + token(seller))
          .attach("image", fresh, {
            filename: "same.png",
            contentType: "image/png",
          }),
      ),
    );
    assert(duplicates.some((result) => result.status === 201));
    assert(duplicates.every((result) => [201, 409].includes(result.status)));
    const category = await module
      .get(getModelToken("Category"))
      .create({ name: "Test", slug: "test" });
    const dto = {
      title: "Test image listing",
      description: "A valid listing using optimized media.",
      categoryId: String(category._id),
      imageKey: uploaded.body.imageKey,
      imageUrl: "https://example.com/forged.webp",
      startingPrice: 1000,
      minBidIncrement: 100,
      buyNowPrice: 3000,
      startsAt: new Date(Date.now() - 1000).toISOString(),
      endsAt: new Date(Date.now() + 86400000).toISOString(),
    };
    const product = await api
      .post("/products")
      .set("Authorization", "Bearer " + token(seller))
      .send(dto)
      .expect(201);
    assert.equal(product.body.imageUrl, uploaded.body.imageUrl);
    assert.equal(
      product.body.imageVariants.length,
      uploaded.body.variants.length,
    );
    await api
      .post("/products")
      .set("Authorization", "Bearer " + token(seller2))
      .send(dto)
      .expect(403);
    await api
      .post("/uploads/image-url")
      .set("Authorization", "Bearer " + token(seller))
      .send({})
      .expect(404);
    console.log(
      "PASS optimized image integration: multipart auth, real encoding, immutable S3 variants, deduplication, invalid bytes, ownership and canonical publication",
    );
  } finally {
    await db.dropDatabase();
    await app.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
