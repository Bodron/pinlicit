import { ConfigService } from "@nestjs/config";
import { Model, Types } from "mongoose";
import { AuctionsGateway } from "../auctions/auctions.gateway";
import { ProductsService } from "../products/products.service";
import { Bid, BidDocument } from "./schemas/bid.schema";
export declare class BidsService {
    private readonly bidModel;
    private readonly productsService;
    private readonly config;
    private readonly auctionsGateway;
    constructor(bidModel: Model<BidDocument>, productsService: ProductsService, config: ConfigService, auctionsGateway: AuctionsGateway);
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
        bid: Omit<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Bid, {}, {}> & Bid & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, Bid, {}, {}> & Bid & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: Types.ObjectId;
        }>, never>;
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
        bid: Omit<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Bid, {}, {}> & Bid & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, Bid, {}, {}> & Bid & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: Types.ObjectId;
        }>, never>;
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
