import { Model } from "mongoose";
import Stripe = require("stripe");
import { CommerceAccountDocument } from "./commerce.schemas";
import { UserDocument } from "../users/schemas/user.schema";
import { CommerceLockService } from "./commerce-lock.service";
import { StripeClientService } from "./stripe-client.service";
export declare class CommerceAccountsService {
    private readonly accounts;
    private readonly stripe;
    private readonly locks;
    private readonly users;
    constructor(accounts: Model<CommerceAccountDocument>, stripe: StripeClientService, locks: CommerceLockService, users: Model<UserDocument>);
    ready(): Promise<void>;
    private profile;
    refreshStatus(userId: string): Promise<{
        identity: {
            status: string;
            verifiedAt: Date;
            errorCode: string;
        };
        sellerPayments: {
            connected: boolean;
            detailsSubmitted: boolean;
            transfersEnabled: boolean;
            payoutsEnabled: boolean;
        };
        mode: string;
        enabled: boolean;
    }>;
    status(userId: string): Promise<{
        identity: {
            status: string;
            verifiedAt: Date;
            errorCode: string;
        };
        sellerPayments: {
            connected: boolean;
            detailsSubmitted: boolean;
            transfersEnabled: boolean;
            payoutsEnabled: boolean;
        };
        mode: string;
        enabled: boolean;
    }>;
    startIdentity(userId: string): Promise<{
        status: "processing" | "verified" | import("stripe/cjs/shared").OtherString;
        url?: undefined;
    } | {
        status: import("stripe/cjs/resources/Identity").VerificationSession.Status;
        url: string;
    }>;
    startConnect(user: {
        _id: unknown;
        role: string;
        email: string;
    }): Promise<{
        url: string;
        expiresAt: number;
    }>;
    refreshIdentity(id: string): Promise<void>;
    refreshConnect(id: string): Promise<void>;
    private requireFreshAttempt;
    applyIdentity(session: Stripe.Identity.VerificationSession): Promise<void>;
    applyConnect(account: Stripe.Account): Promise<void>;
    requireBuyer(userId: string): Promise<void>;
    requireSeller(userId: string): Promise<string>;
}
