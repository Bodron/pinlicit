import { ConfigService } from "@nestjs/config";
import Stripe = require("stripe");
export declare class StripeClientService {
    private readonly config;
    private client?;
    constructor(config: ConfigService);
    get enabled(): boolean;
    mobileConfig(): {
        enabled: boolean;
        ready: boolean;
        mode: string;
        deferredSellerOnboarding: boolean;
        publishableKey: string;
        merchantDisplayName: string;
        guaranteeBps: number;
        minimumGuaranteePayment: number;
        minimumOrderPayment: number;
        minimumBidMaximum: number;
    };
    assertSecureAuth(): void;
    get transfersEnabled(): boolean;
    get sdk(): Stripe;
    setting(name: string, min: number, max: number): number;
    returnUrl(name: string): string;
    event(body: Buffer, signature: string, connected?: boolean): Stripe.Event;
}
