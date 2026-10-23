import type { Category, Product } from "./catalog";
import type { Position } from "./account";
export type ApiProduct = Omit<Product, "seller" | "category"> & {
  seller?: { name?: string } | string | null;
  category?: Category | string | null;
  highestBid?: string;
};
export type ApiBid = {
  _id: string;
  product: ApiProduct | null;
  amount: number;
  maxAmount?: number;
  createdAt: string;
};
export function accountProduct(p: ApiProduct): Product {
  return {
    _id: p._id,
    title: p.title,
    description: p.description,
    videoUrl: p.videoUrl,
    thumbnailUrl: p.thumbnailUrl,
    status: p.status,
    category: typeof p.category === "object" ? p.category : null,
    seller:
      p.seller && typeof p.seller === "object" && p.seller.name
        ? { name: p.seller.name }
        : null,
    currentPrice: p.currentPrice,
    startingPrice: p.startingPrice,
    reservePrice: p.reservePrice,
    buyNowPrice: p.buyNowPrice,
    minBidIncrement: p.minBidIncrement,
    startsAt: p.startsAt,
    endsAt: p.endsAt,
  };
}
export function positionsFromBids(bids: ApiBid[]): Position[] {
  const groups = new Map<string, ApiBid[]>();
  for (const bid of bids) {
    if (!bid.product || bid.product.status === "hidden") continue;
    const id = bid.product._id;
    const group = groups.get(id);
    if (group) group.push(bid);
    else groups.set(id, [bid]);
  }
  return [...groups.values()].map((group) => {
    const latest = group.reduce((a, b) =>
      Date.parse(a.createdAt) >= Date.parse(b.createdAt) ? a : b,
    );
    const p = latest.product!;
    return {
      product: accountProduct(p),
      maxAmount: group.reduce(
        (max, b) => Math.max(max, b.maxAmount ?? b.amount),
        0,
      ),
      leading: group.some((b) => b._id === String(p.highestBid)),
      lastBidAt: latest.createdAt,
    };
  });
}
