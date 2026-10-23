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
exports.CommerceOrdersService = void 0;
const bid_deposits_service_1 = require("./bid-deposits.service");
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const crypto_1 = require("crypto");
const mongoose_2 = require("mongoose");
const product_schema_1 = require("../products/schemas/product.schema");
const commerce_schemas_1 = require("./commerce.schemas");
const commerce_accounts_service_1 = require("./commerce-accounts.service");
const commerce_lock_service_1 = require("./commerce-lock.service");
const stripe_client_service_1 = require("./stripe-client.service");
const commerce_policy_1 = require("./commerce.policy");
let CommerceOrdersService = class CommerceOrdersService {
    constructor(orders, products, stripe, accounts, locks, deposits) {
        this.orders = orders;
        this.products = products;
        this.stripe = stripe;
        this.accounts = accounts;
        this.locks = locks;
        this.deposits = deposits;
    }
    async ready() {
        await this.orders.init();
    }
    async create(productId, buyerId) {
        this.stripe.sdk;
        return this.locks.run(`product-order:${productId}`, async () => {
            const existing = await this.orders.findOne({ product: productId });
            if (existing) {
                (0, commerce_policy_1.assertBuyer)(existing, buyerId);
                return (0, commerce_policy_1.publicOrder)(existing);
            }
            const product = await this.products.findById(productId);
            if (!product ||
                product.status !== product_schema_1.ProductStatus.Reserved ||
                !product.reservedAt ||
                product.commerceVersion !== 1) {
                throw new common_1.ConflictException("A finalized reservation is required. Legacy reservations require review.");
            }
            if (String(product.reservedBy) !== buyerId ||
                String(product.seller) === buyerId)
                throw new common_1.ForbiddenException();
            const policy = (0, commerce_policy_1.priceSnapshot)(product.currentPrice, this.stripe.setting("STRIPE_PLATFORM_FEE_BPS", 0, 5000));
            const hours = this.stripe.setting("STRIPE_PAYMENT_WINDOW_HOURS", 1, 168);
            const order = await this.orders.create({
                product: product._id,
                seller: product.seller,
                buyer: product.reservedBy,
                title: product.title,
                ...policy,
                paymentAttempt: (0, crypto_1.randomUUID)(),
                paymentDeadline: new Date(product.reservedAt.getTime() + hours * 3600000),
            });
            return (0, commerce_policy_1.publicOrder)(order);
        });
    }
    async reviewQueue() {
        return (await this.orders
            .find({
            $or: [
                { issueOpen: true },
                {
                    status: {
                        $in: ["review_required", "disputed", "refund_pending"],
                    },
                },
            ],
        })
            .sort({ updatedAt: 1 })
            .limit(100)
            .lean()).map((order) => ({
            ...(0, commerce_policy_1.publicOrder)(order),
            issueCode: order.issueCode,
            reviewCode: order.reviewCode,
            refundReason: order.refundReason,
        }));
    }
    async details(id, userId) {
        return this.locks.run(`order:${id}`, async () => {
            let order = await this.requireOrder(id);
            if (![String(order.buyer), String(order.seller)].includes(userId))
                throw new common_1.ForbiddenException();
            if (order.status === "awaiting_payment")
                order = await this.deposits.allocate(order);
            if (order.paymentIntentId)
                await this.syncPayment(await this.stripe.sdk.paymentIntents.retrieve(order.paymentIntentId));
            if (order.status === "refund_pending")
                await this.deposits.reconcileOrder(order);
            order = await this.requireOrder(id);
            return (0, commerce_policy_1.publicOrder)(order);
        });
    }
    due(order) {
        return order.amount - (order.depositCredit || 0);
    }
    async mine(userId) {
        const rows = await this.orders
            .find({ $or: [{ buyer: userId }, { seller: userId }] })
            .sort({ createdAt: -1 })
            .limit(50);
        const result = [];
        for (const row of rows) {
            if (row.status === "awaiting_payment" && !row.depositAllocated) {
                try {
                    result.push(await this.locks.run(`order:${row._id}`, async () => (0, commerce_policy_1.publicOrder)(await this.deposits.allocate(await this.requireOrder(String(row._id))))));
                }
                catch {
                    result.push({ ...(0, commerce_policy_1.publicOrder)(row), settlementPending: true });
                }
            }
            else
                result.push((0, commerce_policy_1.publicOrder)(row));
        }
        return result;
    }
    async requireOrder(id) {
        const order = await this.orders.findById(id);
        if (!order)
            throw new common_1.NotFoundException("Order not found.");
        return order;
    }
    async payment(id, buyerId) {
        const sdk = this.stripe.sdk;
        this.stripe.setting("STRIPE_MAX_FULFILLMENT_DAYS", 1, 60);
        return this.locks.run(`order:${id}`, async () => {
            let order = await this.requireOrder(id);
            (0, commerce_policy_1.assertBuyer)(order, buyerId);
            if (order.status !== "awaiting_payment" ||
                order.paymentDeadline.getTime() <= Date.now())
                throw new common_1.ConflictException("Order is not payable.");
            await this.accounts.requireBuyer(buyerId);
            const destination = await this.accounts.requireSeller(String(order.seller));
            order = await this.deposits.allocate(order);
            await this.validateCreditCharges(order);
            order.connectedAccountId = destination;
            if (this.due(order) === 0) {
                order.status = "paid";
                order.fundsReviewAt = new Date(Date.now() +
                    this.stripe.setting("STRIPE_MAX_FULFILLMENT_DAYS", 1, 60) *
                        86400000);
                await order.save();
                await this.products.updateOne({
                    _id: order.product,
                    status: product_schema_1.ProductStatus.Reserved,
                    reservedBy: order.buyer,
                }, { $set: { status: product_schema_1.ProductStatus.Sold } });
                return { status: "paid" };
            }
            if (!order.paymentStartedAt)
                order.paymentStartedAt = new Date();
            await order.save();
            let intent;
            if (order.paymentIntentId)
                intent = await sdk.paymentIntents.retrieve(order.paymentIntentId);
            else {
                if (Date.now() - order.paymentStartedAt.getTime() >= 20 * 3600000) {
                    await this.orders.updateOne({ _id: order._id }, {
                        $set: {
                            status: "review_required",
                            reviewCode: "payment_creation_uncertain",
                        },
                    });
                    throw new common_1.ConflictException("Payment creation needs reconciliation.");
                }
                intent = await sdk.paymentIntents.create({
                    amount: this.due(order),
                    currency: order.currency,
                    allowed_payment_method_types: ["card"],
                    capture_method: "automatic",
                    transfer_group: `order_${order._id}`,
                    metadata: {
                        orderId: String(order._id),
                        attempt: order.paymentAttempt,
                    },
                }, { idempotencyKey: `payment:${order.paymentAttempt}` });
                order.paymentIntentId = intent.id;
                order.connectedAccountId = destination;
                await order.save();
            }
            this.assertIntent(order, intent);
            if (intent.status === "succeeded") {
                await this.syncPayment(intent);
                return { status: "paid" };
            }
            if (intent.status === "canceled")
                throw new common_1.ConflictException("Payment was canceled.");
            return { clientSecret: intent.client_secret, status: intent.status };
        });
    }
    assertIntent(order, intent) {
        if (intent.livemode ||
            intent.amount !== this.due(order) ||
            intent.currency !== order.currency ||
            intent.metadata.orderId !== String(order._id) ||
            intent.metadata.attempt !== order.paymentAttempt ||
            (order.paymentIntentId && order.paymentIntentId !== intent.id)) {
            throw new common_1.ConflictException("Payment does not match the order snapshot.");
        }
    }
    async syncPayment(intent) {
        if (!intent.metadata?.attempt || !intent.metadata?.orderId)
            return;
        const order = await this.orders.findOne({
            paymentAttempt: intent.metadata.attempt,
            _id: intent.metadata.orderId,
        });
        if (!order)
            return;
        this.assertIntent(order, intent);
        const chargeId = typeof intent.latest_charge === "string"
            ? intent.latest_charge
            : intent.latest_charge?.id;
        await this.orders.updateOne({ _id: order._id }, {
            $set: { paymentIntentId: intent.id, ...(chargeId ? { chargeId } : {}) },
        });
        if (intent.status === "succeeded") {
            await this.validateCreditCharges(order);
            const maxDays = this.stripe.setting("STRIPE_MAX_FULFILLMENT_DAYS", 1, 60);
            await this.orders.updateOne({
                _id: order._id,
                status: { $in: ["awaiting_payment", "payment_expired"] },
            }, {
                $set: {
                    status: "paid",
                    fundsReviewAt: new Date(Date.now() + maxDays * 86400000),
                },
            });
            await this.products.updateOne({
                _id: order.product,
                status: product_schema_1.ProductStatus.Reserved,
                reservedBy: order.buyer,
            }, { $set: { status: product_schema_1.ProductStatus.Sold } });
        }
    }
    async shipped(id, sellerId, carrier, trackingCode) {
        return this.locks.run(`order:${id}`, async () => {
            const order = await this.requireOrder(id);
            if (String(order.seller) !== sellerId)
                throw new common_1.ForbiddenException();
            if (order.status !== "paid" || order.issueOpen)
                throw new common_1.ConflictException("Order cannot be shipped.");
            order.status = "shipped";
            order.carrier = carrier;
            order.trackingCode = trackingCode;
            await order.save();
            return (0, commerce_policy_1.publicOrder)(order);
        });
    }
    async delivered(id, buyerId) {
        return this.locks.run(`order:${id}`, async () => {
            const order = await this.requireOrder(id);
            (0, commerce_policy_1.assertBuyer)(order, buyerId);
            if (!["paid", "shipped"].includes(order.status) || order.issueOpen)
                throw new common_1.ConflictException("Order cannot be confirmed.");
            const hours = this.stripe.setting("STRIPE_RELEASE_DELAY_HOURS", 1, 720);
            order.status = "delivered";
            order.deliveredAt = new Date();
            order.releaseAfter = new Date(Date.now() + hours * 3600000);
            await order.save();
            return (0, commerce_policy_1.publicOrder)(order);
        });
    }
    async issue(id, buyerId, code) {
        return this.locks.run(`order:${id}`, async () => {
            const order = await this.requireOrder(id);
            (0, commerce_policy_1.assertBuyer)(order, buyerId);
            if (!["paid", "shipped", "delivered"].includes(order.status))
                throw new common_1.ConflictException("Contact support for this payment state.");
            order.issueOpen = true;
            order.issueCode = code;
            await order.save();
            return (0, commerce_policy_1.publicOrder)(order);
        });
    }
    async refund(id, reason, adminId) {
        return this.locks.run(`order:${id}`, async () => {
            const order = await this.requireOrder(id);
            if (!["paid", "shipped", "delivered", "refund_pending"].includes(order.status) ||
                (!order.paymentIntentId && !order.depositCredit) ||
                order.transferId)
                throw new common_1.ConflictException("Refund requires manual review for this state.");
            if (order.refundStartedAt &&
                Date.now() - order.refundStartedAt.getTime() >= 20 * 3600000)
                throw new common_1.ConflictException("Refund requires reconciliation before retry.");
            order.refundStartedAt ||= new Date();
            order.status = "refund_pending";
            order.refundReason = reason;
            order.refundRequestedBy = adminId;
            await order.save();
            if (order.paymentIntentId)
                await this.stripe.sdk.refunds.create({ payment_intent: order.paymentIntentId }, { idempotencyKey: `refund:${order._id}` });
            return (0, commerce_policy_1.publicOrder)(order);
        });
    }
    async syncCharge(charge) {
        if (charge.livemode)
            throw new common_1.BadRequestException("Unexpected live charge.");
        const intentId = typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;
        const order = await this.orders.findOne({ paymentIntentId: intentId });
        if (!order)
            return;
        if (charge.amount !== this.due(order) || charge.currency !== order.currency)
            throw new common_1.ConflictException("Charge amount mismatch.");
        if (order.depositCredit > 0 &&
            charge.amount_refunded > 0 &&
            !charge.disputed &&
            order.status === "refund_pending") {
            await this.deposits.reconcileOrder(order);
            return;
        }
        if (charge.disputed || charge.amount_refunded > 0) {
            await this.orders.updateOne({ _id: order._id }, {
                $set: {
                    refundedAmount: charge.amount_refunded,
                    issueOpen: charge.disputed || charge.amount_refunded < order.amount,
                    status: order.transferId
                        ? "review_required"
                        : charge.disputed
                            ? "disputed"
                            : charge.amount_refunded === order.amount
                                ? "refunded"
                                : "review_required",
                    reviewCode: order.transferId
                        ? "post_transfer_refund_or_dispute"
                        : undefined,
                },
            });
        }
    }
    async maintain() {
        const due = await this.orders
            .find({
            nextCheckAt: { $lte: new Date() },
            $or: [
                { status: "awaiting_payment", paymentDeadline: { $lte: new Date() } },
                { status: "awaiting_payment", paymentIntentId: { $exists: true } },
                {
                    status: "delivered",
                    releaseAfter: { $lte: new Date() },
                    issueOpen: false,
                },
                { status: "transfer_pending" },
                { status: "refund_pending" },
                {
                    status: { $in: ["paid", "shipped", "delivered"] },
                    fundsReviewAt: { $lte: new Date() },
                },
            ],
        })
            .sort({ updatedAt: 1 })
            .limit(20);
        for (const row of due) {
            try {
                await this.locks.run(`order:${row._id}`, () => this.maintainOrder(String(row._id)));
            }
            catch {
            }
            finally {
                await this.orders.updateOne({ _id: row._id }, { $set: { nextCheckAt: new Date(Date.now() + 60000) } });
            }
        }
    }
    async maintainOrder(id) {
        const order = await this.requireOrder(id);
        const sdk = this.stripe.sdk;
        if (order.status === "refund_pending") {
            if (!order.refundStartedAt ||
                Date.now() - order.refundStartedAt.getTime() >= 20 * 3600000) {
                order.status = "review_required";
                order.reviewCode = "refund_reconciliation_needed";
                await order.save();
                return;
            }
            if (order.paymentIntentId)
                await sdk.refunds.create({ payment_intent: order.paymentIntentId }, { idempotencyKey: `refund:${order._id}` });
            if (order.depositCredit > 0)
                await this.deposits.reconcileOrder(order);
            else if (order.chargeId)
                await this.syncCharge(await sdk.charges.retrieve(order.chargeId));
            return;
        }
        if (order.status === "awaiting_payment") {
            if (order.paymentIntentId) {
                let intent = await sdk.paymentIntents.retrieve(order.paymentIntentId);
                if (intent.status === "succeeded") {
                    await this.syncPayment(intent);
                    return;
                }
                if (order.paymentDeadline.getTime() > Date.now())
                    return;
                if (intent.status !== "canceled")
                    intent = await sdk.paymentIntents.cancel(intent.id, {}, { idempotencyKey: `expire:${order._id}` });
                if (intent.status !== "canceled")
                    return;
            }
            else {
                if (order.paymentDeadline.getTime() > Date.now())
                    return;
                if (order.paymentStartedAt) {
                    await this.orders.updateOne({ _id: order._id }, {
                        $set: {
                            status: "review_required",
                            reviewCode: "payment_creation_uncertain",
                        },
                    });
                    return;
                }
            }
            await this.orders.updateOne({ _id: order._id, status: "awaiting_payment" }, { $set: { status: "payment_expired" } });
            return;
        }
        if (["paid", "shipped", "delivered"].includes(order.status) &&
            order.fundsReviewAt &&
            order.fundsReviewAt.getTime() <= Date.now()) {
            await this.orders.updateOne({ _id: order._id }, {
                $set: {
                    status: "review_required",
                    issueOpen: true,
                    reviewCode: "fulfillment_deadline_exceeded",
                },
            });
            return;
        }
        if (!this.stripe.transfersEnabled)
            return;
        if (!["delivered", "transfer_pending"].includes(order.status) ||
            order.issueOpen ||
            !order.releaseAfter ||
            order.releaseAfter.getTime() > Date.now())
            return;
        if (order.depositCredit > 0) {
            await this.transferInstallments(order);
            return;
        }
        if (!order.paymentIntentId)
            throw new common_1.ConflictException();
        const intent = await sdk.paymentIntents.retrieve(order.paymentIntentId);
        this.assertIntent(order, intent);
        const chargeId = typeof intent.latest_charge === "string"
            ? intent.latest_charge
            : intent.latest_charge?.id;
        if (intent.status !== "succeeded" || !chargeId)
            throw new common_1.ConflictException();
        const charge = await sdk.charges.retrieve(chargeId);
        if (charge.disputed || charge.amount_refunded) {
            await this.syncCharge(charge);
            return;
        }
        const destination = await this.accounts.requireSeller(String(order.seller));
        if (order.connectedAccountId && order.connectedAccountId !== destination)
            throw new common_1.ConflictException("Destination changed.");
        if (order.status === "delivered") {
            order.status = "transfer_pending";
            order.transferStartedAt = new Date();
            await order.save();
        }
        if (!order.transferStartedAt ||
            Date.now() - new Date(order.transferStartedAt).getTime() >= 20 * 3600000) {
            await this.orders.updateOne({ _id: order._id }, {
                $set: {
                    status: "review_required",
                    reviewCode: "transfer_reconciliation_needed",
                },
            });
            return;
        }
        const transfer = await sdk.transfers.create({
            amount: order.sellerAmount,
            currency: order.currency,
            destination,
            source_transaction: chargeId,
            transfer_group: `order_${order._id}`,
            metadata: { orderId: String(order._id), attempt: order.paymentAttempt },
        }, { idempotencyKey: `transfer:${order._id}` });
        order.transferId = transfer.id;
        order.status = "completed";
        await order.save();
    }
    async refreshPayment(id) {
        const intent = await this.stripe.sdk.paymentIntents.retrieve(id);
        if (intent.metadata?.depositId) {
            await this.deposits.syncIntent(intent);
            return;
        }
        if (!intent.metadata?.orderId || !intent.metadata?.attempt)
            return;
        return this.locks.run(`order:${intent.metadata.orderId}`, async () => {
            await this.syncPayment(await this.stripe.sdk.paymentIntents.retrieve(id));
        });
    }
    async refreshCharge(id) {
        const charge = await this.stripe.sdk.charges.retrieve(id);
        const intentId = typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (!intentId)
            return;
        const order = await this.orders.findOne({ paymentIntentId: intentId });
        if (!order) {
            await this.deposits.syncCharge(charge);
            return;
        }
        return this.locks.run(`order:${order._id}`, async () => {
            await this.syncCharge(await this.stripe.sdk.charges.retrieve(id));
        });
    }
    async refreshTransfer(id) {
        const transfer = await this.stripe.sdk.transfers.retrieve(id);
        if (!transfer.metadata?.orderId || !transfer.metadata?.attempt)
            return;
        return this.locks.run(`order:${transfer.metadata.orderId}`, async () => {
            await this.syncTransfer(await this.stripe.sdk.transfers.retrieve(id));
        });
    }
    async syncTransfer(transfer) {
        if (!transfer.metadata?.orderId || !transfer.metadata?.attempt)
            return;
        const order = await this.orders.findOne({
            _id: transfer.metadata.orderId,
            paymentAttempt: transfer.metadata.attempt,
        });
        if (!order)
            return;
        if (order.depositCredit > 0) {
            await this.syncInstallmentTransfer(order, transfer);
            return;
        }
        const destination = typeof transfer.destination === "string"
            ? transfer.destination
            : transfer.destination?.id;
        if ((order.transferId && order.transferId !== transfer.id) ||
            transfer.transfer_group !== `order_${order._id}` ||
            transfer.source_transaction !== order.chargeId ||
            transfer.amount !== order.sellerAmount ||
            transfer.currency !== order.currency ||
            destination !== order.connectedAccountId ||
            transfer.livemode)
            throw new common_1.ConflictException("Transfer mismatch.");
        await this.orders.updateOne({ _id: order._id }, {
            $set: {
                transferId: transfer.id,
                status: transfer.reversed ||
                    transfer.amount_reversed > 0 ||
                    order.issueOpen ||
                    [
                        "refund_pending",
                        "refunded",
                        "disputed",
                        "review_required",
                    ].includes(order.status)
                    ? "review_required"
                    : "completed",
            },
        });
    }
    async validateCreditCharges(order) {
        for (const part of order.depositParts) {
            const intent = await this.stripe.sdk.paymentIntents.retrieve(part.paymentIntentId);
            const charge = await this.stripe.sdk.charges.retrieve(part.chargeId);
            if (intent.livemode ||
                intent.status !== "succeeded" ||
                intent.metadata.depositId !== part.depositId ||
                charge.livemode ||
                charge.currency !== order.currency ||
                charge.disputed ||
                charge.amount - charge.amount_refunded < part.amount)
                throw new common_1.ConflictException("Guarantee funds are unavailable.");
        }
    }
    async transferInstallments(order) {
        await this.validateCreditCharges(order);
        const sources = [...order.depositParts];
        if (order.paymentIntentId) {
            const intent = await this.stripe.sdk.paymentIntents.retrieve(order.paymentIntentId);
            this.assertIntent(order, intent);
            const chargeId = typeof intent.latest_charge === "string"
                ? intent.latest_charge
                : intent.latest_charge?.id;
            if (intent.status !== "succeeded" || !chargeId)
                throw new common_1.ConflictException();
            const charge = await this.stripe.sdk.charges.retrieve(chargeId);
            if (charge.disputed || charge.amount_refunded) {
                await this.syncCharge(charge);
                return;
            }
            sources.push({ chargeId, amount: this.due(order) });
        }
        const destination = await this.accounts.requireSeller(String(order.seller));
        if (order.connectedAccountId && order.connectedAccountId !== destination)
            throw new common_1.ConflictException("Destination changed.");
        order.connectedAccountId = destination;
        if (!order.payoutParts.length) {
            let remaining = order.sellerAmount;
            order.payoutParts = sources.flatMap((source) => {
                const amount = Math.min(remaining, source.amount);
                remaining -= amount;
                return amount ? [{ amount, chargeId: source.chargeId }] : [];
            });
            if (remaining)
                throw new common_1.ConflictException("Insufficient order funds.");
            order.status = "transfer_pending";
            order.transferStartedAt = new Date();
            await order.save();
        }
        if (!order.transferStartedAt ||
            Date.now() - order.transferStartedAt.getTime() >= 20 * 3600000) {
            order.status = "review_required";
            order.reviewCode = "installment_transfer_reconciliation_needed";
            await order.save();
            return;
        }
        for (let index = 0; index < order.payoutParts.length; index++) {
            const part = order.payoutParts[index];
            if (part.transferId)
                continue;
            const transfer = await this.stripe.sdk.transfers.create({
                amount: part.amount,
                currency: order.currency,
                destination,
                source_transaction: part.chargeId,
                transfer_group: `order_${order._id}`,
                metadata: {
                    orderId: String(order._id),
                    attempt: order.paymentAttempt,
                    part: String(index),
                },
            }, { idempotencyKey: `transfer:${order._id}:part:${index}` });
            await this.syncInstallmentTransfer(order, transfer);
        }
    }
    async syncInstallmentTransfer(order, transfer) {
        const index = Number(transfer.metadata.part);
        const part = order.payoutParts[index];
        const destination = typeof transfer.destination === "string"
            ? transfer.destination
            : transfer.destination?.id;
        if (!Number.isInteger(index) ||
            !part ||
            transfer.livemode ||
            transfer.metadata.attempt !== order.paymentAttempt ||
            transfer.amount !== part.amount ||
            transfer.source_transaction !== part.chargeId ||
            transfer.currency !== order.currency ||
            transfer.transfer_group !== `order_${order._id}` ||
            destination !== order.connectedAccountId ||
            (part.transferId && part.transferId !== transfer.id))
            throw new common_1.ConflictException("Installment transfer mismatch.");
        part.transferId = transfer.id;
        order.markModified("payoutParts");
        order.transferId ||= transfer.id;
        if (transfer.reversed ||
            transfer.amount_reversed ||
            order.issueOpen ||
            ["review_required", "disputed", "refund_pending", "refunded"].includes(order.status)) {
            order.status = "review_required";
            order.issueOpen = true;
        }
        else if (order.payoutParts.every((item) => item.transferId))
            order.status = "completed";
        await order.save();
    }
};
exports.CommerceOrdersService = CommerceOrdersService;
exports.CommerceOrdersService = CommerceOrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(commerce_schemas_1.CommerceOrder.name)),
    __param(1, (0, mongoose_1.InjectModel)(product_schema_1.Product.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        stripe_client_service_1.StripeClientService,
        commerce_accounts_service_1.CommerceAccountsService,
        commerce_lock_service_1.CommerceLockService,
        bid_deposits_service_1.BidDepositsService])
], CommerceOrdersService);
//# sourceMappingURL=commerce-orders.service.js.map