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
exports.BidDepositsService = void 0;
exports.requiredDeposit = requiredDeposit;
const bid_schema_1 = require("../bids/schemas/bid.schema");
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const crypto_1 = require("crypto");
const commerce_schemas_1 = require("./commerce.schemas");
const product_schema_1 = require("../products/schemas/product.schema");
const stripe_client_service_1 = require("./stripe-client.service");
const commerce_accounts_service_1 = require("./commerce-accounts.service");
const commerce_lock_service_1 = require("./commerce-lock.service");
function requiredDeposit(maximum) {
    if (!Number.isSafeInteger(maximum) || maximum < 3000 || maximum > 99999999)
        throw new common_1.BadRequestException("Maximum bid must be between 30 and 999999.99 RON.");
    return Math.ceil(maximum / 10);
}
let BidDepositsService = class BidDepositsService {
    constructor(deposits, orders, products, stripe, accounts, locks, bids) {
        this.deposits = deposits;
        this.orders = orders;
        this.products = products;
        this.stripe = stripe;
        this.accounts = accounts;
        this.locks = locks;
        this.bids = bids;
    }
    ready() {
        return this.deposits.init();
    }
    async mine(buyer) {
        const rows = await this.deposits
            .find({ buyer })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        return rows.map((row) => ({
            id: String(row._id),
            productId: String(row.product),
            amount: row.amount,
            maximum: row.maximum,
            status: row.status,
            credited: row.creditAmount,
            refunded: row.refundedAmount,
        }));
    }
    async require(product, buyer, maximum, session) {
        const needed = requiredDeposit(maximum);
        const rows = await this.deposits
            .find({ product, buyer, status: "paid", refundTarget: 0 })
            .session(session || null);
        if (rows.reduce((sum, row) => sum + row.amount, 0) < needed)
            throw new common_1.ForbiddenException("A confirmed 10% bid guarantee is required.");
        if (session)
            await this.deposits.updateMany({ _id: { $in: rows.map((row) => row._id) }, status: "paid" }, { $set: { nextCheckAt: new Date() } }, { session });
    }
    async activate(productId, seller) {
        this.stripe.sdk;
        await this.accounts.requireSeller(seller);
        return this.products.db.transaction(async (session) => {
            const product = await this.products.findById(productId).session(session);
            if (!product || String(product.seller) !== seller)
                throw new common_1.ForbiddenException();
            if (product.commerceVersion === 1)
                return { activated: true };
            if (product.status !== product_schema_1.ProductStatus.Active ||
                product.endsAt <= new Date() ||
                product.highestBid ||
                (await this.bids.exists({ product: product._id }).session(session)))
                throw new common_1.ConflictException("Only active listings without bids can be enrolled. Existing commitments require support review.");
            product.commerceVersion = 1;
            await product.save({ session });
            return { activated: true };
        });
    }
    async cancelPending(product, buyer) {
        return this.locks.run(`guarantee:${product}:${buyer}`, async () => {
            const rows = await this.deposits.find({
                product,
                buyer,
                status: "pending",
            });
            for (const row of rows) {
                let intent = await this.intent(row);
                if (!["succeeded", "canceled"].includes(intent.status))
                    intent = await this.stripe.sdk.paymentIntents.cancel(intent.id, {}, { idempotencyKey: `deposit-cancel:${row.attempt}` });
                await this.syncIntent(intent);
            }
            return { status: "reconciled" };
        });
    }
    async payment(productId, buyer, maximum) {
        const needed = requiredDeposit(maximum);
        this.stripe.sdk;
        await this.accounts.requireBuyer(buyer);
        return this.locks.run(`guarantee:${productId}:${buyer}`, async () => {
            const product = await this.products.findById(productId);
            if (!product ||
                product.commerceVersion !== 1 ||
                product.status !== product_schema_1.ProductStatus.Active ||
                product.endsAt <= new Date() ||
                product.startsAt > new Date() ||
                String(product.seller) === buyer)
                throw new common_1.ConflictException("Auction is not eligible for a bid guarantee.");
            if (maximum < product.currentPrice + product.minBidIncrement)
                throw new common_1.ConflictException("Maximum bid is below the current minimum.");
            const rows = await this.deposits.find({ product: productId, buyer });
            if (rows.some((row) => ["review_required", "disputed", "refunding"].includes(row.status)))
                throw new common_1.ConflictException("Guarantee needs review.");
            let pending = rows.find((row) => row.status === "pending");
            if (pending) {
                await this.syncIntent(await this.intent(pending));
                pending = await this.deposits.findById(pending._id);
                if (pending.status === "pending") {
                    if (pending.maximum !== maximum)
                        throw new common_1.ConflictException("Finish the previous guarantee payment first.");
                    const intent = await this.intent(pending);
                    return {
                        clientSecret: intent.client_secret,
                        amount: pending.amount,
                        required: needed,
                        status: "requires_payment",
                    };
                }
            }
            const paid = await this.deposits.find({
                product: productId,
                buyer,
                status: "paid",
                refundTarget: 0,
            });
            const held = paid.reduce((sum, row) => sum + row.amount, 0);
            if (held >= needed)
                return { status: "covered", amount: 0, required: needed };
            const delta = needed - held;
            if (delta < 300)
                throw new common_1.BadRequestException("Increase your maximum enough for a guarantee top-up of at least 3 RON.");
            let row;
            await this.products.db.transaction(async (session) => {
                const fresh = await this.products.findById(productId).session(session);
                if (!fresh ||
                    fresh.status !== product_schema_1.ProductStatus.Active ||
                    fresh.endsAt <= new Date())
                    throw new common_1.ConflictException("Auction has ended.");
                fresh.increment();
                await fresh.save({ session });
                [row] = await this.deposits.create([
                    {
                        product: productId,
                        buyer,
                        amount: delta,
                        maximum,
                        attempt: (0, crypto_1.randomUUID)(),
                        startedAt: new Date(),
                    },
                ], { session });
            });
            const intent = await this.intent(row);
            return {
                clientSecret: intent.client_secret,
                amount: delta,
                required: needed,
                status: "requires_payment",
            };
        });
    }
    async intent(row) {
        if (row.paymentIntentId)
            return this.stripe.sdk.paymentIntents.retrieve(row.paymentIntentId);
        if (Date.now() - row.startedAt.getTime() >= 20 * 3600000) {
            row.status = "review_required";
            row.reviewCode = "deposit_creation_uncertain";
            await row.save();
            throw new common_1.ConflictException("Guarantee creation requires reconciliation.");
        }
        const intent = await this.stripe.sdk.paymentIntents.create({
            amount: row.amount,
            currency: "ron",
            allowed_payment_method_types: ["card"],
            capture_method: "automatic",
            metadata: { depositId: String(row._id), attempt: row.attempt },
        }, { idempotencyKey: `deposit:${row.attempt}` });
        row.paymentIntentId = intent.id;
        await row.save();
        return intent;
    }
    async syncIntent(intent) {
        if (!intent.metadata?.depositId)
            return false;
        const row = await this.deposits.findOne({
            _id: intent.metadata.depositId,
            attempt: intent.metadata.attempt,
        });
        if (!row)
            return true;
        if (intent.livemode ||
            intent.amount !== row.amount ||
            intent.currency !== "ron" ||
            (row.paymentIntentId && row.paymentIntentId !== intent.id))
            throw new common_1.ConflictException("Guarantee payment mismatch.");
        const chargeId = typeof intent.latest_charge === "string"
            ? intent.latest_charge
            : intent.latest_charge?.id;
        const update = {
            paymentIntentId: intent.id,
            ...(chargeId ? { chargeId } : {}),
        };
        if (row.status === "pending" && intent.status === "succeeded")
            update.status = "paid";
        if (row.status === "pending" && intent.status === "canceled")
            update.status = "canceled";
        await this.deposits.updateOne({ _id: row._id, status: row.status }, { $set: update });
        return true;
    }
    async allocate(order) {
        if (order.depositAllocated)
            return order;
        await this.orders.db.transaction(async (session) => {
            const fresh = await this.orders.findById(order._id).session(session);
            if (fresh.depositAllocated)
                return;
            const rows = await this.deposits
                .find({ product: order.product, buyer: order.buyer })
                .sort({ createdAt: 1 })
                .session(session);
            if (rows.some((row) => row.status === "pending"))
                throw new common_1.ConflictException("Wait for the guarantee payment to be reconciled.");
            if (rows.some((row) => ["disputed", "review_required", "refunding"].includes(row.status)))
                throw new common_1.ConflictException("Guarantee requires review before payment.");
            let remaining = order.amount;
            const parts = [];
            for (const row of rows.filter((row) => row.status === "paid")) {
                let credit = Math.min(row.amount, remaining);
                if (remaining > credit && remaining - credit < 300)
                    credit = Math.max(0, remaining - 300);
                row.creditAmount = credit;
                row.order = order._id;
                row.status = "allocated";
                row.refundTarget = row.amount - credit;
                remaining -= credit;
                if (credit)
                    parts.push({
                        depositId: String(row._id),
                        paymentIntentId: row.paymentIntentId,
                        chargeId: row.chargeId,
                        amount: credit,
                    });
                await row.save({ session });
            }
            fresh.depositAllocated = true;
            fresh.depositCredit = order.amount - remaining;
            fresh.depositParts = parts;
            await fresh.save({ session });
        });
        const fresh = await this.orders.findById(order._id);
        return fresh;
    }
    async reconcileOrder(order) {
        let rows = await this.deposits.find({ order: order._id });
        for (const row of rows)
            if (row.chargeId)
                await this.syncCharge(await this.stripe.sdk.charges.retrieve(row.chargeId));
        rows = await this.deposits.find({ order: order._id });
        const depositsRefunded = rows.reduce((sum, row) => sum + Math.max(0, row.refundedAmount - (row.amount - row.creditAmount)), 0);
        let mainRefunded = 0;
        if (order.chargeId)
            mainRefunded = (await this.stripe.sdk.charges.retrieve(order.chargeId))
                .amount_refunded;
        const total = mainRefunded + depositsRefunded;
        if (total >= order.amount && !order.transferId)
            await this.orders.updateOne({ _id: order._id, status: "refund_pending" }, { $set: { status: "refunded", refundedAmount: total } });
    }
    async syncCharge(charge) {
        const id = typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;
        const row = await this.deposits.findOne({ paymentIntentId: id });
        if (!row)
            return false;
        if (charge.livemode ||
            charge.amount !== row.amount ||
            charge.currency !== "ron")
            throw new common_1.ConflictException("Guarantee charge mismatch.");
        row.refundedAmount = charge.amount_refunded;
        if (charge.disputed || charge.amount_refunded > row.refundTarget) {
            row.status = charge.disputed ? "disputed" : "review_required";
            row.reviewCode = "guarantee_charge_changed";
            if (row.order)
                await this.orders.updateOne({ _id: row.order }, {
                    $set: {
                        status: "review_required",
                        issueOpen: true,
                        reviewCode: row.reviewCode,
                    },
                });
        }
        else if (row.refundedAmount === row.amount)
            row.status = "refunded";
        await row.save();
        return true;
    }
    async maintain() {
        const rows = await this.deposits
            .find({
            status: { $in: ["pending", "paid", "allocated", "refunding"] },
            nextCheckAt: { $lte: new Date() },
        })
            .sort({ nextCheckAt: 1 })
            .limit(20);
        for (const row of rows) {
            try {
                await this.locks.run(`guarantee:${row.product}:${row.buyer}`, async () => {
                    let fresh = await this.deposits.findById(row._id);
                    const product = await this.products.findById(row.product);
                    const terminal = !product ||
                        product.status !== product_schema_1.ProductStatus.Active ||
                        product.endsAt <= new Date();
                    if (fresh.status === "pending") {
                        let intent = await this.intent(fresh);
                        if (terminal &&
                            !["succeeded", "canceled"].includes(intent.status))
                            intent = await this.stripe.sdk.paymentIntents.cancel(intent.id, {}, { idempotencyKey: `deposit-cancel:${fresh.attempt}` });
                        await this.syncIntent(intent);
                        fresh = await this.deposits.findById(row._id);
                    }
                    if (!["paid", "allocated", "refunding"].includes(fresh.status))
                        return;
                    if (fresh.chargeId)
                        await this.syncCharge(await this.stripe.sdk.charges.retrieve(fresh.chargeId));
                    fresh = await this.deposits.findById(row._id);
                    if (["review_required", "disputed"].includes(fresh.status))
                        return;
                    const order = fresh.order
                        ? await this.orders.findById(fresh.order)
                        : await this.orders.findOne({
                            product: fresh.product,
                            buyer: fresh.buyer,
                        });
                    const loses = !product ||
                        [product_schema_1.ProductStatus.Expired, product_schema_1.ProductStatus.Hidden].includes(product.status) ||
                        ([product_schema_1.ProductStatus.Reserved, product_schema_1.ProductStatus.Sold].includes(product.status) &&
                            String(product.reservedBy) !== String(fresh.buyer));
                    if (loses ||
                        order?.status === "payment_expired" ||
                        order?.status === "refund_pending")
                        fresh.refundTarget = fresh.amount;
                    if (fresh.refundTarget > fresh.refundedAmount) {
                        const extra = fresh;
                        if (!extra.refundRequestedTotal ||
                            fresh.refundedAmount >= extra.refundRequestedTotal) {
                            extra.refundRequestedTotal = fresh.refundTarget;
                            extra.refundRequestAmount =
                                fresh.refundTarget - fresh.refundedAmount;
                            fresh.refundStartedAt = new Date();
                        }
                        if (Date.now() - fresh.refundStartedAt.getTime() >=
                            20 * 3600000) {
                            fresh.status = "review_required";
                            fresh.reviewCode = "deposit_refund_uncertain";
                            await fresh.save();
                            return;
                        }
                        await fresh.save();
                        const refund = await this.stripe.sdk.refunds.create({
                            payment_intent: fresh.paymentIntentId,
                            amount: extra.refundRequestAmount,
                        }, {
                            idempotencyKey: `deposit-refund:${fresh.attempt}:${extra.refundRequestedTotal}`,
                        });
                        fresh.refundId = refund.id;
                        await fresh.save();
                        if (fresh.chargeId)
                            await this.syncCharge(await this.stripe.sdk.charges.retrieve(fresh.chargeId));
                    }
                    if (order?.status === "refund_pending")
                        await this.reconcileOrder(order);
                });
            }
            catch {
            }
            finally {
                await this.deposits.updateOne({ _id: row._id }, { $set: { nextCheckAt: new Date(Date.now() + 60000) } });
            }
        }
    }
};
exports.BidDepositsService = BidDepositsService;
exports.BidDepositsService = BidDepositsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(commerce_schemas_1.BidDeposit.name)),
    __param(1, (0, mongoose_1.InjectModel)(commerce_schemas_1.CommerceOrder.name)),
    __param(2, (0, mongoose_1.InjectModel)(product_schema_1.Product.name)),
    __param(6, (0, mongoose_1.InjectModel)(bid_schema_1.Bid.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        stripe_client_service_1.StripeClientService,
        commerce_accounts_service_1.CommerceAccountsService,
        commerce_lock_service_1.CommerceLockService,
        mongoose_2.Model])
], BidDepositsService);
//# sourceMappingURL=bid-deposits.service.js.map