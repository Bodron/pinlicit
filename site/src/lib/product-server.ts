import "server-only";
import type { Product } from "./catalog";

export async function getPublicProduct(
  id: string,
): Promise<{ product: Product | null; status: number }> {
  if (!/^[a-f\d]{24}$/i.test(id)) return { product: null, status: 404 };
  const base = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:3000";
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/products/${id}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      return { product: null, status: response.status === 404 ? 404 : 503 };
    const p = await response.json();
    // Pass only the fields this public page needs. Seller contact details,
    // reservation identities and internal storage keys stay on the server.
    return {
      status: 200,
      product: {
        _id: p._id,
        title: p.title,
        description: p.description,
        category: p.category
          ? {
              _id: p.category._id,
              name: p.category.name,
              slug: p.category.slug,
            }
          : null,
        seller: p.seller ? { name: p.seller.name } : null,
        videoUrl: p.videoUrl,
        thumbnailUrl: p.thumbnailUrl,
        status: p.status,
        currentPrice: p.currentPrice,
        startingPrice: p.startingPrice,
        reservePrice: p.reservePrice,
        minBidIncrement: p.minBidIncrement,
        buyNowPrice: p.buyNowPrice,
        startsAt: p.startsAt,
        endsAt: p.endsAt,
      },
    };
  } catch {
    return { product: null, status: 503 };
  }
}
