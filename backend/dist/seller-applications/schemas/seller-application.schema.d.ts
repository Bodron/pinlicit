import { HydratedDocument, Types } from "mongoose";
export type SellerApplicationDocument = HydratedDocument<SellerApplication>;
export declare enum SellerApplicationStatus {
    Pending = "pending",
    Approved = "approved",
    Rejected = "rejected"
}
export declare class SellerApplication {
    user: Types.ObjectId;
    displayName: string;
    contactPhone: string;
    notes?: string;
    status: SellerApplicationStatus;
    reviewedBy?: Types.ObjectId;
    reviewedAt?: Date;
}
export declare const SellerApplicationSchema: import("mongoose").Schema<SellerApplication, import("mongoose").Model<SellerApplication, any, any, any, import("mongoose").Document<unknown, any, SellerApplication, any, {}> & SellerApplication & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, SellerApplication, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<SellerApplication>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<SellerApplication> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
