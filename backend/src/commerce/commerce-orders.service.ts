import { BidDepositsService } from "./bid-deposits.service";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Model } from "mongoose";
import Stripe = require("stripe");
import {
  Product,
  ProductDocument,
  ProductStatus,
} from "../products/schemas/product.schema";
import { CommerceOrder, CommerceOrderDocument } from "./commerce.schemas";
import { CommerceAccountsService } from "./commerce-accounts.service";
import { CommerceLockService } from "./commerce-lock.service";
import { StripeClientService } from "./stripe-client.service";
import { assertBuyer, priceSnapshot, publicOrder } from "./commerce.policy";

@Injectable()
export class CommerceOrdersService {
  constructor(
    @InjectModel(CommerceOrder.name)
    private readonly orders: Model<CommerceOrderDocument>,
    @InjectModel(Product.name)
    private readonly products: Model<ProductDocument>,
    private readonly stripe: StripeClientService,
    private readonly accounts: CommerceAccountsService,
    private readonly locks: CommerceLockService,
    private readonly deposits: BidDepositsService,
  ) {}
  async ready() {
    await this.orders.init();
  }
  async create(productId: string, buyerId: string) {
    this.stripe.sdk;
    return this.locks.run(`product-order:${productId}`, async () => {
      const existing = await this.orders.findOne({ product: productId });
      if (existing) {
        assertBuyer(existing, buyerId);
        return publicOrder(existing);
      }
      const product = await this.products.findById(productId);
      if (
        !product ||
        product.status !== ProductStatus.Reserved ||
        !product.reservedAt ||
        product.commerceVersion !== 1
      ) {
        throw new ConflictException(
          "A finalized reservation is required. Legacy reservations require review.",
        );
      }
      if (
        String(product.reservedBy) !== buyerId ||
        String(product.seller) === buyerId
      )
        throw new ForbiddenException();
      const policy = priceSnapshot(
        product.currentPrice,
        this.stripe.setting("STRIPE_PLATFORM_FEE_BPS", 0, 5000),
      );
      const hours = this.stripe.setting("STRIPE_PAYMENT_WINDOW_HOURS", 1, 168);
      const order = await this.orders.create({
        product: product._id,
        seller: product.seller,
        buyer: product.reservedBy,
        title: product.title,
        ...policy,
        paymentAttempt: randomUUID(),
        paymentDeadline: new Date(
          product.reservedAt.getTime() + hours * 3600000,
        ),
      });
      return publicOrder(order);
    });
  }
  async reviewQueue() {
    return (
      await this.orders
        .find({
          $or: [
            { issueOpen: true },
            {
              status: {
                $in: ["review_required", "disputed", "refund_pending"],
              },
            },
          ],
        })
        .sort({ updatedAt: 1 })
        .limit(100)
        .lean()
    ).map((order) => ({
      ...publicOrder(order),
      issueCode: order.issueCode,
      reviewCode: order.reviewCode,
      refundReason: order.refundReason,
    }));
  }
  async details(id: string, userId: string) {
    return this.locks.run(`order:${id}`, async () => {
      let order: CommerceOrderDocument = await this.requireOrder(id);
      if (![String(order.buyer), String(order.seller)].includes(userId))
        throw new ForbiddenException();
      if (order.status === "awaiting_payment")
        order = await this.deposits.allocate(order);
      if (order.paymentIntentId)
        await this.syncPayment(
          await this.stripe.sdk.paymentIntents.retrieve(order.paymentIntentId),
        );
      if (order.status === "refund_pending")
        await this.deposits.reconcileOrder(order);
      order = await this.requireOrder(id);
      return publicOrder(order);
    });
  }
  private due(order: CommerceOrderDocument) {
    return order.amount - (order.depositCredit || 0);
  }
  async mine(userId: string) {
    const rows = await this.orders
      .find({ $or: [{ buyer: userId }, { seller: userId }] })
      .sort({ createdAt: -1 })
      .limit(50);
    const result = [];
    for (const row of rows) {
      if (row.status === "awaiting_payment" && !row.depositAllocated) {
        try {
          result.push(
            await this.locks.run(`order:${row._id}`, async () =>
              publicOrder(
                await this.deposits.allocate(
                  await this.requireOrder(String(row._id)),
                ),
              ),
            ),
          );
        } catch {
          result.push({ ...publicOrder(row), settlementPending: true });
        }
      } else result.push(publicOrder(row));
    }
    return result;
  }
  async sellerEarnings(sellerId: string) {
    await this.accounts.requireEligibleSeller(sellerId);
    const rows = await this.orders.find({ seller: sellerId }).lean();
    const result = {
      currency: "ron",
      awaitingDelivery: 0,
      readyForRelease: 0,
      transferPending: 0,
      transferred: 0,
      reviewCount: 0,
      reviewBy: null as Date | null,
    };
    for (const row of rows) {
      if (row.status === "completed") result.transferred += row.sellerAmount;
      else if (
        row.issueOpen ||
        ["review_required", "disputed"].includes(row.status) ||
        (["paid", "shipped", "delivered"].includes(row.status) &&
          row.fundsReviewAt &&
          row.fundsReviewAt <= new Date())
      )
        result.reviewCount++;
      else if (row.status === "transfer_pending")
        result.transferPending += row.sellerAmount;
      else if (
        row.status === "delivered" &&
        row.releaseAfter &&
        row.releaseAfter <= new Date()
      )
        result.readyForRelease += row.sellerAmount;
      else if (["paid", "shipped", "delivered"].includes(row.status))
        result.awaitingDelivery += row.sellerAmount;
      if (
        ["paid", "shipped", "delivered"].includes(row.status) &&
        row.fundsReviewAt &&
        (!result.reviewBy || row.fundsReviewAt < result.reviewBy)
      )
        result.reviewBy = row.fundsReviewAt;
    }
    return result;
  }
  async releaseForSeller(sellerId: string) {
    await this.accounts.requireSeller(sellerId);
    if (!this.stripe.transfersEnabled)
      throw new ConflictException("Seller transfers are disabled.");
    const rows = await this.orders
      .find({
        seller: sellerId,
        issueOpen: false,
        status: { $in: ["delivered", "transfer_pending"] },
        releaseAfter: { $lte: new Date() },
      })
      .limit(20);
    for (const row of rows)
      await this.locks.run(`order:${row._id}`, () =>
        this.maintainOrder(String(row._id)),
      );
    return this.sellerEarnings(sellerId);
  }
  private async destinationForRelease(order: CommerceOrderDocument) {
    const destination = await this.accounts.payoutDestination(
      String(order.seller),
    );
    if (!destination) {
      order.payoutSetupRequired = true;
      await order.save();
      return null;
    }
    if (order.connectedAccountId && order.connectedAccountId !== destination)
      throw new ConflictException("Destination changed.");
    // Pin the destination BEFORE the first transfer, including lost responses.
    order.connectedAccountId = destination;
    order.payoutSetupRequired = false;
    await order.save();
    return destination;
  }
  private async requireOrder(id: string) {
    const order = await this.orders.findById(id);
    if (!order) throw new NotFoundException("Order not found.");
    return order;
  }
  async payment(id: string, buyerId: string) {
    const sdk = this.stripe.sdk;
    this.stripe.setting("STRIPE_MAX_FULFILLMENT_DAYS", 1, 60);
    return this.locks.run(`order:${id}`, async () => {
      let order: CommerceOrderDocument = await this.requireOrder(id);
      assertBuyer(order, buyerId);
      if (
        order.status !== "awaiting_payment" ||
        order.paymentDeadline.getTime() <= Date.now()
      )
        throw new ConflictException("Order is not payable.");
      await this.accounts.requireBuyer(buyerId);
      await this.accounts.requireEligibleSeller(String(order.seller));
      order = await this.deposits.allocate(order);
      await this.validateCreditCharges(order);
      if (this.due(order) === 0) {
        order.status = "paid";
        order.fundsReviewAt = new Date(
          Date.now() +
            this.stripe.setting("STRIPE_MAX_FULFILLMENT_DAYS", 1, 60) *
              86400000,
        );
        await order.save();
        await this.products.updateOne(
          {
            _id: order.product,
            status: ProductStatus.Reserved,
            reservedBy: order.buyer,
          },
          { $set: { status: ProductStatus.Sold } },
        );
        return { status: "paid" };
      }
      if (!order.paymentStartedAt) order.paymentStartedAt = new Date();
      await order.save();
      let intent: Stripe.PaymentIntent;
      if (order.paymentIntentId)
        intent = await sdk.paymentIntents.retrieve(order.paymentIntentId);
      else {
        // An unresolved create is not retried after Stripe's idempotency window.
        // A first attempt may start any time before the payment deadline;
        // only retries of an unresolved attempt are bounded to 20 hours.
        if (Date.now() - order.paymentStartedAt.getTime() >= 20 * 3600000) {
          await this.orders.updateOne(
            { _id: order._id },
            {
              $set: {
                status: "review_required",
                reviewCode: "payment_creation_uncertain",
              },
            },
          );
          throw new ConflictException("Payment creation needs reconciliation.");
        }
        intent = await sdk.paymentIntents.create(
          {
            amount: this.due(order),
            currency: order.currency,
            allowed_payment_method_types: ["card"],
            capture_method: "automatic",
            transfer_group: `order_${order._id}`,
            metadata: {
              orderId: String(order._id),
              attempt: order.paymentAttempt,
            },
          },
          { idempotencyKey: `payment:${order.paymentAttempt}` },
        );
        order.paymentIntentId = intent.id;
        await order.save();
      }
      this.assertIntent(order, intent);
      if (intent.status === "succeeded") {
        await this.syncPayment(intent);
        return { status: "paid" };
      }
      if (intent.status === "canceled")
        throw new ConflictException("Payment was canceled.");
      return { clientSecret: intent.client_secret, status: intent.status };
    });
  }
  private assertIntent(
    order: CommerceOrderDocument,
    intent: Stripe.PaymentIntent,
  ) {
    if (
      intent.livemode ||
      intent.amount !== this.due(order) ||
      intent.currency !== order.currency ||
      intent.metadata.orderId !== String(order._id) ||
      intent.metadata.attempt !== order.paymentAttempt ||
      (order.paymentIntentId && order.paymentIntentId !== intent.id)
    ) {
      throw new ConflictException("Payment does not match the order snapshot.");
    }
  }
  async syncPayment(intent: Stripe.PaymentIntent) {
    if (!intent.metadata?.attempt || !intent.metadata?.orderId) return;
    const order = await this.orders.findOne({
      paymentAttempt: intent.metadata.attempt,
      _id: intent.metadata.orderId,
    });
    if (!order) return;
    this.assertIntent(order, intent);
    const chargeId =
      typeof intent.latest_charge === "string"
        ? intent.latest_charge
        : intent.latest_charge?.id;
    await this.orders.updateOne(
      { _id: order._id },
      {
        $set: { paymentIntentId: intent.id, ...(chargeId ? { chargeId } : {}) },
      },
    );
    if (intent.status === "succeeded") {
      await this.validateCreditCharges(order);
      const maxDays = this.stripe.setting("STRIPE_MAX_FULFILLMENT_DAYS", 1, 60);
      // Also catches a payment whose success webhook arrived after expiration.
      await this.orders.updateOne(
        {
          _id: order._id,
          status: { $in: ["awaiting_payment", "payment_expired"] },
        },
        {
          $set: {
            status: "paid",
            fundsReviewAt: new Date(Date.now() + maxDays * 86400000),
          },
        },
      );
      await this.products.updateOne(
        {
          _id: order.product,
          status: ProductStatus.Reserved,
          reservedBy: order.buyer,
        },
        { $set: { status: ProductStatus.Sold } },
      );
    }
  }
  async shipped(
    id: string,
    sellerId: string,
    carrier: string,
    trackingCode: string,
  ) {
    return this.locks.run(`order:${id}`, async () => {
      const order = await this.requireOrder(id);
      if (String(order.seller) !== sellerId) throw new ForbiddenException();
      if (order.status !== "paid" || order.issueOpen)
        throw new ConflictException("Order cannot be shipped.");
      order.status = "shipped";
      order.carrier = carrier;
      order.trackingCode = trackingCode;
      await order.save();
      return publicOrder(order);
    });
  }
  async delivered(id: string, buyerId: string) {
    return this.locks.run(`order:${id}`, async () => {
      const order = await this.requireOrder(id);
      assertBuyer(order, buyerId);
      if (!["paid", "shipped"].includes(order.status) || order.issueOpen)
        throw new ConflictException("Order cannot be confirmed.");
      const hours = this.stripe.setting("STRIPE_RELEASE_DELAY_HOURS", 1, 720);
      order.status = "delivered";
      order.deliveredAt = new Date();
      order.releaseAfter = new Date(Date.now() + hours * 3600000);
      await order.save();
      return publicOrder(order);
    });
  }
  async issue(id: string, buyerId: string, code: string) {
    return this.locks.run(`order:${id}`, async () => {
      const order = await this.requireOrder(id);
      assertBuyer(order, buyerId);
      if (!["paid", "shipped", "delivered"].includes(order.status))
        throw new ConflictException("Contact support for this payment state.");
      order.issueOpen = true;
      order.issueCode = code;
      await order.save();
      return publicOrder(order);
    });
  }
  async refund(id: string, reason: string, adminId: string) {
    return this.locks.run(`order:${id}`, async () => {
      const order = await this.requireOrder(id);
      if (
        !["paid", "shipped", "delivered", "refund_pending"].includes(
          order.status,
        ) ||
        (!order.paymentIntentId && !order.depositCredit) ||
        order.transferId
      )
        throw new ConflictException(
          "Refund requires manual review for this state.",
        );
      if (
        order.refundStartedAt &&
        Date.now() - order.refundStartedAt.getTime() >= 20 * 3600000
      )
        throw new ConflictException(
          "Refund requires reconciliation before retry.",
        );
      order.refundStartedAt ||= new Date();
      order.status = "refund_pending";
      order.refundReason = reason;
      order.refundRequestedBy = adminId as any;
      await order.save();
      if (order.paymentIntentId)
        await this.stripe.sdk.refunds.create(
          { payment_intent: order.paymentIntentId },
          { idempotencyKey: `refund:${order._id}` },
        );
      // Guarantee installments are refunded by the durable deposit worker.
      // Marking the order pending before external calls makes retries resumable.
      // Final state comes from Stripe, never from the return screen.
      return publicOrder(order);
    });
  }
  async syncCharge(charge: Stripe.Charge) {
    if (charge.livemode)
      throw new BadRequestException("Unexpected live charge.");
    const intentId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;
    const order = await this.orders.findOne({ paymentIntentId: intentId });
    if (!order) return;
    if (charge.amount !== this.due(order) || charge.currency !== order.currency)
      throw new ConflictException("Charge amount mismatch.");
    if (
      order.depositCredit > 0 &&
      charge.amount_refunded > 0 &&
      !charge.disputed &&
      order.status === "refund_pending"
    ) {
      await this.deposits.reconcileOrder(order);
      return;
    }
    if (charge.disputed || charge.amount_refunded > 0) {
      // Post-transfer refunds/disputes freeze the order for support. No automated
      // assumption that a transfer reversal returns money to the buyer.
      await this.orders.updateOne(
        { _id: order._id },
        {
          $set: {
            refundedAmount: charge.amount_refunded,
            issueOpen: charge.disputed || charge.amount_refunded < order.amount,
            status: order.transferId
              ? "review_required"
              : charge.disputed
                ? "disputed"
                : charge.amount_refunded === order.amount
                  ? "refunded"
                  : "review_required",
            reviewCode: order.transferId
              ? "post_transfer_refund_or_dispute"
              : undefined,
          },
        },
      );
    }
  }
  async maintain() {
    const due = await this.orders
      .find({
        nextCheckAt: { $lte: new Date() },
        $or: [
          { status: "awaiting_payment", paymentDeadline: { $lte: new Date() } },
          { status: "awaiting_payment", paymentIntentId: { $exists: true } },
          {
            status: "delivered",
            releaseAfter: { $lte: new Date() },
            issueOpen: false,
          },
          { status: "transfer_pending" },
          { status: "refund_pending" },
          {
            status: { $in: ["paid", "shipped", "delivered"] },
            fundsReviewAt: { $lte: new Date() },
          },
        ],
      })
      .sort({ updatedAt: 1 })
      .limit(20);
    for (const row of due) {
      try {
        await this.locks.run(`order:${row._id}`, () =>
          this.maintainOrder(String(row._id)),
        );
      } catch {
        /* retry in the next bounded batch, without logging Stripe payloads */
      } finally {
        await this.orders.updateOne(
          { _id: row._id },
          { $set: { nextCheckAt: new Date(Date.now() + 60000) } },
        );
      }
    }
  }
  private async maintainOrder(id: string) {
    const order = await this.requireOrder(id);
    const sdk = this.stripe.sdk;
    if (order.status === "refund_pending") {
      if (
        !order.refundStartedAt ||
        Date.now() - order.refundStartedAt.getTime() >= 20 * 3600000
      ) {
        order.status = "review_required";
        order.reviewCode = "refund_reconciliation_needed";
        await order.save();
        return;
      }
      if (order.paymentIntentId)
        await sdk.refunds.create(
          { payment_intent: order.paymentIntentId },
          { idempotencyKey: `refund:${order._id}` },
        );
      if (order.depositCredit > 0) await this.deposits.reconcileOrder(order);
      else if (order.chargeId)
        await this.syncCharge(await sdk.charges.retrieve(order.chargeId));
      return;
    }
    if (order.status === "awaiting_payment") {
      if (order.paymentIntentId) {
        let intent = await sdk.paymentIntents.retrieve(order.paymentIntentId);
        if (intent.status === "succeeded") {
          await this.syncPayment(intent);
          return;
        }
        if (order.paymentDeadline.getTime() > Date.now()) return;
        if (intent.status !== "canceled")
          intent = await sdk.paymentIntents.cancel(
            intent.id,
            {},
            { idempotencyKey: `expire:${order._id}` },
          );
        if (intent.status !== "canceled") return;
      } else {
        if (order.paymentDeadline.getTime() > Date.now()) return;
        if (order.paymentStartedAt) {
          await this.orders.updateOne(
            { _id: order._id },
            {
              $set: {
                status: "review_required",
                reviewCode: "payment_creation_uncertain",
              },
            },
          );
          return;
        }
        // The product is not automatically relisted after a payment deadline.
      }
      await this.orders.updateOne(
        { _id: order._id, status: "awaiting_payment" },
        { $set: { status: "payment_expired" } },
      );
      return;
    }
    if (
      ["paid", "shipped", "delivered"].includes(order.status) &&
      order.fundsReviewAt &&
      order.fundsReviewAt.getTime() <= Date.now()
    ) {
      await this.orders.updateOne(
        { _id: order._id },
        {
          $set: {
            status: "review_required",
            issueOpen: true,
            reviewCode: "fulfillment_deadline_exceeded",
          },
        },
      );
      return;
    }
    if (!this.stripe.transfersEnabled) return;
    if (
      !["delivered", "transfer_pending"].includes(order.status) ||
      order.issueOpen ||
      !order.releaseAfter ||
      order.releaseAfter.getTime() > Date.now()
    )
      return;
    if (order.depositCredit > 0) {
      await this.transferInstallments(order);
      return;
    }
    if (!order.paymentIntentId) throw new ConflictException();
    const intent = await sdk.paymentIntents.retrieve(order.paymentIntentId);
    this.assertIntent(order, intent);
    const chargeId =
      typeof intent.latest_charge === "string"
        ? intent.latest_charge
        : intent.latest_charge?.id;
    if (intent.status !== "succeeded" || !chargeId)
      throw new ConflictException();
    const charge = await sdk.charges.retrieve(chargeId);
    if (charge.disputed || charge.amount_refunded) {
      await this.syncCharge(charge);
      return;
    }
    const destination = await this.destinationForRelease(order);
    if (!destination) return;
    if (order.status === "delivered") {
      order.status = "transfer_pending";
      order.transferStartedAt = new Date();
      await order.save();
    }
    // Never repeat an unresolved money movement past the provider's idempotency
    // retention window. Reconciliation/webhook can recover its transfer ID.
    if (
      !order.transferStartedAt ||
      Date.now() - new Date(order.transferStartedAt).getTime() >= 20 * 3600000
    ) {
      await this.orders.updateOne(
        { _id: order._id },
        {
          $set: {
            status: "review_required",
            reviewCode: "transfer_reconciliation_needed",
          },
        },
      );
      return;
    }
    const transfer = await sdk.transfers.create(
      {
        amount: order.sellerAmount,
        currency: order.currency,
        destination,
        source_transaction: chargeId,
        transfer_group: `order_${order._id}`,
        metadata: { orderId: String(order._id), attempt: order.paymentAttempt },
      },
      { idempotencyKey: `transfer:${order._id}` },
    );
    order.transferId = transfer.id;
    order.status = "completed";
    await order.save();
  }
  async refreshPayment(id: string) {
    const intent = await this.stripe.sdk.paymentIntents.retrieve(id);
    if (intent.metadata?.depositId) {
      await this.deposits.syncIntent(intent);
      return;
    }
    if (!intent.metadata?.orderId || !intent.metadata?.attempt) return;
    return this.locks.run(`order:${intent.metadata.orderId}`, async () => {
      await this.syncPayment(await this.stripe.sdk.paymentIntents.retrieve(id));
    });
  }
  async refreshCharge(id: string) {
    const charge = await this.stripe.sdk.charges.retrieve(id);
    const intentId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;
    if (!intentId) return;
    const order = await this.orders.findOne({ paymentIntentId: intentId });
    if (!order) {
      await this.deposits.syncCharge(charge);
      return;
    }
    return this.locks.run(`order:${order._id}`, async () => {
      await this.syncCharge(await this.stripe.sdk.charges.retrieve(id));
    });
  }
  async refreshTransfer(id: string) {
    const transfer = await this.stripe.sdk.transfers.retrieve(id);
    if (!transfer.metadata?.orderId || !transfer.metadata?.attempt) return;
    return this.locks.run(`order:${transfer.metadata.orderId}`, async () => {
      await this.syncTransfer(await this.stripe.sdk.transfers.retrieve(id));
    });
  }
  async syncTransfer(transfer: Stripe.Transfer) {
    if (!transfer.metadata?.orderId || !transfer.metadata?.attempt) return;
    const order = await this.orders.findOne({
      _id: transfer.metadata.orderId,
      paymentAttempt: transfer.metadata.attempt,
    });
    if (!order) return;
    if (order.depositCredit > 0) {
      await this.syncInstallmentTransfer(order, transfer);
      return;
    }
    const destination =
      typeof transfer.destination === "string"
        ? transfer.destination
        : transfer.destination?.id;
    if (
      (order.transferId && order.transferId !== transfer.id) ||
      transfer.transfer_group !== `order_${order._id}` ||
      transfer.source_transaction !== order.chargeId ||
      transfer.amount !== order.sellerAmount ||
      transfer.currency !== order.currency ||
      destination !== order.connectedAccountId ||
      transfer.livemode
    )
      throw new ConflictException("Transfer mismatch.");
    await this.orders.updateOne(
      { _id: order._id },
      {
        $set: {
          transferId: transfer.id,
          status:
            transfer.reversed ||
            transfer.amount_reversed > 0 ||
            order.issueOpen ||
            [
              "refund_pending",
              "refunded",
              "disputed",
              "review_required",
            ].includes(order.status)
              ? "review_required"
              : "completed",
        },
      },
    );
  }
  private async validateCreditCharges(order: CommerceOrderDocument) {
    for (const part of order.depositParts) {
      const intent = await this.stripe.sdk.paymentIntents.retrieve(
        part.paymentIntentId,
      );
      const charge = await this.stripe.sdk.charges.retrieve(part.chargeId);
      if (
        intent.livemode ||
        intent.status !== "succeeded" ||
        intent.metadata.depositId !== part.depositId ||
        charge.livemode ||
        charge.currency !== order.currency ||
        charge.disputed ||
        charge.amount - charge.amount_refunded < part.amount
      )
        throw new ConflictException("Guarantee funds are unavailable.");
    }
  }
  private async transferInstallments(order: CommerceOrderDocument) {
    await this.validateCreditCharges(order);
    const sources = [...order.depositParts];
    if (order.paymentIntentId) {
      const intent = await this.stripe.sdk.paymentIntents.retrieve(
        order.paymentIntentId,
      );
      this.assertIntent(order, intent);
      const chargeId =
        typeof intent.latest_charge === "string"
          ? intent.latest_charge
          : intent.latest_charge?.id;
      if (intent.status !== "succeeded" || !chargeId)
        throw new ConflictException();
      const charge = await this.stripe.sdk.charges.retrieve(chargeId);
      if (charge.disputed || charge.amount_refunded) {
        await this.syncCharge(charge);
        return;
      }
      sources.push({ chargeId, amount: this.due(order) });
    }
    const destination = await this.destinationForRelease(order);
    if (!destination) return;
    order.connectedAccountId = destination;
    if (!order.payoutParts.length) {
      let remaining = order.sellerAmount;
      order.payoutParts = sources.flatMap((source) => {
        const amount = Math.min(remaining, source.amount);
        remaining -= amount;
        return amount ? [{ amount, chargeId: source.chargeId }] : [];
      });
      if (remaining) throw new ConflictException("Insufficient order funds.");
      order.status = "transfer_pending";
      order.transferStartedAt = new Date();
      await order.save();
    }
    if (
      !order.transferStartedAt ||
      Date.now() - order.transferStartedAt.getTime() >= 20 * 3600000
    ) {
      order.status = "review_required";
      order.reviewCode = "installment_transfer_reconciliation_needed";
      await order.save();
      return;
    }
    for (let index = 0; index < order.payoutParts.length; index++) {
      const part = order.payoutParts[index];
      if (part.transferId) continue;
      const transfer = await this.stripe.sdk.transfers.create(
        {
          amount: part.amount,
          currency: order.currency,
          destination,
          source_transaction: part.chargeId,
          transfer_group: `order_${order._id}`,
          metadata: {
            orderId: String(order._id),
            attempt: order.paymentAttempt,
            part: String(index),
          },
        },
        { idempotencyKey: `transfer:${order._id}:part:${index}` },
      );
      await this.syncInstallmentTransfer(order, transfer);
    }
  }
  private async syncInstallmentTransfer(
    order: CommerceOrderDocument,
    transfer: Stripe.Transfer,
  ) {
    const index = Number(transfer.metadata.part);
    const part = order.payoutParts[index];
    const destination =
      typeof transfer.destination === "string"
        ? transfer.destination
        : transfer.destination?.id;
    if (
      !Number.isInteger(index) ||
      !part ||
      transfer.livemode ||
      transfer.metadata.attempt !== order.paymentAttempt ||
      transfer.amount !== part.amount ||
      transfer.source_transaction !== part.chargeId ||
      transfer.currency !== order.currency ||
      transfer.transfer_group !== `order_${order._id}` ||
      destination !== order.connectedAccountId ||
      (part.transferId && part.transferId !== transfer.id)
    )
      throw new ConflictException("Installment transfer mismatch.");
    part.transferId = transfer.id;
    order.markModified("payoutParts");
    order.transferId ||= transfer.id;
    if (
      transfer.reversed ||
      transfer.amount_reversed ||
      order.issueOpen ||
      ["review_required", "disputed", "refund_pending", "refunded"].includes(
        order.status,
      )
    ) {
      order.status = "review_required";
      order.issueOpen = true;
    } else if (order.payoutParts.every((item) => item.transferId))
      order.status = "completed";
    await order.save();
  }
}
