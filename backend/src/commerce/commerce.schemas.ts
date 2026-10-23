import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types, Schema as MongooseSchema } from "mongoose";

@Schema({ timestamps: true })
export class CommerceAccount {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  })
  user: Types.ObjectId;
  @Prop() identityAttempt?: string;
  @Prop() identityAttemptAt?: Date;
  @Prop() verificationSessionId?: string;
  @Prop({ default: "unverified" }) identityStatus: string;
  @Prop() verifiedAt?: Date;
  @Prop() identityErrorCode?: string;
  @Prop() connectAttempt?: string;
  @Prop() connectAttemptAt?: Date;
  @Prop({ enum: ["individual", "company"] }) connectBusinessType?: string;
  @Prop() connectedAccountId?: string;
  @Prop({ default: false }) transfersEnabled: boolean;
  @Prop({ default: false }) payoutsEnabled: boolean;
  @Prop({ default: false }) detailsSubmitted: boolean;
}
export type CommerceAccountDocument = HydratedDocument<CommerceAccount>;
export const CommerceAccountSchema =
  SchemaFactory.createForClass(CommerceAccount);
CommerceAccountSchema.index(
  { verificationSessionId: 1 },
  { unique: true, sparse: true },
);
CommerceAccountSchema.index(
  { connectedAccountId: 1 },
  { unique: true, sparse: true },
);

export const orderStates = [
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
] as const;
export type OrderState = (typeof orderStates)[number];
@Schema({ timestamps: true })
export class CommerceOrder {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "Product",
    required: true,
    unique: true,
  })
  product: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true })
  buyer: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true })
  seller: Types.ObjectId;
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) amount: number;
  @Prop({ required: true }) fee: number;
  @Prop({ required: true }) sellerAmount: number;
  @Prop({ default: "ron" }) currency: string;
  @Prop({ required: true }) feeBps: number;
  @Prop({ enum: orderStates, default: "awaiting_payment" }) status: OrderState;
  @Prop({ required: true }) paymentDeadline: Date;
  @Prop({ required: true }) paymentAttempt: string;
  @Prop() paymentIntentId?: string;
  @Prop() paymentStartedAt?: Date;
  @Prop({ default: () => new Date() }) nextCheckAt: Date;
  @Prop() chargeId?: string;
  @Prop() connectedAccountId?: string;
  @Prop() transferId?: string;
  @Prop({ default: false }) payoutSetupRequired: boolean;
  @Prop() transferStartedAt?: Date;
  @Prop({ default: 0 }) refundedAmount: number;
  @Prop() carrier?: string;
  @Prop() trackingCode?: string;
  @Prop() deliveredAt?: Date;
  @Prop() fundsReviewAt?: Date;
  @Prop() releaseAfter?: Date;
  @Prop({ default: false }) issueOpen: boolean;
  @Prop() issueCode?: string;
  @Prop() reviewCode?: string;
  @Prop() refundReason?: string;
  @Prop() refundStartedAt?: Date;
  @Prop({ default: false }) depositAllocated: boolean;
  @Prop({ default: 0 }) depositCredit: number;
  @Prop({ type: [Object], default: [] }) depositParts: any[];
  @Prop({ type: [Object], default: [] }) payoutParts: any[];
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User" })
  refundRequestedBy?: Types.ObjectId;
}
export type CommerceOrderDocument = HydratedDocument<CommerceOrder>;
export const CommerceOrderSchema = SchemaFactory.createForClass(CommerceOrder);
CommerceOrderSchema.index({ buyer: 1, createdAt: -1 });
CommerceOrderSchema.index({ seller: 1, createdAt: -1 });
CommerceOrderSchema.index({ status: 1, paymentDeadline: 1 });
CommerceOrderSchema.index({ status: 1, releaseAfter: 1 });
CommerceOrderSchema.index(
  { paymentIntentId: 1 },
  { unique: true, sparse: true },
);

// One immutable installment per guarantee top-up. No reusable internal wallet.
@Schema({ timestamps: true })
export class BidDeposit {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Product", required: true })
  product: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true })
  buyer: Types.ObjectId;
  @Prop({ required: true }) amount: number;
  @Prop({ required: true }) maximum: number;
  @Prop({ required: true, unique: true }) attempt: string;
  @Prop({ required: true }) startedAt: Date;
  @Prop() paymentIntentId?: string;
  @Prop() chargeId?: string;
  @Prop({ default: "pending" }) status: string;
  @Prop({ default: 0 }) creditAmount: number;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "CommerceOrder" })
  order?: Types.ObjectId;
  @Prop({ default: 0 }) refundedAmount: number;
  @Prop({ default: 0 }) refundTarget: number;
  @Prop() refundStartedAt?: Date;
  @Prop() refundRequestedTotal?: number;
  @Prop() refundRequestAmount?: number;
  @Prop() refundId?: string;
  @Prop() reviewCode?: string;
  @Prop({ default: () => new Date() }) nextCheckAt: Date;
}
export type BidDepositDocument = HydratedDocument<BidDeposit>;
export const BidDepositSchema = SchemaFactory.createForClass(BidDeposit);
BidDepositSchema.index({ product: 1, buyer: 1 });
BidDepositSchema.index({ status: 1, nextCheckAt: 1 });
BidDepositSchema.index({ paymentIntentId: 1 }, { unique: true, sparse: true });

// Persist only routing identifiers, never the raw Stripe event/identity payload.
@Schema({ timestamps: true })
export class StripeInbox {
  @Prop({ required: true, unique: true }) eventId: string;
  @Prop({ required: true }) type: string;
  @Prop({ required: true }) objectId: string;
  @Prop({ default: "pending" }) status: string;
  @Prop({ default: 0 }) attempts: number;
  @Prop({ default: () => new Date() }) nextAttemptAt: Date;
}
export const StripeInboxSchema = SchemaFactory.createForClass(StripeInbox);
StripeInboxSchema.index({ status: 1, nextAttemptAt: 1 });

@Schema({ versionKey: false })
export class CommerceLock {
  @Prop({ required: true, unique: true }) key: string;
  @Prop({ required: true }) owner: string;
  @Prop({ required: true }) expiresAt: Date;
}
export const CommerceLockSchema = SchemaFactory.createForClass(CommerceLock);
CommerceLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
