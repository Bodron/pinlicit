import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { BidsService } from "./bids.service";

describe("BidsService", () => {
  const productModel = {
    findById: jest.fn(),
  };
  const productsService = {
    getModel: () => productModel,
  };
  const service = new BidsService(
    {} as never,
    productsService as never,
    { get: jest.fn() } as never,
    { broadcastBid: jest.fn() } as never,
  );

  beforeEach(() => {
    productModel.findById.mockReset();
    productModel.findById.mockResolvedValue({
      seller: { toString: () => "seller-id" },
      currentPrice: 1000,
      minBidIncrement: 100,
      endsAt: new Date(Date.now() + 60_000),
    });
  });

  it("rejects bids on the bidder's own product", async () => {
    await expect(
      service.placeBid("product-id", "seller-id", 1200),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects bids below current price plus minimum increment", async () => {
    await expect(
      service.placeBid("product-id", "buyer-id", 1050),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
