import { BidDocument } from "../bids/schemas/bid.schema";
import { ClientSession, Model } from "mongoose";
import Stripe = require("stripe");
import { BidDeposit, BidDepositDocument, CommerceOrder, CommerceOrderDocument } from "./commerce.schemas";
import { ProductDocument } from "../products/schemas/product.schema";
import { StripeClientService } from "./stripe-client.service";
import { CommerceAccountsService } from "./commerce-accounts.service";
import { CommerceLockService } from "./commerce-lock.service";
export declare function requiredDeposit(maximum: number): number;
export declare class BidDepositsService {
    private readonly deposits;
    private readonly orders;
    private readonly products;
    private readonly stripe;
    private readonly accounts;
    private readonly locks;
    private readonly bids;
    constructor(deposits: Model<BidDepositDocument>, orders: Model<CommerceOrderDocument>, products: Model<ProductDocument>, stripe: StripeClientService, accounts: CommerceAccountsService, locks: CommerceLockService, bids: Model<BidDocument>);
    ready(): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, BidDeposit, {}, {}> & BidDeposit & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, BidDeposit, {}, {}> & BidDeposit & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    mine(buyer: string): Promise<{
        id: string;
        productId: string;
        amount: number;
        maximum: number;
        status: string;
        credited: number;
        refunded: number;
    }[]>;
    require(product: string, buyer: string, maximum: number, session?: ClientSession): Promise<void>;
    activate(productId: string, seller: string): Promise<{
        activated: boolean;
    }>;
    cancelPending(product: string, buyer: string): Promise<{
        status: string;
    }>;
    payment(productId: string, buyer: string, maximum: number): Promise<{
        clientSecret: string;
        amount: number;
        required: number;
        status: string;
    } | {
        status: string;
        amount: number;
        required: number;
        clientSecret?: undefined;
    }>;
    private intent;
    syncIntent(intent: Stripe.PaymentIntent): Promise<boolean>;
    allocate(order: CommerceOrderDocument): Promise<import("mongoose").Document<unknown, {}, CommerceOrder, {}, {}> & CommerceOrder & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    reconcileOrder(order: CommerceOrderDocument): Promise<void>;
    syncCharge(charge: Stripe.Charge): Promise<boolean>;
    maintain(): Promise<void>;
}
