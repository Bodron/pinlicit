import { BadRequestException } from "@nestjs/common";
import { Types } from "mongoose";
import { FavoritesService } from "./favorites.service";

describe("FavoritesService", () => {
  const sellerId = new Types.ObjectId().toString();
  const buyerId = new Types.ObjectId().toString();
  const productId = new Types.ObjectId().toString();
  let service: FavoritesService;
  let favorites: any;
  let products: any;
  let session: any;
  let product: any;

  beforeEach(() => {
    session = { withTransaction: jest.fn(async (action) => action()), endSession: jest.fn() };
    product = {
      _id: new Types.ObjectId(productId), seller: new Types.ObjectId(sellerId),
      favoriteCount: 4, toObject: jest.fn(() => ({ favoriteCount: 4 })),
    };
    const query = {
      session: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(),
      populate: jest.fn(async () => product),
      then: (resolve: any, reject: any) => Promise.resolve(product).then(resolve, reject),
    };
    products = {
      findOne: jest.fn(() => ({ session: jest.fn(async () => product) })),
      findById: jest.fn(() => query), updateOne: jest.fn(async () => ({ modifiedCount: 1 })),
    };
    favorites = {
      db: { startSession: jest.fn(async () => session) },
      updateOne: jest.fn(async () => ({ upsertedCount: 1 })),
      deleteOne: jest.fn(async () => ({ deletedCount: 1 })),
    };
    service = new FavoritesService(favorites, { getModel: () => products } as never);
  });

  it("rejects self-favorites before either collection is written", async () => {
    await expect(service.add(sellerId, productId)).rejects.toBeInstanceOf(BadRequestException);
    expect(favorites.updateOne).not.toHaveBeenCalled();
    expect(products.updateOne).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it("increments atomically in the same transaction as the inserted favorite", async () => {
    await service.add(buyerId, productId);
    expect(favorites.updateOne.mock.calls[0][2]).toEqual({ upsert: true, session });
    expect(products.updateOne).toHaveBeenCalledWith(
      { _id: productId }, { $inc: { favoriteCount: 1 } }, { session },
    );
  });

  it("repeated add is idempotent and never increments an existing favorite", async () => {
    favorites.updateOne.mockResolvedValue({ upsertedCount: 0 });
    const result = await service.add(buyerId, productId);
    expect(products.updateOne).not.toHaveBeenCalled();
    expect(result.isFavorite).toBe(true);
  });

  it("repeated remove does not decrement a count for another user", async () => {
    favorites.deleteOne.mockResolvedValue({ deletedCount: 0 });
    const result = await service.remove(buyerId, productId);
    expect(products.updateOne).not.toHaveBeenCalled();
    expect(result).toEqual({ productId, isFavorite: false, favoriteCount: 4 });
  });

  it("returns the authoritative count after removal and never decrements below zero", async () => {
    await service.remove(buyerId, productId);
    expect(products.updateOne).toHaveBeenCalledWith(
      { _id: productId, favoriteCount: { $gt: 0 } },
      { $inc: { favoriteCount: -1 } }, { session },
    );
  });

  it("retries a unique-index upsert race using a new transaction", async () => {
    favorites.updateOne.mockRejectedValueOnce({ code: 11000 }).mockResolvedValueOnce({ upsertedCount: 0 });
    await expect(service.add(buyerId, productId)).resolves.toMatchObject({ isFavorite: true });
    expect(session.withTransaction).toHaveBeenCalledTimes(2);
    expect(products.updateOne).not.toHaveBeenCalled();
  });
});
