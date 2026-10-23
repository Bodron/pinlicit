import { BidDepositsService } from "./bid-deposits.service";
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { randomUUID } from "crypto";
import Stripe = require("stripe");
import { Bid, BidDocument } from "../bids/schemas/bid.schema";
import {
  Product,
  ProductDocument,
  ProductStatus,
} from "../products/schemas/product.schema";
import {
  CommerceAccount,
  CommerceOrder,
  CommerceOrderDocument,
  StripeInbox,
} from "./commerce.schemas";
import { CommerceAccountsService } from "./commerce-accounts.service";
import { CommerceOrdersService } from "./commerce-orders.service";
import { StripeClientService } from "./stripe-client.service";
import { CommerceLockService } from "./commerce-lock.service";
import { priceSnapshot } from "./commerce.policy";
const supported = new Set([
  "identity.verification_session.processing",
  "identity.verification_session.verified",
  "identity.verification_session.requires_input",
  "identity.verification_session.canceled",
  "identity.verification_session.redacted",
  "account.updated",
  "payment_intent.succeeded",
  "payment_intent.processing",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
  "charge.refunded",
  "charge.dispute.created",
  "charge.dispute.updated",
  "charge.dispute.closed",
  "transfer.created",
  "transfer.updated",
  "transfer.reversed",
]);
@Injectable()
export class CommerceWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;
  constructor(
    @InjectModel(StripeInbox.name) private readonly inbox: Model<StripeInbox>,
    @InjectModel(Product.name)
    private readonly products: Model<ProductDocument>,
    @InjectModel(Bid.name) private readonly bids: Model<BidDocument>,
    @InjectModel(CommerceOrder.name)
    private readonly orders: Model<CommerceOrderDocument>,
    private readonly stripe: StripeClientService,
    private readonly accounts: CommerceAccountsService,
    private readonly payments: CommerceOrdersService,
    private readonly locks: CommerceLockService,
    private readonly deposits: BidDepositsService,
  ) {}
  async onModuleInit() {
    if (!this.stripe.enabled) return;
    this.stripe.assertSecureAuth();
    this.stripe.sdk; // misconfigured test/live keys fail closed at startup
    this.stripe.setting("STRIPE_PLATFORM_FEE_BPS", 0, 5000);
    this.stripe.setting("STRIPE_PAYMENT_WINDOW_HOURS", 1, 168);
    this.stripe.setting("STRIPE_RELEASE_DELAY_HOURS", 1, 720);
    this.stripe.setting("STRIPE_MAX_FULFILLMENT_DAYS", 1, 60);
    for (const name of [
      "STRIPE_IDENTITY_RETURN_URL",
      "STRIPE_CONNECT_RETURN_URL",
      "STRIPE_CONNECT_REFRESH_URL",
    ])
      this.stripe.returnUrl(name);
    await Promise.all([
      this.inbox.init(),
      this.deposits.ready(),
      this.locks.ready(),
      this.accounts.ready(),
      this.payments.ready(),
    ]);
    this.timer = setInterval(() => {
      void this.tick();
    }, 15000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async enqueue(event: Stripe.Event) {
    if (!supported.has(event.type) || !("id" in event.data.object))
      return { received: true };
    try {
      await this.inbox.updateOne(
        { eventId: event.id },
        {
          $setOnInsert: {
            eventId: event.id,
            type: event.type,
            objectId: event.data.object.id,
            status: "pending",
            attempts: 0,
            nextAttemptAt: new Date(),
          },
        },
        { upsert: true },
      );
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
    return { received: true };
  }
  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.processInbox();
      await this.finalizeAuctions();
      await this.payments.maintain();
      await this.deposits.maintain();
    } catch {
      /* persisted work is retried; no raw financial/identity payload logs */
    } finally {
      this.running = false;
    }
  }
  private async processInbox() {
    const jobs = await this.inbox
      .find({ status: "pending", nextAttemptAt: { $lte: new Date() } })
      .sort({ nextAttemptAt: 1 })
      .limit(30);
    for (const job of jobs) {
      try {
        await this.locks.run(`stripe-event:${job.eventId}`, async () => {
          const fresh = await this.inbox.findOne({
            eventId: job.eventId,
            status: "pending",
          });
          if (!fresh) return;
          if (job.type.startsWith("identity."))
            await this.accounts.refreshIdentity(job.objectId);
          else if (job.type === "account.updated")
            await this.accounts.refreshConnect(job.objectId);
          else if (job.type.startsWith("payment_intent."))
            await this.payments.refreshPayment(job.objectId);
          else if (job.type.startsWith("transfer."))
            await this.payments.refreshTransfer(job.objectId);
          else if (job.type.startsWith("charge.dispute.")) {
            const dispute = await this.stripe.sdk.disputes.retrieve(
              job.objectId,
            );
            const chargeId =
              typeof dispute.charge === "string"
                ? dispute.charge
                : dispute.charge.id;
            await this.payments.refreshCharge(chargeId);
          } else if (job.type === "charge.refunded")
            await this.payments.refreshCharge(job.objectId);
          await this.inbox.updateOne(
            { eventId: job.eventId },
            { $set: { status: "done" } },
          );
        });
      } catch {
        await this.inbox.updateOne(
          { eventId: job.eventId, status: "pending" },
          {
            $inc: { attempts: 1 },
            $set: {
              nextAttemptAt: new Date(
                Date.now() +
                  Math.min(3600000, 15000 * 2 ** Math.min(job.attempts, 8)),
              ),
            },
          },
        );
      }
    }
  }
  private async finalizeAuctions() {
    // Legacy listings are intentionally excluded from financial migration.
    const products = await this.products
      .find({
        commerceVersion: 1,
        status: ProductStatus.Active,
        endsAt: { $lte: new Date() },
      })
      .sort({ endsAt: 1 })
      .limit(20);
    for (const candidate of products) {
      try {
        await this.products.db.transaction(async (session) => {
          const product = await this.products
            .findOne({
              _id: candidate._id,
              status: ProductStatus.Active,
              endsAt: { $lte: new Date() },
            })
            .session(session);
          if (!product) return;
          const bid = product.highestBid
            ? await this.bids
                .findOne({ _id: product.highestBid, product: product._id })
                .session(session)
            : null;
          const reserveMet =
            !product.reservePrice ||
            product.currentPrice >= product.reservePrice;
          if (
            !bid ||
            !reserveMet ||
            String(bid.bidder) === String(product.seller)
          ) {
            product.status = ProductStatus.Expired;
            await product.save({ session });
            return;
          }
          try {
            await this.deposits.require(
              String(product._id),
              String(bid.bidder),
              bid.maxAmount,
              session,
            );
          } catch (error) {
            if (error.status !== 403) throw error;
            // Do not charge an unfunded/disputed winner or silently promote another bidder.
            product.status = ProductStatus.Hidden;
            await product.save({ session });
            return;
          }
          const policy = priceSnapshot(
            product.currentPrice,
            this.stripe.setting("STRIPE_PLATFORM_FEE_BPS", 0, 5000),
          );
          const hours = this.stripe.setting(
            "STRIPE_PAYMENT_WINDOW_HOURS",
            1,
            168,
          );
          product.status = ProductStatus.Reserved;
          product.reservedBy = bid.bidder;
          product.reservedAt = new Date();
          await product.save({ session });
          await this.orders.create(
            [
              {
                product: product._id,
                buyer: bid.bidder,
                seller: product.seller,
                title: product.title,
                ...policy,
                paymentAttempt: randomUUID(),
                paymentDeadline: new Date(Date.now() + hours * 3600000),
              },
            ],
            { session },
          );
        });
      } catch {
        /* retry; a failed transaction does not finalize the auction */
      }
    }
  }
}
