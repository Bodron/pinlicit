import { proxyPublic } from "@/lib/api-proxy";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const allowed = new Set([
    "q",
    "categoryId",
    "page",
    "limit",
    "sort",
    "stage",
    "minPrice",
    "maxPrice",
  ]);
  const safe = new URLSearchParams(
    [...query].filter(([key]) => allowed.has(key)),
  );
  return proxyPublic("products/catalog", safe);
}
