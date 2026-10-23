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
exports.ProductsService = void 0;
const uploads_service_1 = require("../uploads/uploads.service");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const commerce_accounts_service_1 = require("../commerce/commerce-accounts.service");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../users/schemas/user.schema");
const product_schema_1 = require("./schemas/product.schema");
let ProductsService = class ProductsService {
    constructor(productModel, config, commerceAccounts, uploads) {
        this.productModel = productModel;
        this.config = config;
        this.commerceAccounts = commerceAccounts;
        this.uploads = uploads;
    }
    async create(seller, dto) {
        if (seller.role !== user_schema_1.UserRole.Seller && seller.role !== user_schema_1.UserRole.Admin) {
            throw new common_1.ForbiddenException("Seller approval is required before listing products.");
        }
        if (dto.reservePrice && dto.reservePrice < dto.startingPrice) {
            throw new common_1.BadRequestException("Reserve price must be at least the starting price.");
        }
        const minimumBuyNow = dto.reservePrice || dto.startingPrice;
        if (dto.buyNowPrice <= minimumBuyNow) {
            throw new common_1.BadRequestException("Buy now price must be greater than the reserve or starting price.");
        }
        const startsAt = new Date(dto.startsAt);
        const endsAt = new Date(dto.endsAt);
        if (endsAt <= startsAt) {
            throw new common_1.BadRequestException("Auction end must be after start.");
        }
        const commerce = this.config?.get("STRIPE_ENABLED") === "true";
        if (commerce)
            await this.commerceAccounts.requireEligibleSeller(String(seller._id));
        if (!this.uploads)
            throw new common_1.ServiceUnavailableException("Image processing is unavailable.");
        const image = await this.uploads.requireImage(dto.imageKey, String(seller._id));
        return this.productModel.create({
            ...(commerce ? { commerceVersion: 1 } : {}),
            seller: seller._id,
            category: new mongoose_2.Types.ObjectId(dto.categoryId),
            title: dto.title,
            description: dto.description,
            imageKey: dto.imageKey,
            imageUrl: image.imageUrl,
            imageVariants: image.variants,
            startingPrice: dto.startingPrice,
            reservePrice: dto.reservePrice,
            currentPrice: dto.startingPrice,
            minBidIncrement: dto.minBidIncrement,
            buyNowPrice: dto.buyNowPrice,
            startsAt,
            endsAt,
            status: product_schema_1.ProductStatus.Active,
        });
    }
    async feed(query) {
        const filter = {
            status: product_schema_1.ProductStatus.Active,
            endsAt: { $gt: new Date() },
        };
        if (query.categoryId) {
            filter.category = query.categoryId;
        }
        return this.productModel
            .find(filter)
            .populate("category", "name slug")
            .populate("seller", "name email phone role")
            .sort({ endsAt: 1, updatedAt: -1, createdAt: -1 })
            .limit(query.limit);
    }
    async catalog(query) {
        const now = new Date();
        const base = { status: product_schema_1.ProductStatus.Active, endsAt: { $gt: now } };
        const filter = { ...base };
        if (query.categoryId)
            filter.category = query.categoryId;
        if (query.q?.trim()) {
            const text = Array.from(query.q.trim(), (char) => ".*+?^${}()|[]".includes(char) || char.charCodeAt(0) === 92
                ? String.fromCharCode(92) + char
                : char).join("");
            filter.$or = [
                { title: { $regex: text, $options: "i" } },
                { description: { $regex: text, $options: "i" } },
            ];
        }
        if (query.minPrice != null || query.maxPrice != null) {
            if (query.minPrice != null &&
                query.maxPrice != null &&
                query.minPrice > query.maxPrice) {
                throw new common_1.BadRequestException("Minimum price cannot exceed maximum price.");
            }
            filter.currentPrice = {
                ...(query.minPrice != null ? { $gte: query.minPrice } : {}),
                ...(query.maxPrice != null ? { $lte: query.maxPrice } : {}),
            };
        }
        if (query.stage === "live")
            filter.startsAt = { $lte: now };
        if (query.stage === "ending")
            filter.endsAt = {
                $gt: now,
                $lte: new Date(now.getTime() + 12 * 3600000),
            };
        if (query.stage === "upcoming")
            filter.startsAt = { $gt: now };
        if (query.stage === "reserve")
            filter.$and = [
                {
                    $or: [
                        { reservePrice: { $exists: false } },
                        { reservePrice: null },
                        { $expr: { $lte: ["$reservePrice", "$startingPrice"] } },
                        { $expr: { $gte: ["$currentPrice", "$reservePrice"] } },
                    ],
                },
            ];
        const sort = query.sort === "newest"
            ? { createdAt: -1, _id: -1 }
            : query.sort === "price-desc"
                ? { currentPrice: -1, _id: -1 }
                : query.sort === "price-asc"
                    ? { currentPrice: 1, _id: 1 }
                    : { endsAt: 1, _id: 1 };
        const [items, total, activeTotal, endingToday] = await Promise.all([
            this.productModel
                .find(filter)
                .populate("category", "name slug")
                .populate("seller", "name role")
                .sort(sort)
                .skip((query.page - 1) * query.limit)
                .limit(query.limit)
                .lean(),
            this.productModel.countDocuments(filter),
            this.productModel.countDocuments(base),
            this.productModel.countDocuments({
                ...base,
                endsAt: { $gt: now, $lte: new Date(now.getTime() + 24 * 3600000) },
            }),
        ]);
        return {
            items: items.map((item) => {
                const result = {
                    ...item,
                    imageUrl: item.imageUrl || item.thumbnailUrl || "",
                };
                delete result.thumbnailUrl;
                return result;
            }),
            total,
            page: query.page,
            pageSize: query.limit,
            pages: Math.ceil(total / query.limit),
            stats: { activeTotal, endingToday },
        };
    }
    async findPublic(productId) {
        const product = await this.productModel
            .findById(productId)
            .populate("category", "name slug")
            .populate("seller", "name email phone role")
            .populate("reservedBy", "name email phone role");
        if (!product || product.status === product_schema_1.ProductStatus.Hidden) {
            throw new common_1.NotFoundException("Product not found.");
        }
        return product;
    }
    findMine(userId) {
        return this.productModel
            .find({ seller: userId })
            .populate("category", "name slug")
            .sort({ createdAt: -1 });
    }
    async hide(productId) {
        const product = await this.productModel.findByIdAndUpdate(productId, { status: product_schema_1.ProductStatus.Hidden }, { new: true });
        if (!product) {
            throw new common_1.NotFoundException("Product not found.");
        }
        return product;
    }
    async reserveByBuyNow(productId, buyerId) {
        const candidate = await this.productModel
            .findById(productId)
            .select("commerceVersion seller");
        if (candidate && String(candidate.seller) === String(buyerId)) {
            throw new common_1.ForbiddenException("You cannot buy your own product.");
        }
        if (candidate &&
            this.config?.get("STRIPE_ENABLED") === "true" &&
            candidate.commerceVersion !== 1)
            throw new common_1.ForbiddenException("This legacy listing must be enrolled by its seller before Stripe checkout.");
        if (candidate?.commerceVersion === 1) {
            if (!this.commerceAccounts)
                throw new common_1.ForbiddenException("Identity verification is required.");
            await this.commerceAccounts.requireBuyer(buyerId);
        }
        const now = new Date();
        const product = await this.productModel.findOneAndUpdate({
            _id: productId,
            status: product_schema_1.ProductStatus.Active,
            endsAt: { $gt: now },
            startsAt: { $lte: now },
            seller: { $ne: buyerId },
            $or: [
                { reservePrice: { $exists: false } },
                { reservePrice: null },
                { $expr: { $lte: ["$reservePrice", "$startingPrice"] } },
                { $expr: { $lt: ["$currentPrice", "$reservePrice"] } },
            ],
        }, [
            {
                $set: {
                    status: product_schema_1.ProductStatus.Reserved,
                    reservedBy: new mongoose_2.Types.ObjectId(buyerId),
                    reservedAt: now,
                    currentPrice: "$buyNowPrice",
                    __v: { $add: [{ $ifNull: ["$__v", 0] }, 1] },
                },
            },
        ], { new: true });
        if (!product) {
            throw new common_1.BadRequestException("Product cannot be bought now.");
        }
        return product.populate([
            { path: "seller", select: "name email phone role" },
            { path: "reservedBy", select: "name email phone role" },
            { path: "category", select: "name slug" },
        ]);
    }
    getModel() {
        return this.productModel;
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(product_schema_1.Product.name)),
    __param(1, (0, common_1.Optional)()),
    __param(2, (0, common_1.Optional)()),
    __param(3, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        config_1.ConfigService,
        commerce_accounts_service_1.CommerceAccountsService,
        uploads_service_1.UploadsService])
], ProductsService);
//# sourceMappingURL=products.service.js.map