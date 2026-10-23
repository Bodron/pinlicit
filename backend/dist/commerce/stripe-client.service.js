"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeClientService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const Stripe = require("stripe");
let StripeClientService = class StripeClientService {
    constructor(config) {
        this.config = config;
    }
    get enabled() {
        return this.config.get("STRIPE_ENABLED") === "true";
    }
    mobileConfig() {
        const key = this.config.get("STRIPE_PUBLISHABLE_KEY") || "";
        return {
            enabled: this.enabled,
            ready: this.enabled && /^pk_test_/.test(key),
            mode: "test",
            deferredSellerOnboarding: true,
            publishableKey: /^pk_test_/.test(key) ? key : null,
            merchantDisplayName: "Pinbind",
            guaranteeBps: 1000,
            minimumGuaranteePayment: 300,
            minimumBidMaximum: 3000,
        };
    }
    assertSecureAuth() {
        const secret = this.config.get("JWT_SECRET") || "";
        if (secret.length < 32 || secret === "dev-secret") {
            throw new common_1.ServiceUnavailableException("A strong JWT_SECRET is required before enabling Stripe.");
        }
    }
    get transfersEnabled() {
        return (this.config.get("STRIPE_AUTOMATIC_TRANSFERS_ENABLED") === "true");
    }
    get sdk() {
        const key = this.config.get("STRIPE_SECRET_KEY") || "";
        if (!this.enabled || !/^(sk|rk)_test_/.test(key)) {
            throw new common_1.ServiceUnavailableException("Stripe sandbox is not configured.");
        }
        return (this.client ??= new Stripe(key, {
            maxNetworkRetries: 2,
            timeout: 10000,
        }));
    }
    setting(name, min, max) {
        const value = this.config.get(name);
        if (value === undefined || value === "" || !/^\d+$/.test(String(value))) {
            throw new common_1.ServiceUnavailableException(`Missing Stripe policy: ${name}.`);
        }
        const parsed = Number(value);
        if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
            throw new common_1.ServiceUnavailableException(`Invalid Stripe policy: ${name}.`);
        }
        return parsed;
    }
    returnUrl(name) {
        const value = this.config.get(name);
        try {
            const url = new URL(value);
            if (url.username ||
                url.password ||
                url.hash ||
                !(url.protocol === "https:" ||
                    (url.protocol === "http:" &&
                        ["localhost", "127.0.0.1"].includes(url.hostname))))
                throw new Error();
            return url.toString();
        }
        catch {
            throw new common_1.ServiceUnavailableException(`Invalid Stripe return URL: ${name}.`);
        }
    }
    event(body, signature, connected = false) {
        const secret = this.config.get(connected ? "STRIPE_CONNECT_WEBHOOK_SECRET" : "STRIPE_WEBHOOK_SECRET");
        if (!secret)
            throw new common_1.ServiceUnavailableException("Stripe webhook is not configured.");
        if (!body || !signature)
            throw new common_1.BadRequestException("Invalid Stripe signature.");
        try {
            const event = this.sdk.webhooks.constructEvent(body, signature, secret);
            if (event.livemode ||
                (connected
                    ? event.type !== "account.updated" ||
                        event.account !== event.data.object.id
                    : Boolean(event.account)))
                throw new Error();
            return event;
        }
        catch {
            throw new common_1.BadRequestException("Invalid Stripe event.");
        }
    }
};
exports.StripeClientService = StripeClientService;
exports.StripeClientService = StripeClientService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StripeClientService);
//# sourceMappingURL=stripe-client.service.js.map