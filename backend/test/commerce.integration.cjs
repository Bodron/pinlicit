/* Local replica-set integration tests. No .env, cloud database or real Stripe calls. */
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
require("reflect-metadata");
const { Test } = require("@nestjs/testing");
const { ConfigModule, ConfigService } = require("@nestjs/config");
const {
  MongooseModule,
  getModelToken,
  getConnectionToken,
} = require("@nestjs/mongoose");
const { JwtService } = require("@nestjs/jwt");
const { ValidationPipe } = require("@nestjs/common");
const request = require("supertest");
const Stripe = require("stripe");
const { CommerceModule } = require("../dist/commerce/commerce.module");
const {
  CommerceAccountsService,
} = require("../dist/commerce/commerce-accounts.service");
const {
  CommerceOrdersService,
} = require("../dist/commerce/commerce-orders.service");
const { CommerceWorker } = require("../dist/commerce/commerce.worker");
const {
  StripeClientService,
} = require("../dist/commerce/stripe-client.service");
const { ProductsModule } = require("../dist/products/products.module");
const { AuthModule } = require("../dist/auth/auth.module");

const values = {
  STRIPE_ENABLED: "true",
  STRIPE_SECRET_KEY: "sk_test_local_fixture",
  STRIPE_WEBHOOK_SECRET: "whsec_local_fixture",
  STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_local_connected_fixture",
  STRIPE_IDENTITY_RETURN_URL: "http://localhost:3002/cont/verificare",
  STRIPE_CONNECT_RETURN_URL: "http://localhost:3002/cont/verificare",
  STRIPE_CONNECT_REFRESH_URL: "http://localhost:3002/cont/verificare",
  STRIPE_PLATFORM_FEE_BPS: "500",
  STRIPE_PAYMENT_WINDOW_HOURS: "48",
  STRIPE_RELEASE_DELAY_HOURS: "48",
  STRIPE_MAX_FULFILLMENT_DAYS: "30",
  STRIPE_AUTOMATIC_TRANSFERS_ENABLED: "true",
  JWT_SECRET: randomUUID(),
};
function fakeStripe() {
  const official = new Stripe("sk_test_local_fixture");
  const sessions = new Map(),
    accounts = new Map(),
    intents = new Map(),
    charges = new Map(),
    transfers = new Map(),
    keys = new Map();
  const lostResponses = new Set();
  const calls = { identity: 0, account: 0, payment: 0, transfer: 0, refund: 0 };
  const clone = (value) => structuredClone(value);
  function create(kind, key, factory) {
    if (keys.has(key)) return clone(keys.get(key));
    calls[kind]++;
    const result = factory(calls[kind]);
    keys.set(key, result);
    if (lostResponses.delete(kind))
      throw new Stripe.errors.StripeConnectionError({
        message: "simulated lost response",
      });
    return clone(result);
  }
  const sdk = {
    webhooks: official.webhooks,
    identity: {
      verificationSessions: {
        create: async (params, options) =>
          create("identity", options.idempotencyKey, (n) => {
            const item = {
              id: `vs_${n}`,
              status: "requires_input",
              livemode: false,
              options: params.options,
              metadata: params.metadata,
              url: "https://verify.stripe.com/secret-url",
            };
            sessions.set(item.id, item);
            return item;
          }),
        retrieve: async (id) => clone(sessions.get(id)),
      },
    },
    accounts: {
      create: async (params, options) =>
        create("account", options.idempotencyKey, (n) => {
          const item = {
            id: `acct_${n}`,
            metadata: params.metadata,
            capabilities: { transfers: "active" },
            payouts_enabled: true,
            details_submitted: true,
          };
          accounts.set(item.id, item);
          return item;
        }),
      retrieve: async (id) => clone(accounts.get(id)),
    },
    accountLinks: {
      create: async () => ({
        url: "https://connect.stripe.com/private-onboarding-url",
        expires_at: 2000000000,
      }),
    },
    paymentIntents: {
      create: async (params, options) =>
        create("payment", options.idempotencyKey, (n) => {
          assert.deepEqual(params.allowed_payment_method_types, ["card"]);
          assert.equal(params.capture_method, "automatic");
          assert.equal(params.transfer_data, undefined);
          const item = {
            ...params,
            id: `pi_${n}`,
            livemode: false,
            client_secret: `pi_${n}_private_secret`,
            status: "requires_payment_method",
            latest_charge: null,
          };
          intents.set(item.id, item);
          return item;
        }),
      retrieve: async (id) => clone(intents.get(id)),
      cancel: async (id) => {
        const item = intents.get(id);
        if (item.status === "succeeded") throw new Error("already paid");
        item.status = "canceled";
        return clone(item);
      },
    },
    charges: { retrieve: async (id) => clone(charges.get(id)) },
    transfers: {
      create: async (params, options) =>
        create("transfer", options.idempotencyKey, (n) => {
          const item = {
            ...params,
            id: `tr_${n}`,
            livemode: false,
            reversed: false,
          };
          transfers.set(item.id, item);
          return item;
        }),
      retrieve: async (id) => clone(transfers.get(id)),
    },
    refunds: {
      create: async (params, options) =>
        create("refund", options.idempotencyKey, (n) => {
          const intent = intents.get(params.payment_intent),
            charge = charges.get(intent.latest_charge);
          charge.amount_refunded = charge.amount;
          charge.refunded = true;
          return { id: `re_${n}`, status: "succeeded" };
        }),
    },
  };
  function paid(id) {
    const item = intents.get(id);
    item.status = "succeeded";
    item.latest_charge = `ch_${id}`;
    charges.set(item.latest_charge, {
      id: item.latest_charge,
      amount: item.amount,
      currency: item.currency,
      livemode: false,
      payment_intent: id,
      disputed: false,
      amount_refunded: 0,
    });
  }
  return {
    sdk,
    sessions,
    intents,
    charges,
    transfers,
    calls,
    paid,
    loseResponse: (kind) => lostResponses.add(kind),
  };
}
async function main() {
  const uri =
    process.env.COMMERCE_TEST_MONGO_URI ||
    "mongodb://127.0.0.1:27119/?directConnection=true&replicaSet=commerce-test";
  const url = new URL(uri);
  assert(
    ["127.0.0.1", "localhost"].includes(url.hostname),
    "Only local MongoDB is allowed",
  );
  const dbName = `pinbind_commerce_test_${randomUUID().replaceAll("-", "")}`;
  const fake = fakeStripe();
  const driver = new StripeClientService({ get: (name) => values[name] });
  // SDK calls are simulated; the real SDK still verifies webhook signatures.
  Object.defineProperty(driver, "sdk", { get: () => fake.sdk });
  Object.defineProperty(driver, "enabled", { get: () => false }); // no background timer
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [() => values],
      }),
      MongooseModule.forRoot(uri, { dbName, serverSelectionTimeoutMS: 10000 }),
      AuthModule,
      CommerceModule,
      ProductsModule,
    ],
  })
    .overrideProvider(StripeClientService)
    .useValue(driver)
    .compile();
  const app = module.createNestApplication({ rawBody: true });
  app.useLogger(false);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  const connection = module.get(getConnectionToken());
  try {
    const model = (name) => module.get(getModelToken(name));
    for (const name of [
      "User",
      "Product",
      "Bid",
      "CommerceAccount",
      "CommerceOrder",
      "CommerceLock",
      "StripeInbox",
    ])
      await model(name).init();
    const jwt = module.get(JwtService),
      api = request(app.getHttpServer());
    const seller = await model("User").create({
      name: "Seller",
      email: "seller@example.invalid",
      passwordHash: "unused",
      role: "seller",
    });
    const buyer = await model("User").create({
      name: "Buyer",
      email: "buyer@example.invalid",
      passwordHash: "unused",
      role: "user",
    });
    const buyer2 = await model("User").create({
      name: "Buyer 2",
      email: "buyer2@example.invalid",
      passwordHash: "unused",
      role: "user",
    });
    const admin = await model("User").create({
      name: "Admin",
      email: "admin@example.invalid",
      passwordHash: "unused",
      role: "admin",
    });
    const auth = (user) => ({
      Authorization: `Bearer ${jwt.sign({ sub: String(user._id) })}`,
    });
    const orders = model("CommerceOrder"),
      profiles = model("CommerceAccount");
    const worker = module.get(CommerceWorker),
      paymentService = module.get(CommerceOrdersService);
    const post = (path, user, body = {}) =>
      api.post(`/commerce/${path}`).set(auth(user)).send(body);
    let eventNumber = 0;
    async function webhook(type, id, eventId) {
      const payload = JSON.stringify({
        id: eventId || `evt_${++eventNumber}`,
        type,
        livemode: false,
        data: { object: { id, private_identity_data: "must-not-be-stored" } },
      });
      const signature = fake.sdk.webhooks.generateTestHeaderString({
        payload,
        secret: values.STRIPE_WEBHOOK_SECRET,
      });
      await api
        .post("/commerce/webhooks/stripe")
        .set("Content-Type", "application/json")
        .set("stripe-signature", signature)
        .send(payload)
        .expect(200);
      await worker.processInbox();
    }
    await api.get("/commerce/me").expect(401);
    await api.post("/commerce/webhooks/stripe").send({}).expect(400);
    const first = await post("identity/session", buyer).expect(201);
    assert.equal(first.body.status, "requires_input");
    assert(first.headers["cache-control"].includes("no-store"));
    await post("identity/session", buyer).expect(201);
    assert.equal(fake.calls.identity, 1);
    for (const user of [seller, buyer, buyer2]) {
      await post("identity/session", user).expect(201);
      const profile = await profiles.findOne({ user: user._id });
      assert(
        profile,
        JSON.stringify({
          expectedUser: String(user._id),
          profiles: (await profiles.find().lean()).map((p) => ({
            user: p.user,
            type: p.user?.constructor.name,
            status: p.identityStatus,
            schema: profiles.schema.path("user").instance,
          })),
        }),
      );
      fake.sessions.get(profile.verificationSessionId).status = "verified";
      await webhook(
        "identity.verification_session.verified",
        profile.verificationSessionId,
      );
      assert.equal(
        (await profiles.findById(profile._id)).identityStatus,
        "verified",
      );
    }
    await post("seller/onboarding", buyer).expect(403);
    await post("seller/onboarding", seller).expect(201);
    await post("seller/onboarding", seller).expect(201);
    assert.equal(fake.calls.account, 1);
    const productBase = {
      seller: seller._id,
      category: new (require("mongoose").Types.ObjectId)(),
      title: "Test lot",
      description: "Local test lot only",
      imageUrl: "https://example.invalid/photo.jpg",
      imageKey: "images/test.jpg",
      startingPrice: 5000,
      currentPrice: 5000,
      minBidIncrement: 500,
      buyNowPrice: 20000,
      startsAt: new Date(Date.now() - 3600000),
      endsAt: new Date(Date.now() + 3600000),
      commerceVersion: 1,
    };
    async function reserve(user = buyer) {
      const product = await model("Product").create(productBase);
      await api
        .post(`/products/${product._id}/buy-now`)
        .set(auth(user))
        .expect(201);
      const updated = await model("Product").findById(product._id);
      assert.equal(updated.currentPrice, product.buyNowPrice);
      assert(updated.reservedAt);
      return await orders.findOne({ product: product._id });
    }
    let order = await reserve();
    assert.equal(order.amount, 20000);
    assert.equal(order.fee, 1000);
    assert.equal(order.sellerAmount, 19000);
    await post(`orders/${order._id}/payment`, buyer2).expect(403);
    const payment = await post(`orders/${order._id}/payment`, buyer, {
      amount: 1,
      sellerAmount: 1,
    }).expect(201);
    assert(payment.body.clientSecret);
    await post(`orders/${order._id}/payment`, buyer).expect(201);
    assert.equal(fake.calls.payment, 1);
    order = await orders.findById(order._id);
    fake.paid(order.paymentIntentId);
    await webhook(
      "payment_intent.succeeded",
      order.paymentIntentId,
      "evt_payment_duplicate",
    );
    await webhook(
      "payment_intent.succeeded",
      order.paymentIntentId,
      "evt_payment_duplicate",
    );
    await webhook("payment_intent.payment_failed", order.paymentIntentId); // canonical state stays paid
    assert.equal((await orders.findById(order._id)).status, "paid");
    assert.equal(
      await model("StripeInbox").countDocuments({
        eventId: "evt_payment_duplicate",
      }),
      1,
    );
    const inboxJson = JSON.stringify(await model("StripeInbox").find().lean());
    assert(!inboxJson.includes("must-not-be-stored"));
    assert(!inboxJson.includes("private_secret"));
    const publicRows = (
      await api.get("/commerce/orders").set(auth(buyer)).expect(200)
    ).body;
    assert(!JSON.stringify(publicRows).includes("private_secret"));
    assert(!JSON.stringify(publicRows).includes("paymentIntentId"));
    await post(`orders/${order._id}/shipment`, buyer, {
      carrier: "Courier",
      trackingCode: "TRACK-TEST",
    }).expect(403);
    await post(`orders/${order._id}/shipment`, seller, {
      carrier: "Courier",
      trackingCode: "TRACK-TEST",
    }).expect(201);
    await post(`orders/${order._id}/receipt`, seller).expect(403);
    await post(`orders/${order._id}/receipt`, buyer).expect(201);
    await post(`orders/${order._id}/issues`, buyer, { code: "damaged" }).expect(
      201,
    );
    await orders.updateOne(
      { _id: order._id },
      { $set: { releaseAfter: new Date(0), nextCheckAt: new Date(0) } },
    );
    await paymentService.maintain();
    assert.equal(fake.calls.transfer, 0);
    await post(`orders/${order._id}/refund`, seller, {
      reason: "not allowed",
    }).expect(403);
    await post(`orders/${order._id}/refund`, admin, {
      reason: "Buyer reported damage",
    }).expect(201);
    order = await orders.findById(order._id);
    await webhook(
      "charge.refunded",
      fake.intents.get(order.paymentIntentId).latest_charge,
    );
    assert.equal((await orders.findById(order._id)).status, "refunded");
    assert.equal(fake.calls.transfer, 0);
    // Happy path: only the buyer confirms receipt, then the delay expires.
    let completed = await reserve();
    await post(`orders/${completed._id}/payment`, buyer).expect(201);
    completed = await orders.findById(completed._id);
    fake.paid(completed.paymentIntentId);
    await webhook("payment_intent.succeeded", completed.paymentIntentId);
    await post(`orders/${completed._id}/receipt`, buyer).expect(201);
    await paymentService.maintain();
    assert.equal(fake.calls.transfer, 0);
    await orders.updateOne(
      { _id: completed._id },
      { $set: { releaseAfter: new Date(0), nextCheckAt: new Date(0) } },
    );
    await paymentService.maintain();
    await paymentService.maintain();
    assert.equal(fake.calls.transfer, 1);
    completed = await orders.findById(completed._id);
    assert.equal(completed.status, "completed");
    await webhook("transfer.created", completed.transferId);
    assert.equal(fake.calls.transfer, 1);
    // A dispute after transfer is a support case, never a false successful state.
    const charge = fake.charges.get(
      fake.intents.get(completed.paymentIntentId).latest_charge,
    );
    charge.disputed = true;
    await paymentService.refreshCharge(charge.id);
    await webhook("transfer.created", completed.transferId);
    assert.equal(
      (await orders.findById(completed._id)).status,
      "review_required",
    );
    await api.get("/commerce/review-queue").set(auth(buyer)).expect(403);
    assert(
      (await api.get("/commerce/review-queue").set(auth(admin)).expect(200))
        .body.length >= 1,
    );
    // A card which never pays is canceled before expiring the order.
    let expired = await reserve();
    await post(`orders/${expired._id}/payment`, buyer).expect(201);
    expired = await orders.findById(expired._id);
    await orders.updateOne(
      { _id: expired._id },
      { $set: { paymentDeadline: new Date(0), nextCheckAt: new Date(0) } },
    );
    await paymentService.maintain();
    assert.equal(
      (await orders.findById(expired._id)).status,
      "payment_expired",
    );
    assert.equal(fake.intents.get(expired.paymentIntentId).status, "canceled");
    // A paid order with no delivery confirmation escalates; no indefinite silent release.
    let overdue = await reserve();
    await post(`orders/${overdue._id}/payment`, buyer).expect(201);
    overdue = await orders.findById(overdue._id);
    fake.paid(overdue.paymentIntentId);
    await webhook("payment_intent.succeeded", overdue.paymentIntentId);
    await orders.updateOne(
      { _id: overdue._id },
      { $set: { fundsReviewAt: new Date(0), nextCheckAt: new Date(0) } },
    );
    await paymentService.maintain();
    assert.equal(
      (await orders.findById(overdue._id)).status,
      "review_required",
    );
    // Stripe created the payment but its response was lost: retry uses the same key.
    let lostPayment = await reserve();
    const paymentsBefore = fake.calls.payment;
    fake.loseResponse("payment");
    await post(`orders/${lostPayment._id}/payment`, buyer).expect(503);
    assert.equal(fake.calls.payment, paymentsBefore + 1);
    await post(`orders/${lostPayment._id}/payment`, buyer).expect(201);
    assert.equal(fake.calls.payment, paymentsBefore + 1);
    lostPayment = await orders.findById(lostPayment._id);
    fake.paid(lostPayment.paymentIntentId);
    await webhook("payment_intent.succeeded", lostPayment.paymentIntentId);
    await post(`orders/${lostPayment._id}/receipt`, buyer).expect(201);
    await orders.updateOne(
      { _id: lostPayment._id },
      { $set: { releaseAfter: new Date(0), nextCheckAt: new Date(0) } },
    );
    const transfersBefore = fake.calls.transfer;
    fake.loseResponse("transfer");
    await paymentService.maintain();
    assert.equal(
      (await orders.findById(lostPayment._id)).status,
      "transfer_pending",
    );
    assert.equal(fake.calls.transfer, transfersBefore + 1);
    await orders.updateOne(
      { _id: lostPayment._id },
      { $set: { nextCheckAt: new Date(0) } },
    );
    await paymentService.maintain();
    assert.equal((await orders.findById(lostPayment._id)).status, "completed");
    assert.equal(fake.calls.transfer, transfersBefore + 1);
    lostPayment = await orders.findById(lostPayment._id);
    fake.transfers.get(lostPayment.transferId).amount_reversed = 100;
    await webhook("transfer.updated", lostPayment.transferId);
    assert.equal(
      (await orders.findById(lostPayment._id)).status,
      "review_required",
    );
    // After the idempotency retention safety window, an uncertain create is reviewed, never duplicated.
    const uncertain = await reserve();
    await orders.updateOne(
      { _id: uncertain._id },
      { $set: { paymentStartedAt: new Date(Date.now() - 21 * 3600000) } },
    );
    const beforeUncertain = fake.calls.payment;
    await post(`orders/${uncertain._id}/payment`, buyer).expect(409);
    assert.equal(fake.calls.payment, beforeUncertain);
    assert.equal(
      (await orders.findById(uncertain._id)).status,
      "review_required",
    );
    // Concurrent proxy bids commit without orphan bids or a wrong winner.
    const auction = await model("Product").create({
      ...productBase,
      reservePrice: 6000,
    });
    const results = await Promise.all([
      api
        .post(`/products/${auction._id}/bids`)
        .set(auth(buyer))
        .send({ amount: 10000 }),
      api
        .post(`/products/${auction._id}/bids`)
        .set(auth(buyer2))
        .send({ amount: 12000 }),
    ]);
    assert(
      results.every((result) => result.status === 201),
      JSON.stringify(results.map((r) => [r.status, r.body])),
    );
    const accepted = await model("Bid").find({ product: auction._id });
    assert.equal(accepted.length, 2);
    await model("Product").updateOne(
      { _id: auction._id },
      { $set: { endsAt: new Date(0) } },
    );
    await worker.finalizeAuctions();
    await worker.finalizeAuctions();
    const winningOrder = await orders.findOne({ product: auction._id });
    assert.equal(String(winningOrder.buyer), String(buyer2._id));
    assert.equal(winningOrder.amount, 10500);
    assert.equal(await orders.countDocuments({ product: auction._id }), 1);
    const noBid = await model("Product").create({
      ...productBase,
      endsAt: new Date(0),
    });
    await worker.finalizeAuctions();
    assert.equal(
      (await model("Product").findById(noBid._id)).status,
      "expired",
    );
    // Existing listings are not silently enrolled into the financial system.
    const legacy = await model("Product").create({
      ...productBase,
      commerceVersion: undefined,
      endsAt: new Date(0),
    });
    await worker.finalizeAuctions();
    assert.equal(
      (await model("Product").findById(legacy._id)).status,
      "active",
    );
    console.log(
      "PASS: local commerce integration — auth, identity, Connect, payment idempotency, signed/deduplicated webhooks, delivery/issue/refund, delayed transfer, disputes, expiry, concurrent bids, settlement, legacy isolation",
    );
  } finally {
    assert(dbName.startsWith("pinbind_commerce_test_"));
    await connection.dropDatabase();
    await app.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
