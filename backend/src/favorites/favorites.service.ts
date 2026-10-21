import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  ProductDocument,
  ProductStatus,
} from "../products/schemas/product.schema";
import { Product } from "../products/schemas/product.schema";
import { ProductsService } from "../products/products.service";
import { Favorite, FavoriteDocument } from "./schemas/favorite.schema";

@Injectable()
export class FavoritesService {
  constructor(
    @InjectModel(Favorite.name)
    private readonly favoriteModel: Model<FavoriteDocument>,
    private readonly productsService: ProductsService,
  ) {}

  async mine(userId: string) {
    const favorites = await this.favoriteModel
      .find({ user: new Types.ObjectId(userId) })
      .populate<{
        product: ProductDocument | null;
      }>({
        path: "product",
        match: { status: { $ne: ProductStatus.Hidden } },
        populate: [
          { path: "category", select: "name slug" },
          { path: "seller", select: "name email phone role" },
          { path: "reservedBy", select: "name email phone role" },
        ],
      })
      .sort({ createdAt: -1 });

    const products = favorites
      .map((favorite) => favorite.product)
      .filter((product): product is ProductDocument => product != null);

    const counts = await Promise.all(
      products.map((product) =>
        this.favoriteModel.countDocuments({ product: product._id }),
      ),
    );

    return products.map((product, index) => {
      product.favoriteCount = counts[index];
      return this.withFavoriteFlag(product);
    });
  }

  async add(userId: string, productId: string) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException("Invalid product id.");
    }

    const productModel = this.productsService.getModel();
    const product = await productModel.findOne({
      _id: productId,
      status: { $ne: ProductStatus.Hidden },
    });
    if (!product) {
      throw new NotFoundException("Product not found.");
    }
    if (product.seller.toString() === userId) {
      throw new BadRequestException("You cannot favorite your own product.");
    }

    const result = await this.favoriteModel.updateOne(
      {
        user: new Types.ObjectId(userId),
        product: new Types.ObjectId(productId),
      },
      {
        $setOnInsert: {
          user: new Types.ObjectId(userId),
          product: new Types.ObjectId(productId),
        },
      },
      { upsert: true },
    );

    if (result.upsertedCount > 0) {
      product.favoriteCount = (product.favoriteCount || 0) + 1;
      await product.save();
    } else if (!product.favoriteCount) {
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

  async remove(userId: string, productId: string) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException("Invalid product id.");
    }

    const result = await this.favoriteModel.deleteOne({
      user: new Types.ObjectId(userId),
      product: new Types.ObjectId(productId),
    });
    if (result.deletedCount > 0) {
      await this.productsService
        .getModel()
        .updateOne(
          { _id: productId, favoriteCount: { $gt: 0 } },
          { $inc: { favoriteCount: -1 } },
        );
    }
    return { productId, isFavorite: false };
  }

  private withFavoriteFlag(product: ProductDocument) {
    const json = product.toObject<Product & { _id: Types.ObjectId }>({
      virtuals: true,
    });
    return { ...json, isFavorite: true };
  }
}
