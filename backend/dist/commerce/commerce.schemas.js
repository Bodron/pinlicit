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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommerceLockSchema = exports.CommerceLock = exports.StripeInboxSchema = exports.StripeInbox = exports.BidDepositSchema = exports.BidDeposit = exports.CommerceOrderSchema = exports.CommerceOrder = exports.orderStates = exports.CommerceAccountSchema = exports.CommerceAccount = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let CommerceAccount = class CommerceAccount {
};
exports.CommerceAccount = CommerceAccount;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], CommerceAccount.prototype, "user", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CommerceAccount.prototype, "identityAttempt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], CommerceAccount.prototype, "identityAttemptAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CommerceAccount.prototype, "verificationSessionId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: "unverified" }),
    __metadata("design:type", String)
], CommerceAccount.prototype, "identityStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], CommerceAccount.prototype, "verifiedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CommerceAccount.prototype, "identityErrorCode", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CommerceAccount.prototype, "connectAttempt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], CommerceAccount.prototype, "connectAttemptAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CommerceAccount.prototype, "connectedAccountId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], CommerceAccount.prototype, "transfersEnabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], CommerceAccount.prototype, "payoutsEnabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], CommerceAccount.prototype, "detailsSubmitted", void 0);
exports.CommerceAccount = CommerceAccount = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], CommerceAccount);
exports.CommerceAccountSchema = mongoose_1.SchemaFactory.createForClass(CommerceAccount);
exports.CommerceAccountSchema.index({ verificationSessionId: 1 }, { unique: true, sparse: true });
exports.CommerceAccountSchema.index({ connectedAccountId: 1 }, { unique: true, sparse: true });
exports.orderStates = [
    "awaiting_payment",
    "paid",
    "shipped",
    "delivered",
    "transfer_pending",
    "completed",
    "payment_expired",
    "refund_pending",
    "refunded",
    "disputed",
    "review_required",
];
let CommerceOrder = class CommerceOrder {
};
exports.CommerceOrder = CommerceOrder;
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
        unique: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], CommerceOrder.prototype, "product", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: "User", required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], CommerceOrder.prototype, "buyer", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: "User", required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], CommerceOrder.prototype, "seller", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CommerceOrder.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], CommerceOrder.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], CommerceOrder.prototype, "fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], CommerceOrder.prototype, "sellerAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: "ron" }),
    __metadata("design:type", String)
], CommerceOrder.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], CommerceOrder.prototype, "feeBps", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: exports.orderStates, default: "awaiting_payment" }),
    __metadata("design:type", String)
], CommerceOrder.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], CommerceOrder.prototype, "paymentDeadline", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CommerceOrder.prototype, "paymentAttempt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CommerceOrder.prototype, "paymentIntentId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], CommerceOrder.prototype, "paymentStartedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: () => new Date() }),
    __metadata("design:type", Date)
], CommerceOrder.prototype, "nextCheckAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CommerceOrder.prototype, "chargeId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CommerceOrder.prototype, "connectedAccountId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CommerceOrder.prototype, "transferId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], CommerceOrder.prototype, "transferStartedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], CommerceOrder.prototype, "refundedAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CommerceOrder.prototype, "carrier", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CommerceOrder.prototype, "trackingCode", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], CommerceOrder.prototype, "deliveredAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], CommerceOrder.prototype, "fundsReviewAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], CommerceOrder.prototype, "releaseAfter", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], CommerceOrder.prototype, "issueOpen", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CommerceOrder.prototype, "issueCode", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CommerceOrder.prototype, "reviewCode", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CommerceOrder.prototype, "refundReason", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], CommerceOrder.prototype, "refundStartedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], CommerceOrder.prototype, "depositAllocated", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], CommerceOrder.prototype, "depositCredit", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], CommerceOrder.prototype, "depositParts", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], CommerceOrder.prototype, "payoutParts", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: "User" }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], CommerceOrder.prototype, "refundRequestedBy", void 0);
exports.CommerceOrder = CommerceOrder = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], CommerceOrder);
exports.CommerceOrderSchema = mongoose_1.SchemaFactory.createForClass(CommerceOrder);
exports.CommerceOrderSchema.index({ buyer: 1, createdAt: -1 });
exports.CommerceOrderSchema.index({ seller: 1, createdAt: -1 });
exports.CommerceOrderSchema.index({ status: 1, paymentDeadline: 1 });
exports.CommerceOrderSchema.index({ status: 1, releaseAfter: 1 });
exports.CommerceOrderSchema.index({ paymentIntentId: 1 }, { unique: true, sparse: true });
let BidDeposit = class BidDeposit {
};
exports.BidDeposit = BidDeposit;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: "Product", required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], BidDeposit.prototype, "product", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: "User", required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], BidDeposit.prototype, "buyer", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], BidDeposit.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], BidDeposit.prototype, "maximum", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], BidDeposit.prototype, "attempt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], BidDeposit.prototype, "startedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], BidDeposit.prototype, "paymentIntentId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], BidDeposit.prototype, "chargeId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: "pending" }),
    __metadata("design:type", String)
], BidDeposit.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], BidDeposit.prototype, "creditAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: "CommerceOrder" }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], BidDeposit.prototype, "order", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], BidDeposit.prototype, "refundedAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], BidDeposit.prototype, "refundTarget", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], BidDeposit.prototype, "refundStartedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], BidDeposit.prototype, "refundRequestedTotal", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], BidDeposit.prototype, "refundRequestAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], BidDeposit.prototype, "refundId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], BidDeposit.prototype, "reviewCode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: () => new Date() }),
    __metadata("design:type", Date)
], BidDeposit.prototype, "nextCheckAt", void 0);
exports.BidDeposit = BidDeposit = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], BidDeposit);
exports.BidDepositSchema = mongoose_1.SchemaFactory.createForClass(BidDeposit);
exports.BidDepositSchema.index({ product: 1, buyer: 1 });
exports.BidDepositSchema.index({ status: 1, nextCheckAt: 1 });
exports.BidDepositSchema.index({ paymentIntentId: 1 }, { unique: true, sparse: true });
let StripeInbox = class StripeInbox {
};
exports.StripeInbox = StripeInbox;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], StripeInbox.prototype, "eventId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], StripeInbox.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], StripeInbox.prototype, "objectId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: "pending" }),
    __metadata("design:type", String)
], StripeInbox.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], StripeInbox.prototype, "attempts", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: () => new Date() }),
    __metadata("design:type", Date)
], StripeInbox.prototype, "nextAttemptAt", void 0);
exports.StripeInbox = StripeInbox = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], StripeInbox);
exports.StripeInboxSchema = mongoose_1.SchemaFactory.createForClass(StripeInbox);
exports.StripeInboxSchema.index({ status: 1, nextAttemptAt: 1 });
let CommerceLock = class CommerceLock {
};
exports.CommerceLock = CommerceLock;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], CommerceLock.prototype, "key", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CommerceLock.prototype, "owner", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], CommerceLock.prototype, "expiresAt", void 0);
exports.CommerceLock = CommerceLock = __decorate([
    (0, mongoose_1.Schema)({ versionKey: false })
], CommerceLock);
exports.CommerceLockSchema = mongoose_1.SchemaFactory.createForClass(CommerceLock);
exports.CommerceLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
//# sourceMappingURL=commerce.schemas.js.map