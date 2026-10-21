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
exports.FavoritesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const product_schema_1 = require("../products/schemas/product.schema");
const products_service_1 = require("../products/products.service");
const favorite_schema_1 = require("./schemas/favorite.schema");
let FavoritesService = class FavoritesService {
    constructor(favoriteModel, productsService) {
        this.favoriteModel = favoriteModel;
        this.productsService = productsService;
    }
    async mine(userId) {
        const favorites = await this.favoriteModel
            .find({ user: new mongoose_2.Types.ObjectId(userId) })
            .populate({
            path: "product",
            match: { status: { $ne: product_schema_1.ProductStatus.Hidden } },
            populate: [
                { path: "category", select: "name slug" },
                { path: "seller", select: "name email phone role" },
                { path: "reservedBy", select: "name email phone role" },
            ],
        })
            .sort({ createdAt: -1 });
        const products = favorites
            .map((favorite) => favorite.product)
            .filter((product) => product != null);
        const counts = await Promise.all(products.map((product) => this.favoriteModel.countDocuments({ product: product._id })));
        return products.map((product, index) => {
            product.favoriteCount = counts[index];
            return this.withFavoriteFlag(product);
        });
    }
    async add(userId, productId) {
        if (!mongoose_2.Types.ObjectId.isValid(productId)) {
            throw new common_1.BadRequestException("Invalid product id.");
        }
        const productModel = this.productsService.getModel();
        const product = await productModel.findOne({
            _id: productId,
            status: { $ne: product_schema_1.ProductStatus.Hidden },
        });
        if (!product) {
            throw new common_1.NotFoundException("Product not found.");
        }
        if (product.seller.toString() === userId) {
            throw new common_1.BadRequestException("You cannot favorite your own product.");
        }
        const result = await this.favoriteModel.updateOne({
            user: new mongoose_2.Types.ObjectId(userId),
            product: new mongoose_2.Types.ObjectId(productId),
        }, {
            $setOnInsert: {
                user: new mongoose_2.Types.ObjectId(userId),
                product: new mongoose_2.Types.ObjectId(productId),
            },
        }, { upsert: true });
        if (result.upsertedCount > 0) {
            product.favoriteCount = (product.favoriteCount || 0) + 1;
            await product.save();
        }
        else if (!product.favoriteCount) {
            product.favoriteCount = await this.favoriteModel.countDocuments({
                product: product._id,
            });
            await product.save();
        }
        const populated = await product.populate([
            { path: "category", select: "name slug" },
            { path: "seller", select: "name email phone role" },
            { path: "reservedBy", select: "name email phone role" },
        ]);
        return this.withFavoriteFlag(populated);
    }
    async remove(userId, productId) {
        if (!mongoose_2.Types.ObjectId.isValid(productId)) {
            throw new common_1.BadRequestException("Invalid product id.");
        }
        const result = await this.favoriteModel.deleteOne({
            user: new mongoose_2.Types.ObjectId(userId),
            product: new mongoose_2.Types.ObjectId(productId),
        });
        if (result.deletedCount > 0) {
            await this.productsService
                .getModel()
                .updateOne({ _id: productId, favoriteCount: { $gt: 0 } }, { $inc: { favoriteCount: -1 } });
        }
        return { productId, isFavorite: false };
    }
    withFavoriteFlag(product) {
        const json = product.toObject({
            virtuals: true,
        });
        return { ...json, isFavorite: true };
    }
};
exports.FavoritesService = FavoritesService;
exports.FavoritesService = FavoritesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(favorite_schema_1.Favorite.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        products_service_1.ProductsService])
], FavoritesService);
//# sourceMappingURL=favorites.service.js.map