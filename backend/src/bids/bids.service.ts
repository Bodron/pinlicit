import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  forwardRef,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
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
  ) {}

  async placeBid(productId: string, bidderId: string, maxAmount: number) {
    const productModel = this.productsService.getModel();
    const product = await productModel.findById(productId);
    if (!product) {
      throw new BadRequestException("Product not found.");
    }
    if (product.seller.toString() === bidderId) {
      throw new ForbiddenException("You cannot bid on your own product.");
    }

    const requiredAmount = product.currentPrice + product.minBidIncrement;
    if (maxAmount < requiredAmount) {
      throw new BadRequestException(`Bid must be at least ${requiredAmount}.`);
    }

    const now = new Date();
    if (product.status !== ProductStatus.Active || product.endsAt <= now) {
      throw new BadRequestException("Auction is not active.");
    }

    const antiSnipeWindowMs =
      (this.config.get<number>("ANTI_SNIPE_WINDOW_SECONDS") || 60) * 1000;
    const antiSnipeExtensionMs =
      (this.config.get<number>("ANTI_SNIPE_EXTENSION_SECONDS") || 60) * 1000;
    const shouldExtend =
      product.endsAt.getTime() - now.getTime() <= antiSnipeWindowMs;
    const nextEndsAt = shouldExtend
      ? new Date(product.endsAt.getTime() + antiSnipeExtensionMs)
      : product.endsAt;

    const currentLeader = await this.bidModel
      .findOne({ product: new Types.ObjectId(productId) })
      .sort({ maxAmount: -1, createdAt: 1 });
    const currentLeaderMax =
      currentLeader?.maxAmount ?? currentLeader?.amount ?? 0;
    const currentLeaderId = currentLeader?.bidder?.toString();
    const bidderAlreadyLeads = currentLeaderId === bidderId;
    const bidderWillLead =
      !currentLeader || bidderAlreadyLeads || maxAmount > currentLeaderMax;
    const visibleAmount = this.publicAmount({
      currentPrice: product.currentPrice,
      increment: product.minBidIncrement,
      maxAmount,
      currentLeaderMax,
      bidderWillLead,
      bidderAlreadyLeads,
    });

    const bid = await this.bidModel.create({
      product: new Types.ObjectId(productId),
      bidder: new Types.ObjectId(bidderId),
      maxAmount,
      amount: bidderWillLead ? visibleAmount : maxAmount,
    });

    const updated = await productModel
      .findOneAndUpdate(
        {
          _id: productId,
          status: ProductStatus.Active,
          endsAt: { $gt: now },
        },
        {
          currentPrice: visibleAmount,
          endsAt: nextEndsAt,
          ...(bidderWillLead ? { highestBid: bid._id } : {}),
        },
        { new: true },
      )
      .populate("category", "name slug")
      .populate("seller", "name email phone role");

    if (!updated) {
      await bid.deleteOne();
      throw new BadRequestException(
        "Bid was not accepted. Auction state changed.",
      );
    }

    if (!bidderWillLead && currentLeader) {
      await productModel.findByIdAndUpdate(productId, {
        highestBid: currentLeader._id,
      });
    }

    const populatedBid = await bid.populate("bidder", "name email role");
    this.auctionsGateway.broadcastBid(updated, populatedBid, shouldExtend);
    return { product: updated, bid: populatedBid, extended: shouldExtend };
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
      .populate("bidder", "name email role")
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
