import { HydratedDocument } from "mongoose";
export type UserDocument = HydratedDocument<User>;
export declare enum UserRole {
    User = "user",
    Seller = "seller",
    Admin = "admin"
}
export declare class User {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    blocked: boolean;
    phone?: string;
}
export declare const UserSchema: import("mongoose").Schema<User, import("mongoose").Model<User, any, any, any, import("mongoose").Document<unknown, any, User, any, {}> & User & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, User, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<User>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<User> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
