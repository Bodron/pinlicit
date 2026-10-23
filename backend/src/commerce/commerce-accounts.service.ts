import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Model } from "mongoose";
import Stripe = require("stripe");
import { CommerceAccount, CommerceAccountDocument } from "./commerce.schemas";
import { User, UserDocument } from "../users/schemas/user.schema";
import { CommerceLockService } from "./commerce-lock.service";
import { StripeClientService } from "./stripe-client.service";

@Injectable()
export class CommerceAccountsService {
  constructor(
    @InjectModel(CommerceAccount.name)
    private readonly accounts: Model<CommerceAccountDocument>,
    private readonly stripe: StripeClientService,
    private readonly locks: CommerceLockService,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
  ) {}
  async ready() {
    await this.accounts.init();
  }
  private profile(userId: string) {
    return this.accounts.findOneAndUpdate(
      { user: userId },
      { $setOnInsert: { user: userId } },
      { upsert: true, new: true },
    );
  }
  async refreshStatus(userId: string) {
    if (this.stripe.enabled) {
      const profile = await this.accounts.findOne({ user: userId });
      if (profile?.verificationSessionId)
        await this.refreshIdentity(profile.verificationSessionId);
      if (profile?.connectedAccountId)
        await this.refreshConnect(profile.connectedAccountId);
    }
    return this.status(userId);
  }
  async status(userId: string) {
    const profile = await this.accounts.findOne({ user: userId }).lean();
    return {
      identity: {
        status: profile?.identityStatus || "unverified",
        verifiedAt: profile?.verifiedAt,
        errorCode: profile?.identityErrorCode,
      },
      sellerPayments: {
        connected: Boolean(profile?.connectedAccountId),
        businessType: profile?.connectBusinessType || null,
        detailsSubmitted: profile?.detailsSubmitted || false,
        transfersEnabled: profile?.transfersEnabled || false,
        payoutsEnabled: profile?.payoutsEnabled || false,
      },
      mode: "test",
      enabled: this.stripe.enabled,
    };
  }
  async startIdentity(userId: string) {
    const sdk = this.stripe.sdk;
    const returnUrl = this.stripe.returnUrl("STRIPE_IDENTITY_RETURN_URL");
    return this.locks.run(`identity:${userId}`, async () => {
      const profile = await this.profile(userId);
      let session: Stripe.Identity.VerificationSession;
      if (profile.verificationSessionId) {
        session = await sdk.identity.verificationSessions.retrieve(
          profile.verificationSessionId,
        );
        await this.applyIdentity(session);
        if (session.status === "verified" || session.status === "processing")
          return { status: session.status };
        if (session.status === "canceled" || session.redaction?.status) {
          throw new ConflictException(
            "Verification needs support review before a new attempt.",
          );
        }
      } else {
        if (!profile.identityAttempt) {
          profile.identityAttempt = randomUUID();
          profile.identityAttemptAt = new Date();
          await profile.save();
        }
        this.requireFreshAttempt(profile.identityAttemptAt);
        session = await sdk.identity.verificationSessions.create(
          {
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
          },
          { idempotencyKey: `identity:${profile.identityAttempt}` },
        );
        profile.verificationSessionId = session.id;
        profile.identityStatus = session.status;
        await profile.save();
      }
      // This URL is only for the current authenticated user; never persisted.
      return { status: session.status, url: session.url };
    });
  }
  async startConnect(
    user: { _id: unknown; role: string; email: string },
    businessType: "individual" | "company",
  ) {
    if (!["seller", "admin"].includes(user.role))
      throw new ForbiddenException("Seller approval is required.");
    await this.requireEligibleSeller(String(user._id));
    const sdk = this.stripe.sdk;
    const refreshUrl = this.stripe.returnUrl("STRIPE_CONNECT_REFRESH_URL");
    const returnUrl = new URL(
      this.stripe.returnUrl("STRIPE_CONNECT_RETURN_URL"),
    );
    returnUrl.searchParams.set("flow", "seller");
    return this.locks.run(`connect:${user._id}`, async () => {
      const profile = await this.profile(String(user._id));
      if (!["individual", "company"].includes(businessType))
        throw new ConflictException("Choose individual or company.");
      if (
        profile.connectBusinessType &&
        profile.connectBusinessType !== businessType
      )
        throw new ConflictException(
          "The Stripe account type cannot be changed here. Contact support.",
        );
      if (!profile.connectedAccountId) {
        if (profile.connectAttempt && !profile.connectBusinessType)
          throw new ConflictException(
            "Unresolved Stripe creation requires reconciliation. No duplicate will be created.",
          );
        if (!profile.connectAttempt) {
          profile.connectAttempt = randomUUID();
          profile.connectAttemptAt = new Date();
          profile.connectBusinessType = businessType;
          await profile.save();
        }
        this.requireFreshAttempt(profile.connectAttemptAt);
        const account = await sdk.accounts.create(
          {
            type: "express",
            country: "RO",
            business_type: profile.connectBusinessType as
              | "individual"
              | "company",
            email: user.email,
            capabilities: { transfers: { requested: true } },
            metadata: {
              profileId: String(profile._id),
              attempt: profile.connectAttempt,
            },
          },
          { idempotencyKey: `connect:${profile.connectAttempt}` },
        );
        profile.connectedAccountId = account.id;
        await profile.save();
      }
      const account = await sdk.accounts.retrieve(profile.connectedAccountId);
      if (account.business_type && account.business_type !== businessType)
        throw new ConflictException(
          "The Stripe account type cannot be changed here. Contact support.",
        );
      await this.applyConnect(account);
      const link = await sdk.accountLinks.create({
        account: profile.connectedAccountId,
        type: "account_onboarding",
        return_url: returnUrl.toString(),
        refresh_url: refreshUrl,
      });
      return { url: link.url, expiresAt: link.expires_at };
    });
  }
  async refreshIdentity(id: string) {
    const session =
      await this.stripe.sdk.identity.verificationSessions.retrieve(id);
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
    if (!profile) return;
    return this.locks.run(`identity:${profile.user}`, async () => {
      await this.applyIdentity(
        await this.stripe.sdk.identity.verificationSessions.retrieve(id),
      );
    });
  }
  async refreshConnect(id: string) {
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
    if (!profile) return;
    return this.locks.run(`connect:${profile.user}`, async () => {
      await this.applyConnect(await this.stripe.sdk.accounts.retrieve(id));
    });
  }
  private requireFreshAttempt(startedAt?: Date) {
    if (
      !startedAt ||
      Date.now() - new Date(startedAt).getTime() >= 20 * 3600000
    ) {
      throw new ConflictException(
        "Unresolved Stripe creation requires reconciliation. No duplicate will be created.",
      );
    }
  }
  async applyIdentity(session: Stripe.Identity.VerificationSession) {
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
    if (!profile) return;
    // The configured document+selfie checks must have been used, even if an
    // unrelated VerificationSession was created in the Stripe dashboard.
    const valid = session.options?.document?.require_matching_selfie === true;
    const redacted = Boolean(session.redaction?.status);
    const status = !valid || redacted ? "unverified" : session.status;
    await this.accounts.updateOne(
      { _id: profile._id, identityAttempt: profile.identityAttempt },
      {
        $set: {
          verificationSessionId: session.id,
          identityStatus: status,
          identityErrorCode: session.last_error?.code || null,
          verifiedAt:
            status === "verified" ? profile.verifiedAt || new Date() : null,
        },
      },
    );
  }
  async applyConnect(account: Stripe.Account) {
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
    if (!profile) return;
    await this.accounts.updateOne(
      { _id: profile._id, connectAttempt: profile.connectAttempt },
      {
        $set: {
          connectedAccountId: account.id,
          ...(account.business_type
            ? { connectBusinessType: account.business_type }
            : {}),
          transfersEnabled: account.capabilities?.transfers === "active",
          payoutsEnabled: account.payouts_enabled === true,
          detailsSubmitted: account.details_submitted === true,
        },
      },
    );
  }
  async requireBuyer(userId: string) {
    if (
      !(await this.accounts.exists({
        user: userId,
        identityStatus: "verified",
      }))
    )
      throw new ForbiddenException(
        "Identity verification is required before payment.",
      );
  }
  async requireEligibleSeller(userId: string) {
    if (
      !(await this.users.exists({
        _id: userId,
        blocked: false,
        role: { $in: ["seller", "admin"] },
      }))
    ) {
      throw new ForbiddenException(
        "Seller account is not eligible for transfers.",
      );
    }
  }
  // Checkout only needs an eligible seller. Connect and its KYC are required
  // when releasing funds, refreshed from Stripe even if cached flags are false.
  async payoutDestination(userId: string): Promise<string | null> {
    await this.requireEligibleSeller(userId);
    const profile = await this.accounts.findOne({ user: userId });
    if (!profile?.connectedAccountId) return null;
    // Refresh current capabilities instead of trusting a delayed webhook.
    const account = await this.stripe.sdk.accounts.retrieve(
      profile.connectedAccountId,
    );
    await this.applyConnect(account);
    if (
      account.capabilities?.transfers !== "active" ||
      !account.payouts_enabled
    )
      return null;
    return profile.connectedAccountId;
  }
  async requireSeller(userId: string) {
    const destination = await this.payoutDestination(userId);
    if (!destination)
      throw new ConflictException("Seller payment onboarding is incomplete.");
    return destination;
  }
}
