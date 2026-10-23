import { Bid, BidDocument } from "../bids/schemas/bid.schema";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ClientSession, Model } from "mongoose";
import { randomUUID } from "crypto";
import Stripe = require("stripe");
import {
  BidDeposit,
  BidDepositDocument,
  CommerceOrder,
  CommerceOrderDocument,
} from "./commerce.schemas";
import {
  Product,
  ProductDocument,
  ProductStatus,
} from "../products/schemas/product.schema";
import { StripeClientService } from "./stripe-client.service";
import { CommerceAccountsService } from "./commerce-accounts.service";
import { CommerceLockService } from "./commerce-lock.service";

export function requiredDeposit(maximum: number) {
  if (!Number.isSafeInteger(maximum) || maximum < 3000 || maximum > 99999999)
    throw new BadRequestException(
      "Maximum bid must be between 30 and 999999.99 RON.",
    );
  return Math.ceil(maximum / 10);
}

@Injectable()
export class BidDepositsService {
  constructor(
    @InjectModel(BidDeposit.name)
    private readonly deposits: Model<BidDepositDocument>,
    @InjectModel(CommerceOrder.name)
    private readonly orders: Model<CommerceOrderDocument>,
    @InjectModel(Product.name)
    private readonly products: Model<ProductDocument>,
    private readonly stripe: StripeClientService,
    private readonly accounts: CommerceAccountsService,
    private readonly locks: CommerceLockService,
    @InjectModel(Bid.name) private readonly bids: Model<BidDocument>,
  ) {}
  ready() {
    return this.deposits.init();
  }
  async mine(buyer: string) {
    const rows = await this.deposits
      .find({ buyer })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return rows.map((row) => ({
      id: String(row._id),
      productId: String(row.product),
      amount: row.amount,
      maximum: row.maximum,
      status: row.status,
      credited: row.creditAmount,
      refunded: row.refundedAmount,
    }));
  }
  async require(
    product: string,
    buyer: string,
    maximum: number,
    session?: ClientSession,
  ) {
    const needed = requiredDeposit(maximum);
    const rows = await this.deposits
      .find({ product, buyer, status: "paid", refundTarget: 0 })
      .session(session || null);
    if (rows.reduce((sum, row) => sum + row.amount, 0) < needed)
      throw new ForbiddenException(
        "A confirmed 10% bid guarantee is required.",
      );
    // Writes fence allocation/refund against a bid transaction using this guarantee.
    if (session)
      await this.deposits.updateMany(
        { _id: { $in: rows.map((row) => row._id) }, status: "paid" },
        { $set: { nextCheckAt: new Date() } },
        { session },
      );
  }
  async activate(productId: string, seller: string) {
    this.stripe.sdk;
    await this.accounts.requireSeller(seller);
    return this.products.db.transaction(async (session) => {
      const product = await this.products.findById(productId).session(session);
      if (!product || String(product.seller) !== seller)
        throw new ForbiddenException();
      if (product.commerceVersion === 1) return { activated: true };
      if (
        product.status !== ProductStatus.Active ||
        product.endsAt <= new Date() ||
        product.highestBid ||
        (await this.bids.exists({ product: product._id }).session(session))
      )
        throw new ConflictException(
          "Only active listings without bids can be enrolled. Existing commitments require support review.",
        );
      product.commerceVersion = 1;
      await product.save({ session });
      return { activated: true };
    });
  }
  async cancelPending(product: string, buyer: string) {
    return this.locks.run(`guarantee:${product}:${buyer}`, async () => {
      const rows = await this.deposits.find({
        product,
        buyer,
        status: "pending",
      });
      for (const row of rows) {
        let intent = await this.intent(row);
        if (!["succeeded", "canceled"].includes(intent.status))
          intent = await this.stripe.sdk.paymentIntents.cancel(
            intent.id,
            {},
            { idempotencyKey: `deposit-cancel:${row.attempt}` },
          );
        await this.syncIntent(intent);
      }
      return { status: "reconciled" };
    });
  }
  async payment(productId: string, buyer: string, maximum: number) {
    const needed = requiredDeposit(maximum);
    this.stripe.sdk;
    await this.accounts.requireBuyer(buyer);
    return this.locks.run(`guarantee:${productId}:${buyer}`, async () => {
      const product = await this.products.findById(productId);
      if (
        !product ||
        product.commerceVersion !== 1 ||
        product.status !== ProductStatus.Active ||
        product.endsAt <= new Date() ||
        product.startsAt > new Date() ||
        String(product.seller) === buyer
      )
        throw new ConflictException(
          "Auction is not eligible for a bid guarantee.",
        );
      if (maximum < product.currentPrice + product.minBidIncrement)
        throw new ConflictException(
          "Maximum bid is below the current minimum.",
        );
      const rows = await this.deposits.find({ product: productId, buyer });
      if (
        rows.some((row) =>
          ["review_required", "disputed", "refunding"].includes(row.status),
        )
      )
        throw new ConflictException("Guarantee needs review.");
      let pending = rows.find((row) => row.status === "pending");
      // Resolve a previous payment first; never charge a second ambiguous top-up.
      if (pending) {
        await this.syncIntent(await this.intent(pending));
        pending = await this.deposits.findById(pending._id);
        if (pending.status === "pending") {
          if (pending.maximum !== maximum)
            throw new ConflictException(
              "Finish the previous guarantee payment first.",
            );
          const intent = await this.intent(pending);
          return {
            clientSecret: intent.client_secret,
            amount: pending.amount,
            required: needed,
            status: "requires_payment",
          };
        }
      }
      const paid = await this.deposits.find({
        product: productId,
        buyer,
        status: "paid",
        refundTarget: 0,
      });
      const held = paid.reduce((sum, row) => sum + row.amount, 0);
      if (held >= needed)
        return { status: "covered", amount: 0, required: needed };
      const delta = needed - held;
      if (delta < 300)
        throw new BadRequestException(
          "Increase your maximum enough for a guarantee top-up of at least 3 RON.",
        );
      let row: BidDepositDocument;
      await this.products.db.transaction(async (session) => {
        const fresh = await this.products.findById(productId).session(session);
        if (
          !fresh ||
          fresh.status !== ProductStatus.Active ||
          fresh.endsAt <= new Date()
        )
          throw new ConflictException("Auction has ended.");
        fresh.increment();
        await fresh.save({ session });
        [row] = await this.deposits.create(
          [
            {
              product: productId,
              buyer,
              amount: delta,
              maximum,
              attempt: randomUUID(),
              startedAt: new Date(),
            },
          ],
          { session },
        );
      });
      const intent = await this.intent(row!);
      return {
        clientSecret: intent.client_secret,
        amount: delta,
        required: needed,
        status: "requires_payment",
      };
    });
  }
  private async intent(row: BidDepositDocument) {
    if (row.paymentIntentId)
      return this.stripe.sdk.paymentIntents.retrieve(row.paymentIntentId);
    if (Date.now() - row.startedAt.getTime() >= 20 * 3600000) {
      row.status = "review_required";
      row.reviewCode = "deposit_creation_uncertain";
      await row.save();
      throw new ConflictException(
        "Guarantee creation requires reconciliation.",
      );
    }
    const intent = await this.stripe.sdk.paymentIntents.create(
      {
        amount: row.amount,
        currency: "ron",
        allowed_payment_method_types: ["card"],
        capture_method: "automatic",
        metadata: { depositId: String(row._id), attempt: row.attempt },
      },
      { idempotencyKey: `deposit:${row.attempt}` },
    );
    row.paymentIntentId = intent.id;
    await row.save();
    return intent;
  }
  async syncIntent(intent: Stripe.PaymentIntent) {
    if (!intent.metadata?.depositId) return false;
    const row = await this.deposits.findOne({
      _id: intent.metadata.depositId,
      attempt: intent.metadata.attempt,
    });
    if (!row) return true;
    if (
      intent.livemode ||
      intent.amount !== row.amount ||
      intent.currency !== "ron" ||
      (row.paymentIntentId && row.paymentIntentId !== intent.id)
    )
      throw new ConflictException("Guarantee payment mismatch.");
    const chargeId =
      typeof intent.latest_charge === "string"
        ? intent.latest_charge
        : intent.latest_charge?.id;
    const update: any = {
      paymentIntentId: intent.id,
      ...(chargeId ? { chargeId } : {}),
    };
    if (row.status === "pending" && intent.status === "succeeded")
      update.status = "paid";
    if (row.status === "pending" && intent.status === "canceled")
      update.status = "canceled";
    await this.deposits.updateOne(
      { _id: row._id, status: row.status },
      { $set: update },
    );
    return true;
  }
  async allocate(order: CommerceOrderDocument) {
    if (order.depositAllocated) return order;
    await this.orders.db.transaction(async (session) => {
      const fresh = await this.orders.findById(order._id).session(session);
      if (fresh.depositAllocated) return;
      const rows = await this.deposits
        .find({ product: order.product, buyer: order.buyer })
        .sort({ createdAt: 1 })
        .session(session);
      if (rows.some((row) => row.status === "pending"))
        throw new ConflictException(
          "Wait for the guarantee payment to be reconciled.",
        );
      if (
        rows.some((row) =>
          ["disputed", "review_required", "refunding"].includes(row.status),
        )
      )
        throw new ConflictException(
          "Guarantee requires review before payment.",
        );
      let remaining = order.amount;
      const parts = [];
      for (const row of rows.filter((row) => row.status === "paid")) {
        // Leave either zero or >=3 RON for the final card payment.
        let credit = Math.min(row.amount, remaining);
        if (remaining > credit && remaining - credit < 300)
          credit = Math.max(0, remaining - 300);
        row.creditAmount = credit;
        row.order = order._id;
        row.status = "allocated";
        row.refundTarget = row.amount - credit;
        remaining -= credit;
        if (credit)
          parts.push({
            depositId: String(row._id),
            paymentIntentId: row.paymentIntentId,
            chargeId: row.chargeId,
            amount: credit,
          });
        await row.save({ session });
      }
      fresh.depositAllocated = true;
      fresh.depositCredit = order.amount - remaining;
      fresh.depositParts = parts;
      await fresh.save({ session });
    });
    const fresh = await this.orders.findById(order._id);
    return fresh;
  }
  async reconcileOrder(order: CommerceOrderDocument) {
    let rows = await this.deposits.find({ order: order._id });
    for (const row of rows)
      if (row.chargeId)
        await this.syncCharge(
          await this.stripe.sdk.charges.retrieve(row.chargeId),
        );
    rows = await this.deposits.find({ order: order._id });
    const depositsRefunded = rows.reduce(
      (sum, row) =>
        sum + Math.max(0, row.refundedAmount - (row.amount - row.creditAmount)),
      0,
    );
    let mainRefunded = 0;
    if (order.chargeId)
      mainRefunded = (await this.stripe.sdk.charges.retrieve(order.chargeId))
        .amount_refunded;
    const total = mainRefunded + depositsRefunded;
    if (total >= order.amount && !order.transferId)
      await this.orders.updateOne(
        { _id: order._id, status: "refund_pending" },
        { $set: { status: "refunded", refundedAmount: total } },
      );
  }
  async syncCharge(charge: Stripe.Charge) {
    const id =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;
    const row = await this.deposits.findOne({ paymentIntentId: id });
    if (!row) return false;
    if (
      charge.livemode ||
      charge.amount !== row.amount ||
      charge.currency !== "ron"
    )
      throw new ConflictException("Guarantee charge mismatch.");
    row.refundedAmount = charge.amount_refunded;
    if (charge.disputed || charge.amount_refunded > row.refundTarget) {
      row.status = charge.disputed ? "disputed" : "review_required";
      row.reviewCode = "guarantee_charge_changed";
      if (row.order)
        await this.orders.updateOne(
          { _id: row.order },
          {
            $set: {
              status: "review_required",
              issueOpen: true,
              reviewCode: row.reviewCode,
            },
          },
        );
    } else if (row.refundedAmount === row.amount) row.status = "refunded";
    await row.save();
    return true;
  }
  async maintain() {
    const rows = await this.deposits
      .find({
        status: { $in: ["pending", "paid", "allocated", "refunding"] },
        nextCheckAt: { $lte: new Date() },
      })
      .sort({ nextCheckAt: 1 })
      .limit(20);
    for (const row of rows) {
      try {
        await this.locks.run(
          `guarantee:${row.product}:${row.buyer}`,
          async () => {
            let fresh = await this.deposits.findById(row._id);
            const product = await this.products.findById(row.product);
            const terminal =
              !product ||
              product.status !== ProductStatus.Active ||
              product.endsAt <= new Date();
            if (fresh.status === "pending") {
              let intent = await this.intent(fresh);
              if (
                terminal &&
                !["succeeded", "canceled"].includes(intent.status)
              )
                intent = await this.stripe.sdk.paymentIntents.cancel(
                  intent.id,
                  {},
                  { idempotencyKey: `deposit-cancel:${fresh.attempt}` },
                );
              await this.syncIntent(intent);
              fresh = await this.deposits.findById(row._id);
            }
            if (!["paid", "allocated", "refunding"].includes(fresh.status))
              return;
            if (fresh.chargeId)
              await this.syncCharge(
                await this.stripe.sdk.charges.retrieve(fresh.chargeId),
              );
            fresh = await this.deposits.findById(row._id);
            if (["review_required", "disputed"].includes(fresh.status)) return;
            const order = fresh.order
              ? await this.orders.findById(fresh.order)
              : await this.orders.findOne({
                  product: fresh.product,
                  buyer: fresh.buyer,
                });
            // A passed end time alone is not a finalized outcome: the auction worker must decide the winner first.
            const loses =
              !product ||
              [ProductStatus.Expired, ProductStatus.Hidden].includes(
                product.status,
              ) ||
              ([ProductStatus.Reserved, ProductStatus.Sold].includes(
                product.status,
              ) &&
                String(product.reservedBy) !== String(fresh.buyer));
            if (
              loses ||
              order?.status === "payment_expired" ||
              order?.status === "refund_pending"
            )
              fresh.refundTarget = fresh.amount;
            if (fresh.refundTarget > fresh.refundedAmount) {
              const extra = fresh as any;
              if (
                !extra.refundRequestedTotal ||
                fresh.refundedAmount >= extra.refundRequestedTotal
              ) {
                extra.refundRequestedTotal = fresh.refundTarget;
                extra.refundRequestAmount =
                  fresh.refundTarget - fresh.refundedAmount;
                fresh.refundStartedAt = new Date();
              }
              if (
                Date.now() - fresh.refundStartedAt.getTime() >=
                20 * 3600000
              ) {
                fresh.status = "review_required";
                fresh.reviewCode = "deposit_refund_uncertain";
                await fresh.save();
                return;
              }
              await fresh.save();
              const refund = await this.stripe.sdk.refunds.create(
                {
                  payment_intent: fresh.paymentIntentId,
                  amount: extra.refundRequestAmount,
                },
                {
                  idempotencyKey: `deposit-refund:${fresh.attempt}:${extra.refundRequestedTotal}`,
                },
              );
              fresh.refundId = refund.id;
              await fresh.save();
              if (fresh.chargeId)
                await this.syncCharge(
                  await this.stripe.sdk.charges.retrieve(fresh.chargeId),
                );
            }
            if (order?.status === "refund_pending")
              await this.reconcileOrder(order);
          },
        );
      } catch {
        /* Durable receipts and bounded retries; never log card/client secrets. */
      } finally {
        await this.deposits.updateOne(
          { _id: row._id },
          { $set: { nextCheckAt: new Date(Date.now() + 60000) } },
        );
      }
    }
  }
}
