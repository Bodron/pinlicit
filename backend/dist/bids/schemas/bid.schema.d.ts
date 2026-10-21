import { HydratedDocument, Types } from "mongoose";
export type BidDocument = HydratedDocument<Bid>;
export declare class Bid {
    product: Types.ObjectId;
    bidder: Types.ObjectId;
    maxAmount: number;
    amount: number;
}
export declare const BidSchema: import("mongoose").Schema<Bid, import("mongoose").Model<Bid, any, any, any, import("mongoose").Document<unknown, any, Bid, any, {}> & Bid & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Bid, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Bid>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Bid> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
