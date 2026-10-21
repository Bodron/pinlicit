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
exports.BidsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auctions_gateway_1 = require("../auctions/auctions.gateway");
const product_schema_1 = require("../products/schemas/product.schema");
const products_service_1 = require("../products/products.service");
const bid_schema_1 = require("./schemas/bid.schema");
let BidsService = class BidsService {
    constructor(bidModel, productsService, config, auctionsGateway) {
        this.bidModel = bidModel;
        this.productsService = productsService;
        this.config = config;
        this.auctionsGateway = auctionsGateway;
    }
    async placeBid(productId, bidderId, maxAmount) {
        const productModel = this.productsService.getModel();
        const product = await productModel.findById(productId);
        if (!product) {
            throw new common_1.BadRequestException("Product not found.");
        }
        if (product.seller.toString() === bidderId) {
            throw new common_1.ForbiddenException("You cannot bid on your own product.");
        }
        const requiredAmount = product.currentPrice + product.minBidIncrement;
        if (maxAmount < requiredAmount) {
            throw new common_1.BadRequestException(`Bid must be at least ${requiredAmount}.`);
        }
        const now = new Date();
        if (product.status !== product_schema_1.ProductStatus.Active || product.endsAt <= now) {
            throw new common_1.BadRequestException("Auction is not active.");
        }
        const antiSnipeWindowMs = (this.config.get("ANTI_SNIPE_WINDOW_SECONDS") || 60) * 1000;
        const antiSnipeExtensionMs = (this.config.get("ANTI_SNIPE_EXTENSION_SECONDS") || 60) * 1000;
        const shouldExtend = product.endsAt.getTime() - now.getTime() <= antiSnipeWindowMs;
        const nextEndsAt = shouldExtend
            ? new Date(product.endsAt.getTime() + antiSnipeExtensionMs)
            : product.endsAt;
        const currentLeader = await this.bidModel
            .findOne({ product: new mongoose_2.Types.ObjectId(productId) })
            .sort({ maxAmount: -1, createdAt: 1 });
        const currentLeaderMax = currentLeader?.maxAmount ?? currentLeader?.amount ?? 0;
        const currentLeaderId = currentLeader?.bidder?.toString();
        const bidderAlreadyLeads = currentLeaderId === bidderId;
        const bidderWillLead = !currentLeader || bidderAlreadyLeads || maxAmount > currentLeaderMax;
        const visibleAmount = this.publicAmount({
            currentPrice: product.currentPrice,
            increment: product.minBidIncrement,
            maxAmount,
            currentLeaderMax,
            bidderWillLead,
            bidderAlreadyLeads,
        });
        const bid = await this.bidModel.create({
            product: new mongoose_2.Types.ObjectId(productId),
            bidder: new mongoose_2.Types.ObjectId(bidderId),
            maxAmount,
            amount: bidderWillLead ? visibleAmount : maxAmount,
        });
        const updated = await productModel
            .findOneAndUpdate({
            _id: productId,
            status: product_schema_1.ProductStatus.Active,
            endsAt: { $gt: now },
        }, {
            currentPrice: visibleAmount,
            endsAt: nextEndsAt,
            ...(bidderWillLead ? { highestBid: bid._id } : {}),
        }, { new: true })
            .populate("category", "name slug")
            .populate("seller", "name email phone role");
        if (!updated) {
            await bid.deleteOne();
            throw new common_1.BadRequestException("Bid was not accepted. Auction state changed.");
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
    publicAmount({ currentPrice, increment, maxAmount, currentLeaderMax, bidderWillLead, bidderAlreadyLeads, }) {
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
    async placeBidLegacy(productId, bidderId, amount) {
        return this.placeBid(productId, bidderId, amount);
    }
    unusedLegacyMarker() {
        return undefined;
    }
    latestForProduct(productId, limit = 5) {
        return this.bidModel
            .find({ product: productId })
            .populate("bidder", "name email role")
            .sort({ createdAt: -1 })
            .limit(limit);
    }
    mine(userId) {
        return this.bidModel
            .find({ bidder: new mongoose_2.Types.ObjectId(userId) })
            .populate("product")
            .sort({ createdAt: -1 });
    }
};
exports.BidsService = BidsService;
exports.BidsService = BidsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(bid_schema_1.Bid.name)),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => auctions_gateway_1.AuctionsGateway))),
    __metadata("design:paramtypes", [mongoose_2.Model,
        products_service_1.ProductsService,
        config_1.ConfigService,
        auctions_gateway_1.AuctionsGateway])
], BidsService);
//# sourceMappingURL=bids.service.js.map