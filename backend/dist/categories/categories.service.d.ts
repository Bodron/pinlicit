import { OnModuleInit } from "@nestjs/common";
import { Model } from "mongoose";
import { Category, CategoryDocument } from "./schemas/category.schema";
export declare class CategoriesService implements OnModuleInit {
    private readonly categoryModel;
    constructor(categoryModel: Model<CategoryDocument>);
    onModuleInit(): Promise<void>;
    list(): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Category, {}, {}> & Category & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, Category, {}, {}> & Category & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[]>;
    ensureDefaults(): Promise<void>;
}
