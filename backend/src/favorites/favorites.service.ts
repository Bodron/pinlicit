import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ClientSession, Model, Types } from "mongoose";
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

    return this.inTransaction(async (session) => {
      const productModel = this.productsService.getModel();
      const product = await productModel.findOne({
        _id: productId,
        status: { $ne: ProductStatus.Hidden },
      }).session(session);
      if (!product) {
        throw new NotFoundException("Product not found.");
      }
      if (product.seller.toString() === userId) {
        throw new BadRequestException("You cannot favorite your own product.");
      }

      const result = await this.favoriteModel.updateOne(
        { user: new Types.ObjectId(userId), product: new Types.ObjectId(productId) },
        { $setOnInsert: {
          user: new Types.ObjectId(userId),
          product: new Types.ObjectId(productId),
        } },
        { upsert: true, session },
      );
      if (result.upsertedCount > 0) {
        await productModel.updateOne(
          { _id: productId },
          { $inc: { favoriteCount: 1 } },
          { session },
        );
      }
      const populated = await productModel.findById(productId).session(session).populate([
        { path: "category", select: "name slug" },
        { path: "seller", select: "name email phone role" },
        { path: "reservedBy", select: "name email phone role" },
      ]);
      return this.withFavoriteFlag(populated);
    });
  }

  async remove(userId: string, productId: string) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException("Invalid product id.");
    }
    return this.inTransaction(async (session) => {
      const result = await this.favoriteModel.deleteOne(
        { user: new Types.ObjectId(userId), product: new Types.ObjectId(productId) },
        { session },
      );
      const productModel = this.productsService.getModel();
      if (result.deletedCount > 0) {
        await productModel.updateOne(
          { _id: productId, favoriteCount: { $gt: 0 } },
          { $inc: { favoriteCount: -1 } },
          { session },
        );
      }
      const product = await productModel.findById(productId)
        .select("favoriteCount").session(session);
      return { productId, isFavorite: false, favoriteCount: product?.favoriteCount || 0 };
    });
  }

  // The favorite and its denormalized count commit together. MongoDB retries
  // transient write conflicts; a unique-index upsert race gets a fresh snapshot.
  private async inTransaction<T>(action: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await this.favoriteModel.db.startSession();
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          return await session.withTransaction(() => action(session));
        } catch (error) {
          if (error?.code !== 11000 || attempt > 0) throw error;
        }
      }
      throw new Error("Favorite transaction did not complete.");
    } finally {
      await session.endSession();
    }
  }

  private withFavoriteFlag(product: ProductDocument) {
    const json = product.toObject<Product & { _id: Types.ObjectId }>({
      virtuals: true,
    });
    return { ...json, isFavorite: true };
  }
}
