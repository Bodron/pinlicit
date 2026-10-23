import { BidDepositsService } from "../commerce/bid-deposits.service";
import { ConfigService } from "@nestjs/config";
import { CommerceAccountsService } from "../commerce/commerce-accounts.service";
import { Model, Types } from "mongoose";
import { AuctionsGateway } from "../auctions/auctions.gateway";
import { ProductsService } from "../products/products.service";
import { Bid, BidDocument } from "./schemas/bid.schema";
export declare class BidsService {
    private readonly bidModel;
    private readonly productsService;
    private readonly config;
    private readonly auctionsGateway;
    private readonly commerceAccounts?;
    private readonly deposits?;
    constructor(bidModel: Model<BidDocument>, productsService: ProductsService, config: ConfigService, auctionsGateway: AuctionsGateway, commerceAccounts?: CommerceAccountsService, deposits?: BidDepositsService);
    private validateBid;
    placeBid(productId: string, bidderId: string, maxAmount: number): Promise<{
        product: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("../products/schemas/product.schema").Product, {}, {}> & import("../products/schemas/product.schema").Product & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("../products/schemas/product.schema").Product, {}, {}> & import("../products/schemas/product.schema").Product & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: Types.ObjectId;
        }>;
        bid: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Bid, {}, {}> & Bid & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, Bid, {}, {}> & Bid & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: Types.ObjectId;
        }>;
        extended: boolean;
    }>;
    private publicAmount;
    placeBidLegacy(productId: string, bidderId: string, amount: number): Promise<{
        product: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("../products/schemas/product.schema").Product, {}, {}> & import("../products/schemas/product.schema").Product & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("../products/schemas/product.schema").Product, {}, {}> & import("../products/schemas/product.schema").Product & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: Types.ObjectId;
        }>;
        bid: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Bid, {}, {}> & Bid & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, Bid, {}, {}> & Bid & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: Types.ObjectId;
        }>;
        extended: boolean;
    }>;
    private unusedLegacyMarker;
    latestForProduct(productId: string, limit?: number): import("mongoose").Query<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Bid, {}, {}> & Bid & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, Bid, {}, {}> & Bid & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: Types.ObjectId;
    }>)[], import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Bid, {}, {}> & Bid & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, Bid, {}, {}> & Bid & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: Types.ObjectId;
    }>, {}, import("mongoose").Document<unknown, {}, Bid, {}, {}> & Bid & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "find", {}>;
    mine(userId: string): import("mongoose").Query<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Bid, {}, {}> & Bid & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, Bid, {}, {}> & Bid & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: Types.ObjectId;
    }>)[], import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Bid, {}, {}> & Bid & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, Bid, {}, {}> & Bid & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: Types.ObjectId;
    }>, {}, import("mongoose").Document<unknown, {}, Bid, {}, {}> & Bid & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "find", {}>;
}
