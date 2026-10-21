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
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../users/schemas/user.schema");
const product_schema_1 = require("./schemas/product.schema");
let ProductsService = class ProductsService {
    constructor(productModel) {
        this.productModel = productModel;
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
        return this.productModel.create({
            seller: seller._id,
            category: new mongoose_2.Types.ObjectId(dto.categoryId),
            title: dto.title,
            description: dto.description,
            videoKey: dto.videoKey,
            videoUrl: dto.videoUrl,
            thumbnailUrl: dto.thumbnailUrl,
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
        const now = new Date();
        const product = await this.productModel.findOneAndUpdate({
            _id: productId,
            status: product_schema_1.ProductStatus.Active,
            endsAt: { $gt: now },
            seller: { $ne: buyerId },
            $or: [
                { reservePrice: { $exists: false } },
                { reservePrice: null },
                { $expr: { $lte: ["$reservePrice", "$startingPrice"] } },
                { $expr: { $lt: ["$currentPrice", "$reservePrice"] } },
            ],
        }, {
            status: product_schema_1.ProductStatus.Reserved,
            reservedBy: new mongoose_2.Types.ObjectId(buyerId),
        }, { new: true });
        if (!product) {
            throw new common_1.BadRequestException("Product cannot be bought now.");
        }
        product.currentPrice = product.buyNowPrice;
        await product.save();
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
    __metadata("design:paramtypes", [mongoose_2.Model])
], ProductsService);
//# sourceMappingURL=products.service.js.map