import "server-only";
import type { Catalog, Category } from "./catalog";
export async function getMarketplaceData(): Promise<{
  catalog: Catalog | null;
  categories: Category[];
}> {
  const base = (
    process.env.API_INTERNAL_URL ?? "http://127.0.0.1:3000"
  ).replace(/\/$/, "");
  async function read<T>(path: string): Promise<T | null> {
    try {
      const response = await fetch(`${base}/${path}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      return response.ok ? await response.json() : null;
    } catch {
      return null;
    }
  }
  const [catalog, categories] = await Promise.all([
    read<Catalog>("products/catalog?stage=live&limit=4&sort=ending&page=1"),
    read<Category[]>("categories"),
  ]);
  return { catalog, categories: categories ?? [] };
}
