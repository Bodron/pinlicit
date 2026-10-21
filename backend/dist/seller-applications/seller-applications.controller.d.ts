import { CreateSellerApplicationDto } from "./dto/create-seller-application.dto";
import { SellerApplicationsService } from "./seller-applications.service";
export declare class SellerApplicationsController {
    private readonly applicationsService;
    constructor(applicationsService: SellerApplicationsService);
    create(user: any, dto: CreateSellerApplicationDto): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/seller-application.schema").SellerApplication, {}, {}> & import("./schemas/seller-application.schema").SellerApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/seller-application.schema").SellerApplication, {}, {}> & import("./schemas/seller-application.schema").SellerApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    mine(user: any): import("mongoose").Query<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/seller-application.schema").SellerApplication, {}, {}> & import("./schemas/seller-application.schema").SellerApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/seller-application.schema").SellerApplication, {}, {}> & import("./schemas/seller-application.schema").SellerApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[], import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/seller-application.schema").SellerApplication, {}, {}> & import("./schemas/seller-application.schema").SellerApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/seller-application.schema").SellerApplication, {}, {}> & import("./schemas/seller-application.schema").SellerApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>, {}, import("mongoose").Document<unknown, {}, import("./schemas/seller-application.schema").SellerApplication, {}, {}> & import("./schemas/seller-application.schema").SellerApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "find", {}>;
}
