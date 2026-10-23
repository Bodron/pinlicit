import type { Position } from "./account";
export function isLivePosition(position: Position, now: number) {
  return (
    position.product.status === "active" &&
    Date.parse(position.product.endsAt) > now
  );
}
export function isClosedLeader(position: Position, now: number) {
  return (
    !isLivePosition(position, now) &&
    position.leading &&
    Date.parse(position.product.endsAt) <= now
  );
}
export function positionStatus(position: Position, now: number) {
  return isLivePosition(position, now)
    ? position.leading
      ? "Oferta ta conduce"
      : "Ofertă depășită"
    : position.product.status === "reserved"
      ? "Anunț rezervat"
      : position.product.status === "sold"
        ? "Anunț vândut"
        : position.leading
          ? "Încheiată în frunte"
          : "Încheiată";
}
export function selectPositions(
  positions: Position[],
  filter: string,
  query: string,
  sort: string,
  now: number,
) {
  const text = query.trim().toLocaleLowerCase("ro");
  return positions
    .filter((p) => {
      const live = isLivePosition(p, now);
      const match =
        filter === "active"
          ? live
          : filter === "outbid"
            ? live && !p.leading
            : filter === "leading-closed"
              ? isClosedLeader(p, now)
              : filter === "closed"
                ? !live && !isClosedLeader(p, now)
                : true;
      return (
        match &&
        `${p.product.title} ${p.product.description} ${p.product._id}`
          .toLocaleLowerCase("ro")
          .includes(text)
      );
    })
    .sort((a, b) =>
      sort === "price"
        ? b.product.currentPrice - a.product.currentPrice
        : sort === "recent"
          ? Date.parse(b.lastBidAt) - Date.parse(a.lastBidAt)
          : Date.parse(a.product.endsAt) - Date.parse(b.product.endsAt),
    );
}
function csvCell(value: string | number) {
  const text = String(value);
  const safe = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function ledgerCsv(positions: Position[], now: number) {
  const header = [
    "ID anunț",
    "Produs",
    "Preț curent RON",
    "Maximul tău RON",
    "Stare la export",
    "Sfârșit licitație UTC",
    "Ultima ta ofertă UTC",
  ];
  const rows = positions.map((p) => [
    p.product._id,
    p.product.title,
    (p.product.currentPrice / 100).toFixed(2),
    (p.maxAmount / 100).toFixed(2),
    positionStatus(p, now),
    p.product.endsAt,
    p.lastBidAt,
  ]);
  return (
    "\uFEFF" +
    [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n")
  );
}
