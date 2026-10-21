import { HydratedDocument, Types } from "mongoose";
export type FavoriteDocument = HydratedDocument<Favorite>;
export declare class Favorite {
    user: Types.ObjectId;
    product: Types.ObjectId;
}
export declare const FavoriteSchema: import("mongoose").Schema<Favorite, import("mongoose").Model<Favorite, any, any, any, import("mongoose").Document<unknown, any, Favorite, any, {}> & Favorite & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Favorite, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Favorite>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Favorite> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
