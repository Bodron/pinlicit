import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserRole } from "../users/schemas/user.schema";
import { CreateProductDto } from "./dto/create-product.dto";
import { FeedQueryDto } from "./dto/feed-query.dto";
import {
  Product,
  ProductDocument,
  ProductStatus,
} from "./schemas/product.schema";

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(seller: any, dto: CreateProductDto) {
    if (seller.role !== UserRole.Seller && seller.role !== UserRole.Admin) {
      throw new ForbiddenException(
        "Seller approval is required before listing products.",
      );
    }
    if (dto.reservePrice && dto.reservePrice < dto.startingPrice) {
      throw new BadRequestException(
        "Reserve price must be at least the starting price.",
      );
    }

    const minimumBuyNow = dto.reservePrice || dto.startingPrice;
    if (dto.buyNowPrice <= minimumBuyNow) {
      throw new BadRequestException(
        "Buy now price must be greater than the reserve or starting price.",
      );
    }

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) {
      throw new BadRequestException("Auction end must be after start.");
    }

    return this.productModel.create({
      seller: seller._id,
      category: new Types.ObjectId(dto.categoryId),
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
      status: ProductStatus.Active,
    });
  }

  async feed(query: FeedQueryDto) {
    const filter: Record<string, unknown> = {
      status: ProductStatus.Active,
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

  async findPublic(productId: string) {
    const product = await this.productModel
      .findById(productId)
      .populate("category", "name slug")
      .populate("seller", "name email phone role")
      .populate("reservedBy", "name email phone role");
    if (!product || product.status === ProductStatus.Hidden) {
      throw new NotFoundException("Product not found.");
    }
    return product;
  }

  findMine(userId: string) {
    return this.productModel
      .find({ seller: userId })
      .populate("category", "name slug")
      .sort({ createdAt: -1 });
  }

  async hide(productId: string) {
    const product = await this.productModel.findByIdAndUpdate(
      productId,
      { status: ProductStatus.Hidden },
      { new: true },
    );
    if (!product) {
      throw new NotFoundException("Product not found.");
    }
    return product;
  }

  async reserveByBuyNow(productId: string, buyerId: string) {
    const now = new Date();
    const product = await this.productModel.findOneAndUpdate(
      {
        _id: productId,
        status: ProductStatus.Active,
        endsAt: { $gt: now },
        seller: { $ne: buyerId },
        $or: [
          { reservePrice: { $exists: false } },
          { reservePrice: null },
          { $expr: { $lte: ["$reservePrice", "$startingPrice"] } },
          { $expr: { $lt: ["$currentPrice", "$reservePrice"] } },
        ],
      },
      {
        status: ProductStatus.Reserved,
        reservedBy: new Types.ObjectId(buyerId),
      },
      { new: true },
    );

    if (!product) {
      throw new BadRequestException("Product cannot be bought now.");
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
}
