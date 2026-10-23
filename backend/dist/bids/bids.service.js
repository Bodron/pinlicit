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
const bid_deposits_service_1 = require("../commerce/bid-deposits.service");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const commerce_accounts_service_1 = require("../commerce/commerce-accounts.service");
const mongoose_2 = require("mongoose");
const auctions_gateway_1 = require("../auctions/auctions.gateway");
const product_schema_1 = require("../products/schemas/product.schema");
const products_service_1 = require("../products/products.service");
const bid_schema_1 = require("./schemas/bid.schema");
let BidsService = class BidsService {
    constructor(bidModel, productsService, config, auctionsGateway, commerceAccounts, deposits) {
        this.bidModel = bidModel;
        this.productsService = productsService;
        this.config = config;
        this.auctionsGateway = auctionsGateway;
        this.commerceAccounts = commerceAccounts;
        this.deposits = deposits;
    }
    validateBid(product, bidderId, maxAmount) {
        if (!product)
            throw new common_1.BadRequestException("Product not found.");
        if (String(product.seller) === bidderId)
            throw new common_1.ForbiddenException("You cannot bid on your own product.");
        if (!Number.isSafeInteger(maxAmount) ||
            maxAmount < product.currentPrice + product.minBidIncrement) {
            throw new common_1.BadRequestException(`Bid must be at least ${product.currentPrice + product.minBidIncrement}.`);
        }
        const now = new Date();
        if (product.status !== product_schema_1.ProductStatus.Active ||
            product.endsAt <= now ||
            (product.startsAt && product.startsAt > now)) {
            throw new common_1.BadRequestException("Auction is not active.");
        }
    }
    async placeBid(productId, bidderId, maxAmount) {
        const model = this.productsService.getModel();
        const initial = await model.findById(productId);
        this.validateBid(initial, bidderId, maxAmount);
        if (this.config.get("STRIPE_ENABLED") === "true" &&
            initial.commerceVersion !== 1)
            throw new common_1.ForbiddenException("This legacy listing must be enrolled by its seller before accepting paid bids.");
        if (initial.commerceVersion === 1) {
            if (!this.commerceAccounts)
                throw new common_1.ForbiddenException("Identity verification is required.");
            await this.commerceAccounts.requireBuyer(bidderId);
        }
        const result = await model.db.transaction(async (session) => {
            const product = await model.findById(productId).session(session);
            this.validateBid(product, bidderId, maxAmount);
            if (product.commerceVersion === 1) {
                if (!this.deposits)
                    throw new common_1.ForbiddenException("Guarantee processing unavailable.");
                await this.deposits.require(productId, bidderId, maxAmount, session);
            }
            const now = new Date();
            const window = (this.config.get("ANTI_SNIPE_WINDOW_SECONDS") || 60) * 1000;
            const extension = (this.config.get("ANTI_SNIPE_EXTENSION_SECONDS") || 60) * 1000;
            const shouldExtend = product.endsAt.getTime() - now.getTime() <= window;
            const leader = await this.bidModel
                .findOne({ product: new mongoose_2.Types.ObjectId(productId) })
                .sort({ maxAmount: -1, createdAt: 1, _id: 1 })
                .session(session);
            const leaderMax = leader?.maxAmount ?? leader?.amount ?? 0;
            const alreadyLeads = String(leader?.bidder) === bidderId;
            const willLead = !leader || alreadyLeads || maxAmount > leaderMax;
            if (alreadyLeads && maxAmount <= leaderMax)
                throw new common_1.BadRequestException("Maximum bid must increase.");
            const quoted = this.publicAmount({
                currentPrice: product.currentPrice,
                increment: product.minBidIncrement,
                maxAmount,
                currentLeaderMax: leaderMax,
                bidderWillLead: willLead,
                bidderAlreadyLeads: alreadyLeads,
            });
            const winningMax = willLead ? maxAmount : leaderMax;
            const visible = product.reservePrice && winningMax >= product.reservePrice
                ? Math.max(quoted, product.reservePrice)
                : quoted;
            const [bid] = await this.bidModel.create([
                {
                    product: product._id,
                    bidder: new mongoose_2.Types.ObjectId(bidderId),
                    maxAmount,
                    amount: willLead ? visible : maxAmount,
                },
            ], { session });
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
        this.auctionsGateway.broadcastBid(result.product, result.bid, result.extended);
        return result;
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
            .select("amount createdAt bidder")
            .populate("bidder", "name role")
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
    __param(4, (0, common_1.Optional)()),
    __param(5, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        products_service_1.ProductsService,
        config_1.ConfigService,
        auctions_gateway_1.AuctionsGateway,
        commerce_accounts_service_1.CommerceAccountsService,
        bid_deposits_service_1.BidDepositsService])
], BidsService);
//# sourceMappingURL=bids.service.js.map