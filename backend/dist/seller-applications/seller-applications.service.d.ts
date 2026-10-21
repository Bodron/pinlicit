import { Model, Types } from "mongoose";
import { UsersService } from "../users/users.service";
import { CreateSellerApplicationDto } from "./dto/create-seller-application.dto";
import { SellerApplication, SellerApplicationDocument } from "./schemas/seller-application.schema";
export declare class SellerApplicationsService {
    private readonly applicationModel;
    private readonly usersService;
    constructor(applicationModel: Model<SellerApplicationDocument>, usersService: UsersService);
    create(userId: string, dto: CreateSellerApplicationDto): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, SellerApplication, {}, {}> & SellerApplication & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, SellerApplication, {}, {}> & SellerApplication & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: Types.ObjectId;
    }>>;
    findMine(userId: string): import("mongoose").Query<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, SellerApplication, {}, {}> & SellerApplication & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, SellerApplication, {}, {}> & SellerApplication & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: Types.ObjectId;
    }>)[], import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, SellerApplication, {}, {}> & SellerApplication & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, SellerApplication, {}, {}> & SellerApplication & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: Types.ObjectId;
    }>, {}, import("mongoose").Document<unknown, {}, SellerApplication, {}, {}> & SellerApplication & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "find", {}>;
    listPending(): import("mongoose").Query<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, SellerApplication, {}, {}> & SellerApplication & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, SellerApplication, {}, {}> & SellerApplication & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: Types.ObjectId;
    }>)[], import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, SellerApplication, {}, {}> & SellerApplication & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, SellerApplication, {}, {}> & SellerApplication & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: Types.ObjectId;
    }>, {}, import("mongoose").Document<unknown, {}, SellerApplication, {}, {}> & SellerApplication & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "find", {}>;
    approve(applicationId: string, adminId: string): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, SellerApplication, {}, {}> & SellerApplication & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, SellerApplication, {}, {}> & SellerApplication & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: Types.ObjectId;
    }>>;
    reject(applicationId: string, adminId: string): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, SellerApplication, {}, {}> & SellerApplication & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, SellerApplication, {}, {}> & SellerApplication & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: Types.ObjectId;
    }>>;
}
