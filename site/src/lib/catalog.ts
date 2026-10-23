export type Category = { _id: string; name: string; slug: string };
export type Product = {
  _id: string;
  status?: "active" | "reserved" | "sold" | "hidden";
  title: string;
  description: string;
  imageUrl: string;
  imageVariants?: {
    url: string;
    width: number;
    height: number;
    bytes: number;
  }[];
  category?: Category | null;
  seller?: { name: string } | null;
  currentPrice: number;
  startingPrice: number;
  reservePrice?: number;
  buyNowPrice: number;
  minBidIncrement: number;
  favoriteCount?: number;
  startsAt: string;
  endsAt: string;
};
export type Catalog = {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  stats: { activeTotal: number; endingToday: number };
};
export const money = (bani: number) =>
  new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    maximumFractionDigits: 2,
  }).format(bani / 100);
export function categoryName(name?: string) {
  const names: Record<string, string> = {
    Casa: "Casă",
    Collectibles: "Obiecte de colecție",
    Fashion: "Modă",
  };
  return name ? (names[name] ?? name) : "Licitație";
}
export const reserveMet = (p: Product) =>
  !p.reservePrice ||
  p.reservePrice <= p.startingPrice ||
  p.currentPrice >= p.reservePrice;
export function remaining(endsAt: string, now: number) {
  const minutes = Math.max(0, Math.ceil((Date.parse(endsAt) - now) / 60000));
  if (!minutes) return "Încheiată";
  const days = Math.floor(minutes / 1440),
    hours = Math.floor(minutes / 60) % 24;
  return days
    ? `${days}z ${hours}h rămase`
    : `${hours}h ${minutes % 60}min rămase`;
}
