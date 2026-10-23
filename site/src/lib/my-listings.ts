import type { Product } from "./catalog";
export type ListingStage = "scheduled" | "live" | "reserved" | "closed";
export const listingStages = [
  {
    id: "scheduled",
    label: "Programate",
    note: "Anunțuri care vor începe la data stabilită.",
  },
  {
    id: "live",
    label: "Active",
    note: "Produse disponibile în licitație acum.",
  },
  {
    id: "reserved",
    label: "Rezervate",
    note: "Anunțuri marcate ca rezervate în platformă.",
  },
  {
    id: "closed",
    label: "Încheiate",
    note: "Anunțuri vândute sau cu perioada de licitare încheiată.",
  },
] as const;
export function listingStage(product: Product, now: number): ListingStage {
  if (product.status === "reserved") return "reserved";
  if (product.status !== "active" || Date.parse(product.endsAt) <= now)
    return "closed";
  return Date.parse(product.startsAt) > now ? "scheduled" : "live";
}
export function selectListings(
  products: Product[],
  filter: string,
  query: string,
  sort: string,
  now: number,
) {
  const text = query.trim().toLocaleLowerCase("ro");
  return products
    .filter(
      (p) =>
        p.status !== "hidden" &&
        (filter === "all" || listingStage(p, now) === filter) &&
        `${p.title} ${p.description} ${p._id}`
          .toLocaleLowerCase("ro")
          .includes(text),
    )
    .sort((a, b) =>
      sort === "price"
        ? b.currentPrice - a.currentPrice
        : sort === "title"
          ? a.title.localeCompare(b.title, "ro")
          : Date.parse(a.endsAt) - Date.parse(b.endsAt),
    );
}
