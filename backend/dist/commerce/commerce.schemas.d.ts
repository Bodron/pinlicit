import { HydratedDocument, Types, Schema as MongooseSchema } from "mongoose";
export declare class CommerceAccount {
    user: Types.ObjectId;
    identityAttempt?: string;
    identityAttemptAt?: Date;
    verificationSessionId?: string;
    identityStatus: string;
    verifiedAt?: Date;
    identityErrorCode?: string;
    connectAttempt?: string;
    connectAttemptAt?: Date;
    connectedAccountId?: string;
    transfersEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
}
export type CommerceAccountDocument = HydratedDocument<CommerceAccount>;
export declare const CommerceAccountSchema: MongooseSchema<CommerceAccount, import("mongoose").Model<CommerceAccount, any, any, any, import("mongoose").Document<unknown, any, CommerceAccount, any, {}> & CommerceAccount & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CommerceAccount, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<CommerceAccount>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<CommerceAccount> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare const orderStates: readonly ["awaiting_payment", "paid", "shipped", "delivered", "transfer_pending", "completed", "payment_expired", "refund_pending", "refunded", "disputed", "review_required"];
export type OrderState = (typeof orderStates)[number];
export declare class CommerceOrder {
    product: Types.ObjectId;
    buyer: Types.ObjectId;
    seller: Types.ObjectId;
    title: string;
    amount: number;
    fee: number;
    sellerAmount: number;
    currency: string;
    feeBps: number;
    status: OrderState;
    paymentDeadline: Date;
    paymentAttempt: string;
    paymentIntentId?: string;
    paymentStartedAt?: Date;
    nextCheckAt: Date;
    chargeId?: string;
    connectedAccountId?: string;
    transferId?: string;
    transferStartedAt?: Date;
    refundedAmount: number;
    carrier?: string;
    trackingCode?: string;
    deliveredAt?: Date;
    fundsReviewAt?: Date;
    releaseAfter?: Date;
    issueOpen: boolean;
    issueCode?: string;
    reviewCode?: string;
    refundReason?: string;
    refundRequestedBy?: Types.ObjectId;
}
export type CommerceOrderDocument = HydratedDocument<CommerceOrder>;
export declare const CommerceOrderSchema: MongooseSchema<CommerceOrder, import("mongoose").Model<CommerceOrder, any, any, any, import("mongoose").Document<unknown, any, CommerceOrder, any, {}> & CommerceOrder & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CommerceOrder, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<CommerceOrder>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<CommerceOrder> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class StripeInbox {
    eventId: string;
    type: string;
    objectId: string;
    status: string;
    attempts: number;
    nextAttemptAt: Date;
}
export declare const StripeInboxSchema: MongooseSchema<StripeInbox, import("mongoose").Model<StripeInbox, any, any, any, import("mongoose").Document<unknown, any, StripeInbox, any, {}> & StripeInbox & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, StripeInbox, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<StripeInbox>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<StripeInbox> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class CommerceLock {
    key: string;
    owner: string;
    expiresAt: Date;
}
export declare const CommerceLockSchema: MongooseSchema<CommerceLock, import("mongoose").Model<CommerceLock, any, any, any, import("mongoose").Document<unknown, any, CommerceLock, any, {}> & CommerceLock & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CommerceLock, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<CommerceLock>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<CommerceLock> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
