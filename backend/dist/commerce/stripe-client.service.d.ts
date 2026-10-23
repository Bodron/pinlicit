import { ConfigService } from "@nestjs/config";
import Stripe = require("stripe");
export declare class StripeClientService {
    private readonly config;
    private client?;
    constructor(config: ConfigService);
    get enabled(): boolean;
    assertSecureAuth(): void;
    get transfersEnabled(): boolean;
    get sdk(): Stripe;
    setting(name: string, min: number, max: number): number;
    returnUrl(name: string): string;
    event(body: Buffer, signature: string, connected?: boolean): Stripe.Event;
}
