import type { Product } from "./catalog";
export function roomSelection(
  items: Product[],
  selectedId: string,
  now: number,
) {
  const available = items
    .filter(
      (p) =>
        p.status === "active" &&
        Date.parse(p.startsAt) <= now &&
        Date.parse(p.endsAt) > now,
    )
    .slice(0, 4);
  const selected =
    available.find((p) => p._id === selectedId) ?? available[0] ?? null;
  return {
    available,
    selected,
    others: available.filter((p) => p._id !== selected?._id),
  };
}
