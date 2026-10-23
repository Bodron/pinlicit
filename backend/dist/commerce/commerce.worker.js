"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommerceWorker = void 0;
const bid_deposits_service_1 = require("./bid-deposits.service");
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const crypto_1 = require("crypto");
const bid_schema_1 = require("../bids/schemas/bid.schema");
const product_schema_1 = require("../products/schemas/product.schema");
const commerce_schemas_1 = require("./commerce.schemas");
const commerce_accounts_service_1 = require("./commerce-accounts.service");
const commerce_orders_service_1 = require("./commerce-orders.service");
const stripe_client_service_1 = require("./stripe-client.service");
const commerce_lock_service_1 = require("./commerce-lock.service");
const commerce_policy_1 = require("./commerce.policy");
const supported = new Set([
    "identity.verification_session.processing",
    "identity.verification_session.verified",
    "identity.verification_session.requires_input",
    "identity.verification_session.canceled",
    "identity.verification_session.redacted",
    "account.updated",
    "payment_intent.succeeded",
    "payment_intent.processing",
    "payment_intent.payment_failed",
    "payment_intent.canceled",
    "charge.refunded",
    "charge.dispute.created",
    "charge.dispute.updated",
    "charge.dispute.closed",
    "transfer.created",
    "transfer.updated",
    "transfer.reversed",
]);
let CommerceWorker = class CommerceWorker {
    constructor(inbox, products, bids, orders, stripe, accounts, payments, locks, deposits) {
        this.inbox = inbox;
        this.products = products;
        this.bids = bids;
        this.orders = orders;
        this.stripe = stripe;
        this.accounts = accounts;
        this.payments = payments;
        this.locks = locks;
        this.deposits = deposits;
        this.running = false;
    }
    async onModuleInit() {
        if (!this.stripe.enabled)
            return;
        this.stripe.assertSecureAuth();
        this.stripe.sdk;
        this.stripe.setting("STRIPE_PLATFORM_FEE_BPS", 0, 5000);
        this.stripe.setting("STRIPE_PAYMENT_WINDOW_HOURS", 1, 168);
        this.stripe.setting("STRIPE_RELEASE_DELAY_HOURS", 1, 720);
        this.stripe.setting("STRIPE_MAX_FULFILLMENT_DAYS", 1, 60);
        for (const name of [
            "STRIPE_IDENTITY_RETURN_URL",
            "STRIPE_CONNECT_RETURN_URL",
            "STRIPE_CONNECT_REFRESH_URL",
        ])
            this.stripe.returnUrl(name);
        await Promise.all([
            this.inbox.init(),
            this.deposits.ready(),
            this.locks.ready(),
            this.accounts.ready(),
            this.payments.ready(),
        ]);
        this.timer = setInterval(() => {
            void this.tick();
        }, 15000);
        this.timer.unref();
    }
    onModuleDestroy() {
        if (this.timer)
            clearInterval(this.timer);
    }
    async enqueue(event) {
        if (!supported.has(event.type) || !("id" in event.data.object))
            return { received: true };
        try {
            await this.inbox.updateOne({ eventId: event.id }, {
                $setOnInsert: {
                    eventId: event.id,
                    type: event.type,
                    objectId: event.data.object.id,
                    status: "pending",
                    attempts: 0,
                    nextAttemptAt: new Date(),
                },
            }, { upsert: true });
        }
        catch (error) {
            if (error.code !== 11000)
                throw error;
        }
        return { received: true };
    }
    async tick() {
        if (this.running)
            return;
        this.running = true;
        try {
            await this.processInbox();
            await this.finalizeAuctions();
            await this.payments.maintain();
            await this.deposits.maintain();
        }
        catch {
        }
        finally {
            this.running = false;
        }
    }
    async processInbox() {
        const jobs = await this.inbox
            .find({ status: "pending", nextAttemptAt: { $lte: new Date() } })
            .sort({ nextAttemptAt: 1 })
            .limit(30);
        for (const job of jobs) {
            try {
                await this.locks.run(`stripe-event:${job.eventId}`, async () => {
                    const fresh = await this.inbox.findOne({
                        eventId: job.eventId,
                        status: "pending",
                    });
                    if (!fresh)
                        return;
                    if (job.type.startsWith("identity."))
                        await this.accounts.refreshIdentity(job.objectId);
                    else if (job.type === "account.updated")
                        await this.accounts.refreshConnect(job.objectId);
                    else if (job.type.startsWith("payment_intent."))
                        await this.payments.refreshPayment(job.objectId);
                    else if (job.type.startsWith("transfer."))
                        await this.payments.refreshTransfer(job.objectId);
                    else if (job.type.startsWith("charge.dispute.")) {
                        const dispute = await this.stripe.sdk.disputes.retrieve(job.objectId);
                        const chargeId = typeof dispute.charge === "string"
                            ? dispute.charge
                            : dispute.charge.id;
                        await this.payments.refreshCharge(chargeId);
                    }
                    else if (job.type === "charge.refunded")
                        await this.payments.refreshCharge(job.objectId);
                    await this.inbox.updateOne({ eventId: job.eventId }, { $set: { status: "done" } });
                });
            }
            catch {
                await this.inbox.updateOne({ eventId: job.eventId, status: "pending" }, {
                    $inc: { attempts: 1 },
                    $set: {
                        nextAttemptAt: new Date(Date.now() +
                            Math.min(3600000, 15000 * 2 ** Math.min(job.attempts, 8))),
                    },
                });
            }
        }
    }
    async finalizeAuctions() {
        const products = await this.products
            .find({
            commerceVersion: 1,
            status: product_schema_1.ProductStatus.Active,
            endsAt: { $lte: new Date() },
        })
            .sort({ endsAt: 1 })
            .limit(20);
        for (const candidate of products) {
            try {
                await this.products.db.transaction(async (session) => {
                    const product = await this.products
                        .findOne({
                        _id: candidate._id,
                        status: product_schema_1.ProductStatus.Active,
                        endsAt: { $lte: new Date() },
                    })
                        .session(session);
                    if (!product)
                        return;
                    const bid = product.highestBid
                        ? await this.bids
                            .findOne({ _id: product.highestBid, product: product._id })
                            .session(session)
                        : null;
                    const reserveMet = !product.reservePrice ||
                        product.currentPrice >= product.reservePrice;
                    if (!bid ||
                        !reserveMet ||
                        String(bid.bidder) === String(product.seller)) {
                        product.status = product_schema_1.ProductStatus.Expired;
                        await product.save({ session });
                        return;
                    }
                    try {
                        await this.deposits.require(String(product._id), String(bid.bidder), bid.maxAmount, session);
                    }
                    catch (error) {
                        if (error.status !== 403)
                            throw error;
                        product.status = product_schema_1.ProductStatus.Hidden;
                        await product.save({ session });
                        return;
                    }
                    const policy = (0, commerce_policy_1.priceSnapshot)(product.currentPrice, this.stripe.setting("STRIPE_PLATFORM_FEE_BPS", 0, 5000));
                    const hours = this.stripe.setting("STRIPE_PAYMENT_WINDOW_HOURS", 1, 168);
                    product.status = product_schema_1.ProductStatus.Reserved;
                    product.reservedBy = bid.bidder;
                    product.reservedAt = new Date();
                    await product.save({ session });
                    await this.orders.create([
                        {
                            product: product._id,
                            buyer: bid.bidder,
                            seller: product.seller,
                            title: product.title,
                            ...policy,
                            paymentAttempt: (0, crypto_1.randomUUID)(),
                            paymentDeadline: new Date(Date.now() + hours * 3600000),
                        },
                    ], { session });
                });
            }
            catch {
            }
        }
    }
};
exports.CommerceWorker = CommerceWorker;
exports.CommerceWorker = CommerceWorker = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(commerce_schemas_1.StripeInbox.name)),
    __param(1, (0, mongoose_1.InjectModel)(product_schema_1.Product.name)),
    __param(2, (0, mongoose_1.InjectModel)(bid_schema_1.Bid.name)),
    __param(3, (0, mongoose_1.InjectModel)(commerce_schemas_1.CommerceOrder.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        stripe_client_service_1.StripeClientService,
        commerce_accounts_service_1.CommerceAccountsService,
        commerce_orders_service_1.CommerceOrdersService,
        commerce_lock_service_1.CommerceLockService,
        bid_deposits_service_1.BidDepositsService])
], CommerceWorker);
//# sourceMappingURL=commerce.worker.js.map