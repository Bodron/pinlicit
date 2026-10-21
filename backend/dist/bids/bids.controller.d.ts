import { BidsService } from "./bids.service";
export declare class BidsController {
    private readonly bidsService;
    constructor(bidsService: BidsService);
    mine(user: any): import("mongoose").Query<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/bid.schema").Bid, {}, {}> & import("./schemas/bid.schema").Bid & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/bid.schema").Bid, {}, {}> & import("./schemas/bid.schema").Bid & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[], import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/bid.schema").Bid, {}, {}> & import("./schemas/bid.schema").Bid & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/bid.schema").Bid, {}, {}> & import("./schemas/bid.schema").Bid & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>, {}, import("mongoose").Document<unknown, {}, import("./schemas/bid.schema").Bid, {}, {}> & import("./schemas/bid.schema").Bid & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "find", {}>;
}
