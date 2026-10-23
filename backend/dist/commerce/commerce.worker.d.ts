import { BidDepositsService } from "./bid-deposits.service";
import { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Model } from "mongoose";
import Stripe = require("stripe");
import { BidDocument } from "../bids/schemas/bid.schema";
import { ProductDocument } from "../products/schemas/product.schema";
import { CommerceOrderDocument, StripeInbox } from "./commerce.schemas";
import { CommerceAccountsService } from "./commerce-accounts.service";
import { CommerceOrdersService } from "./commerce-orders.service";
import { StripeClientService } from "./stripe-client.service";
import { CommerceLockService } from "./commerce-lock.service";
export declare class CommerceWorker implements OnModuleInit, OnModuleDestroy {
    private readonly inbox;
    private readonly products;
    private readonly bids;
    private readonly orders;
    private readonly stripe;
    private readonly accounts;
    private readonly payments;
    private readonly locks;
    private readonly deposits;
    private timer?;
    private running;
    constructor(inbox: Model<StripeInbox>, products: Model<ProductDocument>, bids: Model<BidDocument>, orders: Model<CommerceOrderDocument>, stripe: StripeClientService, accounts: CommerceAccountsService, payments: CommerceOrdersService, locks: CommerceLockService, deposits: BidDepositsService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): void;
    enqueue(event: Stripe.Event): Promise<{
        received: boolean;
    }>;
    tick(): Promise<void>;
    private processInbox;
    private finalizeAuctions;
}
