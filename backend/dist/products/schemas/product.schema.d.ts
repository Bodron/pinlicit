import { HydratedDocument, Types, Schema as MongooseSchema } from "mongoose";
export type ProductDocument = HydratedDocument<Product>;
export declare enum ProductStatus {
    Active = "active",
    Reserved = "reserved",
    Sold = "sold",
    Hidden = "hidden",
    Expired = "expired"
}
export declare class Product {
    seller: Types.ObjectId;
    reservedAt?: Date;
    commerceVersion?: number;
    reservedBy?: Types.ObjectId;
    category: Types.ObjectId;
    title: string;
    description: string;
    imageKey?: string;
    imageUrl?: string;
    thumbnailUrl?: string;
    imageVariants: import("../../uploads/image-policy").ImageVariant[];
    status: ProductStatus;
    startingPrice: number;
    reservePrice?: number;
    currentPrice: number;
    minBidIncrement: number;
    buyNowPrice: number;
    favoriteCount: number;
    startsAt: Date;
    endsAt: Date;
    highestBid?: Types.ObjectId;
}
export declare const ProductSchema: MongooseSchema<Product, import("mongoose").Model<Product, any, any, any, import("mongoose").Document<unknown, any, Product, any, {}> & Product & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Product, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Product>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Product> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
