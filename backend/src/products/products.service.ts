import { UploadsService } from "../uploads/uploads.service";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommerceAccountsService } from "../commerce/commerce-accounts.service";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UserRole } from "../users/schemas/user.schema";
import { CreateProductDto } from "./dto/create-product.dto";
import { FeedQueryDto } from "./dto/feed-query.dto";
import { CatalogQueryDto } from "./dto/catalog-query.dto";
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
    @Optional() private readonly config?: ConfigService,
    @Optional() private readonly commerceAccounts?: CommerceAccountsService,
    @Optional() private readonly uploads?: UploadsService,
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

    const commerce = this.config?.get<string>("STRIPE_ENABLED") === "true";
    if (commerce) await this.commerceAccounts.requireSeller(String(seller._id));
    if (!this.uploads)
      throw new ServiceUnavailableException("Image processing is unavailable.");
    const image = await this.uploads.requireImage(
      dto.imageKey,
      String(seller._id),
    );
    return this.productModel.create({
      ...(commerce ? { commerceVersion: 1 } : {}),
      seller: seller._id,
      category: new Types.ObjectId(dto.categoryId),
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

  async catalog(query: CatalogQueryDto): Promise<{
    items: Record<string, any>[];
    total: number;
    page: number;
    pageSize: number;
    pages: number;
    stats: { activeTotal: number; endingToday: number };
  }> {
    const now = new Date();
    const base = { status: ProductStatus.Active, endsAt: { $gt: now } };
    const filter: Record<string, any> = { ...base };
    if (query.categoryId) filter.category = query.categoryId;
    if (query.q?.trim()) {
      const text = Array.from(query.q.trim(), (char) =>
        ".*+?^${}()|[]".includes(char) || char.charCodeAt(0) === 92
          ? String.fromCharCode(92) + char
          : char,
      ).join("");
      filter.$or = [
        { title: { $regex: text, $options: "i" } },
        { description: { $regex: text, $options: "i" } },
      ];
    }
    if (query.minPrice != null || query.maxPrice != null) {
      if (
        query.minPrice != null &&
        query.maxPrice != null &&
        query.minPrice > query.maxPrice
      ) {
        throw new BadRequestException(
          "Minimum price cannot exceed maximum price.",
        );
      }
      filter.currentPrice = {
        ...(query.minPrice != null ? { $gte: query.minPrice } : {}),
        ...(query.maxPrice != null ? { $lte: query.maxPrice } : {}),
      };
    }
    if (query.stage === "live") filter.startsAt = { $lte: now };
    if (query.stage === "ending")
      filter.endsAt = {
        $gt: now,
        $lte: new Date(now.getTime() + 12 * 3600000),
      };
    if (query.stage === "upcoming") filter.startsAt = { $gt: now };
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
    const sort: Record<string, 1 | -1> =
      query.sort === "newest"
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
    const candidate = await this.productModel
      .findById(productId)
      .select("commerceVersion seller");
    if (candidate && String(candidate.seller) === String(buyerId)) {
      throw new ForbiddenException("You cannot buy your own product.");
    }
    if (
      candidate &&
      this.config?.get<string>("STRIPE_ENABLED") === "true" &&
      candidate.commerceVersion !== 1
    )
      throw new ForbiddenException(
        "This legacy listing must be enrolled by its seller before Stripe checkout.",
      );
    if (candidate?.commerceVersion === 1) {
      if (!this.commerceAccounts)
        throw new ForbiddenException("Identity verification is required.");
      await this.commerceAccounts.requireBuyer(buyerId);
    }
    const now = new Date();
    const product = await this.productModel.findOneAndUpdate(
      {
        _id: productId,
        status: ProductStatus.Active,
        endsAt: { $gt: now },
        startsAt: { $lte: now },
        seller: { $ne: buyerId },
        $or: [
          { reservePrice: { $exists: false } },
          { reservePrice: null },
          { $expr: { $lte: ["$reservePrice", "$startingPrice"] } },
          { $expr: { $lt: ["$currentPrice", "$reservePrice"] } },
        ],
      },
      [
        {
          $set: {
            status: ProductStatus.Reserved,
            reservedBy: new Types.ObjectId(buyerId),
            reservedAt: now,
            currentPrice: "$buyNowPrice",
            __v: { $add: [{ $ifNull: ["$__v", 0] }, 1] },
          },
        },
      ],
      { new: true },
    );

    if (!product) {
      throw new BadRequestException("Product cannot be bought now.");
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
}
