import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  forwardRef,
  Optional,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { CommerceAccountsService } from "../commerce/commerce-accounts.service";
import { ClientSession, Model, Types } from "mongoose";
import { AuctionsGateway } from "../auctions/auctions.gateway";
import { ProductStatus } from "../products/schemas/product.schema";
import { ProductsService } from "../products/products.service";
import { Bid, BidDocument } from "./schemas/bid.schema";

@Injectable()
export class BidsService {
  constructor(
    @InjectModel(Bid.name) private readonly bidModel: Model<BidDocument>,
    private readonly productsService: ProductsService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => AuctionsGateway))
    private readonly auctionsGateway: AuctionsGateway,
    @Optional() private readonly commerceAccounts?: CommerceAccountsService,
  ) {}

  private validateBid(product: any, bidderId: string, maxAmount: number) {
    if (!product) throw new BadRequestException("Product not found.");
    if (String(product.seller) === bidderId)
      throw new ForbiddenException("You cannot bid on your own product.");
    if (
      !Number.isSafeInteger(maxAmount) ||
      maxAmount < product.currentPrice + product.minBidIncrement
    ) {
      throw new BadRequestException(
        `Bid must be at least ${product.currentPrice + product.minBidIncrement}.`,
      );
    }
    const now = new Date();
    if (
      product.status !== ProductStatus.Active ||
      product.endsAt <= now ||
      (product.startsAt && product.startsAt > now)
    ) {
      throw new BadRequestException("Auction is not active.");
    }
  }
  async placeBid(productId: string, bidderId: string, maxAmount: number) {
    const model = this.productsService.getModel();
    const initial = await model.findById(productId);
    this.validateBid(initial, bidderId, maxAmount);
    if (initial.commerceVersion === 1) {
      if (!this.commerceAccounts)
        throw new ForbiddenException("Identity verification is required.");
      await this.commerceAccounts.requireBuyer(bidderId);
    }
    // Proxy maxima, bid insertion, anti-snipe extension and the leader pointer
    // commit together. MongoDB retries write conflicts, then validation runs on
    // the new price. Transactions require a replica set (Atlas supports this).
    const result = await model.db.transaction(async (session) => {
      const product = await model.findById(productId).session(session);
      this.validateBid(product, bidderId, maxAmount);
      const now = new Date();
      const window =
        (this.config.get<number>("ANTI_SNIPE_WINDOW_SECONDS") || 60) * 1000;
      const extension =
        (this.config.get<number>("ANTI_SNIPE_EXTENSION_SECONDS") || 60) * 1000;
      const shouldExtend = product.endsAt.getTime() - now.getTime() <= window;
      const leader = await this.bidModel
        .findOne({ product: new Types.ObjectId(productId) })
        .sort({ maxAmount: -1, createdAt: 1, _id: 1 })
        .session(session);
      const leaderMax = leader?.maxAmount ?? leader?.amount ?? 0;
      const alreadyLeads = String(leader?.bidder) === bidderId;
      const willLead = !leader || alreadyLeads || maxAmount > leaderMax;
      if (alreadyLeads && maxAmount <= leaderMax)
        throw new BadRequestException("Maximum bid must increase.");
      const quoted = this.publicAmount({
        currentPrice: product.currentPrice,
        increment: product.minBidIncrement,
        maxAmount,
        currentLeaderMax: leaderMax,
        bidderWillLead: willLead,
        bidderAlreadyLeads: alreadyLeads,
      });
      const winningMax = willLead ? maxAmount : leaderMax;
      const visible =
        product.reservePrice && winningMax >= product.reservePrice
          ? Math.max(quoted, product.reservePrice)
          : quoted;
      const [bid] = await this.bidModel.create(
        [
          {
            product: product._id,
            bidder: new Types.ObjectId(bidderId),
            maxAmount,
            amount: willLead ? visible : maxAmount,
          },
        ],
        { session },
      );
      product.currentPrice = visible;
      if (shouldExtend)
        product.endsAt = new Date(product.endsAt.getTime() + extension);
      product.highestBid = willLead ? bid._id : leader._id;
      await product.save({ session });
      await product.populate([
        { path: "category", select: "name slug" },
        { path: "seller", select: "name role" },
      ]);
      await bid.populate("bidder", "name role");
      return { product, bid, extended: shouldExtend };
    });
    this.auctionsGateway.broadcastBid(
      result.product,
      result.bid,
      result.extended,
    );
    return result;
  }

  private publicAmount({
    currentPrice,
    increment,
    maxAmount,
    currentLeaderMax,
    bidderWillLead,
    bidderAlreadyLeads,
  }: {
    currentPrice: number;
    increment: number;
    maxAmount: number;
    currentLeaderMax: number;
    bidderWillLead: boolean;
    bidderAlreadyLeads: boolean;
  }) {
    if (bidderAlreadyLeads) {
      return currentPrice;
    }
    if (!currentLeaderMax) {
      return Math.min(maxAmount, currentPrice + increment);
    }
    if (bidderWillLead) {
      return Math.min(maxAmount, currentLeaderMax + increment);
    }
    return Math.min(currentLeaderMax, maxAmount + increment);
  }

  async placeBidLegacy(productId: string, bidderId: string, amount: number) {
    return this.placeBid(productId, bidderId, amount);
  }

  /*
   * Keep the rest of the service API unchanged for callers. The old direct bid
   * logic is intentionally replaced by proxy bidding above.
   */
  private unusedLegacyMarker() {
    return undefined;
  }

  latestForProduct(productId: string, limit = 5) {
    return this.bidModel
      .find({ product: productId })
      .select("amount createdAt bidder")
      .populate("bidder", "name role")
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  mine(userId: string) {
    return this.bidModel
      .find({ bidder: new Types.ObjectId(userId) })
      .populate("product")
      .sort({ createdAt: -1 });
  }
}
