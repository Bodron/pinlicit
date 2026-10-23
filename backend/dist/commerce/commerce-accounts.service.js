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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommerceAccountsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const crypto_1 = require("crypto");
const mongoose_2 = require("mongoose");
const commerce_schemas_1 = require("./commerce.schemas");
const user_schema_1 = require("../users/schemas/user.schema");
const commerce_lock_service_1 = require("./commerce-lock.service");
const stripe_client_service_1 = require("./stripe-client.service");
let CommerceAccountsService = class CommerceAccountsService {
    constructor(accounts, stripe, locks, users) {
        this.accounts = accounts;
        this.stripe = stripe;
        this.locks = locks;
        this.users = users;
    }
    async ready() {
        await this.accounts.init();
    }
    profile(userId) {
        return this.accounts.findOneAndUpdate({ user: userId }, { $setOnInsert: { user: userId } }, { upsert: true, new: true });
    }
    async status(userId) {
        const profile = await this.accounts.findOne({ user: userId }).lean();
        return {
            identity: {
                status: profile?.identityStatus || "unverified",
                verifiedAt: profile?.verifiedAt,
                errorCode: profile?.identityErrorCode,
            },
            sellerPayments: {
                connected: Boolean(profile?.connectedAccountId),
                detailsSubmitted: profile?.detailsSubmitted || false,
                transfersEnabled: profile?.transfersEnabled || false,
                payoutsEnabled: profile?.payoutsEnabled || false,
            },
            mode: "test",
            enabled: this.stripe.enabled,
        };
    }
    async startIdentity(userId) {
        const sdk = this.stripe.sdk;
        const returnUrl = this.stripe.returnUrl("STRIPE_IDENTITY_RETURN_URL");
        return this.locks.run(`identity:${userId}`, async () => {
            const profile = await this.profile(userId);
            let session;
            if (profile.verificationSessionId) {
                session = await sdk.identity.verificationSessions.retrieve(profile.verificationSessionId);
                await this.applyIdentity(session);
                if (session.status === "verified" || session.status === "processing")
                    return { status: session.status };
                if (session.status === "canceled" || session.redaction?.status) {
                    throw new common_1.ConflictException("Verification needs support review before a new attempt.");
                }
            }
            else {
                if (!profile.identityAttempt) {
                    profile.identityAttempt = (0, crypto_1.randomUUID)();
                    profile.identityAttemptAt = new Date();
                    await profile.save();
                }
                this.requireFreshAttempt(profile.identityAttemptAt);
                session = await sdk.identity.verificationSessions.create({
                    type: "document",
                    options: {
                        document: {
                            allowed_types: ["id_card", "passport"],
                            require_matching_selfie: true,
                        },
                    },
                    return_url: returnUrl,
                    metadata: {
                        profileId: String(profile._id),
                        attempt: profile.identityAttempt,
                    },
                }, { idempotencyKey: `identity:${profile.identityAttempt}` });
                profile.verificationSessionId = session.id;
                profile.identityStatus = session.status;
                await profile.save();
            }
            return { status: session.status, url: session.url };
        });
    }
    async startConnect(user) {
        if (!["seller", "admin"].includes(user.role))
            throw new common_1.ForbiddenException("Seller approval is required.");
        const sdk = this.stripe.sdk;
        const refreshUrl = this.stripe.returnUrl("STRIPE_CONNECT_REFRESH_URL");
        const returnUrl = this.stripe.returnUrl("STRIPE_CONNECT_RETURN_URL");
        return this.locks.run(`connect:${user._id}`, async () => {
            const profile = await this.profile(String(user._id));
            if (profile.identityStatus !== "verified")
                throw new common_1.ForbiddenException("Verify your identity first.");
            if (!profile.connectedAccountId) {
                if (!profile.connectAttempt) {
                    profile.connectAttempt = (0, crypto_1.randomUUID)();
                    profile.connectAttemptAt = new Date();
                    await profile.save();
                }
                this.requireFreshAttempt(profile.connectAttemptAt);
                const account = await sdk.accounts.create({
                    type: "express",
                    country: "RO",
                    email: user.email,
                    capabilities: { transfers: { requested: true } },
                    metadata: {
                        profileId: String(profile._id),
                        attempt: profile.connectAttempt,
                    },
                }, { idempotencyKey: `connect:${profile.connectAttempt}` });
                profile.connectedAccountId = account.id;
                await profile.save();
            }
            const account = await sdk.accounts.retrieve(profile.connectedAccountId);
            await this.applyConnect(account);
            const link = await sdk.accountLinks.create({
                account: profile.connectedAccountId,
                type: "account_onboarding",
                return_url: returnUrl,
                refresh_url: refreshUrl,
            });
            return { url: link.url, expiresAt: link.expires_at };
        });
    }
    async refreshIdentity(id) {
        const session = await this.stripe.sdk.identity.verificationSessions.retrieve(id);
        const profile = await this.accounts.findOne({
            $or: [
                { verificationSessionId: id },
                ...(session.metadata?.profileId && session.metadata?.attempt
                    ? [
                        {
                            _id: session.metadata.profileId,
                            identityAttempt: session.metadata.attempt,
                        },
                    ]
                    : []),
            ],
        });
        if (!profile)
            return;
        return this.locks.run(`identity:${profile.user}`, async () => {
            await this.applyIdentity(await this.stripe.sdk.identity.verificationSessions.retrieve(id));
        });
    }
    async refreshConnect(id) {
        const account = await this.stripe.sdk.accounts.retrieve(id);
        const profile = await this.accounts.findOne({
            $or: [
                { connectedAccountId: id },
                ...(account.metadata?.profileId && account.metadata?.attempt
                    ? [
                        {
                            _id: account.metadata.profileId,
                            connectAttempt: account.metadata.attempt,
                        },
                    ]
                    : []),
            ],
        });
        if (!profile)
            return;
        return this.locks.run(`connect:${profile.user}`, async () => {
            await this.applyConnect(await this.stripe.sdk.accounts.retrieve(id));
        });
    }
    requireFreshAttempt(startedAt) {
        if (!startedAt ||
            Date.now() - new Date(startedAt).getTime() >= 20 * 3600000) {
            throw new common_1.ConflictException("Unresolved Stripe creation requires reconciliation. No duplicate will be created.");
        }
    }
    async applyIdentity(session) {
        const profile = await this.accounts.findOne({
            $or: [
                { verificationSessionId: session.id },
                ...(session.metadata?.profileId && session.metadata?.attempt
                    ? [
                        {
                            _id: session.metadata.profileId,
                            identityAttempt: session.metadata.attempt,
                        },
                    ]
                    : []),
            ],
        });
        if (!profile)
            return;
        const valid = session.options?.document?.require_matching_selfie === true;
        const redacted = Boolean(session.redaction?.status);
        const status = !valid || redacted ? "unverified" : session.status;
        await this.accounts.updateOne({ _id: profile._id, identityAttempt: profile.identityAttempt }, {
            $set: {
                verificationSessionId: session.id,
                identityStatus: status,
                identityErrorCode: session.last_error?.code || null,
                verifiedAt: status === "verified" ? profile.verifiedAt || new Date() : null,
            },
        });
    }
    async applyConnect(account) {
        const profile = await this.accounts.findOne({
            $or: [
                { connectedAccountId: account.id },
                ...(account.metadata?.profileId && account.metadata?.attempt
                    ? [
                        {
                            _id: account.metadata.profileId,
                            connectAttempt: account.metadata.attempt,
                        },
                    ]
                    : []),
            ],
        });
        if (!profile)
            return;
        await this.accounts.updateOne({ _id: profile._id, connectAttempt: profile.connectAttempt }, {
            $set: {
                connectedAccountId: account.id,
                transfersEnabled: account.capabilities?.transfers === "active",
                payoutsEnabled: account.payouts_enabled === true,
                detailsSubmitted: account.details_submitted === true,
            },
        });
    }
    async requireBuyer(userId) {
        if (!(await this.accounts.exists({
            user: userId,
            identityStatus: "verified",
        })))
            throw new common_1.ForbiddenException("Identity verification is required before payment.");
    }
    async requireSeller(userId) {
        if (!(await this.users.exists({
            _id: userId,
            blocked: false,
            role: { $in: ["seller", "admin"] },
        }))) {
            throw new common_1.ForbiddenException("Seller account is not eligible for transfers.");
        }
        const profile = await this.accounts.findOne({
            user: userId,
            identityStatus: "verified",
            transfersEnabled: true,
            payoutsEnabled: true,
        });
        if (!profile?.connectedAccountId)
            throw new common_1.ConflictException("Seller payment onboarding is incomplete.");
        const account = await this.stripe.sdk.accounts.retrieve(profile.connectedAccountId);
        await this.applyConnect(account);
        if (account.capabilities?.transfers !== "active" ||
            !account.payouts_enabled)
            throw new common_1.ConflictException("Seller cannot receive funds currently.");
        return profile.connectedAccountId;
    }
};
exports.CommerceAccountsService = CommerceAccountsService;
exports.CommerceAccountsService = CommerceAccountsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(commerce_schemas_1.CommerceAccount.name)),
    __param(3, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        stripe_client_service_1.StripeClientService,
        commerce_lock_service_1.CommerceLockService,
        mongoose_2.Model])
], CommerceAccountsService);
//# sourceMappingURL=commerce-accounts.service.js.map