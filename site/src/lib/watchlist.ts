import type { Product } from "./catalog";
export function activeFavorite(p: Product, now: number) {
  return (
    p.status === "active" &&
    Date.parse(p.startsAt) <= now &&
    Date.parse(p.endsAt) > now
  );
}
export function endingFavorite(p: Product, now: number) {
  return activeFavorite(p, now) && Date.parse(p.endsAt) <= now + 86400000;
}
export function selectFavorites(
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
        (filter === "active"
          ? activeFavorite(p, now)
          : filter === "ending"
            ? endingFavorite(p, now)
            : filter === "closed"
              ? p.status !== "active" || Date.parse(p.endsAt) <= now
              : true) &&
        `${p.title} ${p.description} ${p._id}`
          .toLocaleLowerCase("ro")
          .includes(text),
    )
    .sort((a, b) =>
      sort === "price"
        ? b.currentPrice - a.currentPrice
        : Date.parse(a.endsAt) - Date.parse(b.endsAt),
    );
}
export function reconcileFavorite(
  products: Product[] | null,
  id: string,
  added?: Product,
) {
  if (products === null) return null;
  const rest = products.filter((p) => p._id !== id);
  return added ? [added, ...rest] : products === null ? null : rest;
}
