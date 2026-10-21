import { ProductsService } from "../products/products.service";
import { SellerApplicationsService } from "../seller-applications/seller-applications.service";
import { UsersService } from "../users/users.service";
export declare class AdminController {
    private readonly applicationsService;
    private readonly productsService;
    private readonly usersService;
    constructor(applicationsService: SellerApplicationsService, productsService: ProductsService, usersService: UsersService);
    sellerApplications(): import("mongoose").Query<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("../seller-applications/schemas/seller-application.schema").SellerApplication, {}, {}> & import("../seller-applications/schemas/seller-application.schema").SellerApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, import("../seller-applications/schemas/seller-application.schema").SellerApplication, {}, {}> & import("../seller-applications/schemas/seller-application.schema").SellerApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[], import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("../seller-applications/schemas/seller-application.schema").SellerApplication, {}, {}> & import("../seller-applications/schemas/seller-application.schema").SellerApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, import("../seller-applications/schemas/seller-application.schema").SellerApplication, {}, {}> & import("../seller-applications/schemas/seller-application.schema").SellerApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>, {}, import("mongoose").Document<unknown, {}, import("../seller-applications/schemas/seller-application.schema").SellerApplication, {}, {}> & import("../seller-applications/schemas/seller-application.schema").SellerApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "find", {}>;
    approveSeller(id: string, admin: any): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("../seller-applications/schemas/seller-application.schema").SellerApplication, {}, {}> & import("../seller-applications/schemas/seller-application.schema").SellerApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, import("../seller-applications/schemas/seller-application.schema").SellerApplication, {}, {}> & import("../seller-applications/schemas/seller-application.schema").SellerApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    rejectSeller(id: string, admin: any): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("../seller-applications/schemas/seller-application.schema").SellerApplication, {}, {}> & import("../seller-applications/schemas/seller-application.schema").SellerApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, import("../seller-applications/schemas/seller-application.schema").SellerApplication, {}, {}> & import("../seller-applications/schemas/seller-application.schema").SellerApplication & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    hideProduct(id: string): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("../products/schemas/product.schema").Product, {}, {}> & import("../products/schemas/product.schema").Product & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, import("../products/schemas/product.schema").Product, {}, {}> & import("../products/schemas/product.schema").Product & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    blockUser(id: string, blocked?: boolean): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("../users/schemas/user.schema").User, {}, {}> & import("../users/schemas/user.schema").User & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, import("../users/schemas/user.schema").User, {}, {}> & import("../users/schemas/user.schema").User & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
}
