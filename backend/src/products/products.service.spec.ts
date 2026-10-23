import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { UserRole } from "../users/schemas/user.schema";
import { ProductsService } from "./products.service";

describe("ProductsService", () => {
  const productModel = {
    create: jest.fn(),
  };
  const service = new ProductsService(productModel as never);

  const validDto = {
    title: "Camera vintage",
    description: "Camera video in stare foarte buna.",
    categoryId: "507f1f77bcf86cd799439011",
    videoKey: "videos/demo.mp4",
    videoUrl: "https://example.com/demo.mp4",
    startingPrice: 1000,
    minBidIncrement: 100,
    buyNowPrice: 2500,
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 86_400_000).toISOString(),
  };

  beforeEach(() => {
    productModel.create.mockReset();
  });

  it("requires seller approval before creating a product", async () => {
    await expect(
      service.create({ _id: "user-id", role: UserRole.User }, validDto),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("requires buy-now price to be greater than starting price", async () => {
    await expect(
      service.create(
        { _id: "seller-id", role: UserRole.Seller },
        { ...validDto, buyNowPrice: validDto.startingPrice },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

import { CatalogQueryDto } from "./dto/catalog-query.dto";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

describe("Public catalog", () => {
  const rows = [{ title: "Audi A4" }];
  let chain: any;
  let model: any;
  let service: ProductsService;
  beforeEach(() => {
    chain = {
      populate: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(rows),
    };
    model = { find: jest.fn(() => chain), countDocuments: jest.fn().mockResolvedValue(15) };
    service = new ProductsService(model);
  });
  it("paginates on the server, returns real totals and avoids public seller contact fields", async () => {
    const result = await service.catalog(Object.assign(new CatalogQueryDto(), { page: 2, limit: 12 }));
    expect(chain.skip).toHaveBeenCalledWith(12);
    expect(chain.limit).toHaveBeenCalledWith(12);
    expect(chain.populate).toHaveBeenCalledWith("seller", "name role");
    expect(result).toMatchObject({ items: rows, total: 15, page: 2, pages: 2, stats: { activeTotal: 15, endingToday: 15 } });
  });
  it("escapes regex input and combines category, price and reserve filters", async () => {
    await service.catalog(Object.assign(new CatalogQueryDto(), {
      q: "Audi .*", categoryId: "507f1f77bcf86cd799439011", stage: "reserve", minPrice: 100, maxPrice: 5000, sort: "price-desc",
    }));
    const filter = model.find.mock.calls[0][0];
    expect(filter.$or[0].title.$regex).toBe("Audi \\.\\*");
    expect(filter.category).toBe("507f1f77bcf86cd799439011");
    expect(filter.currentPrice).toEqual({ $gte: 100, $lte: 5000 });
    expect(filter.$and).toHaveLength(1);
    expect(chain.sort).toHaveBeenCalledWith({ currentPrice: -1, _id: -1 });
  });
  it("rejects inverted price ranges before querying the database", async () => {
    await expect(service.catalog(Object.assign(new CatalogQueryDto(), { minPrice: 200, maxPrice: 100 }))).rejects.toBeInstanceOf(BadRequestException);
    expect(model.find).not.toHaveBeenCalled();
  });
  it("validates bounds and supported filters", async () => {
    const valid = plainToInstance(CatalogQueryDto, { page: "2", limit: "12", stage: "live", sort: "newest" });
    expect(await validate(valid)).toHaveLength(0);
    const invalid = plainToInstance(CatalogQueryDto, { page: "0", limit: "5000", sort: "injected", minPrice: "-1" });
    expect((await validate(invalid)).map(error => error.property)).toEqual(expect.arrayContaining(["page", "limit", "sort", "minPrice"]));
  });
});
