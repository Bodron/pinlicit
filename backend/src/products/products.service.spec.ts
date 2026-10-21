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
