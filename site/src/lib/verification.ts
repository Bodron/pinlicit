export type SellerApplicationView = {
  id: string;
  status: "pending" | "approved" | "rejected" | "unknown";
  createdAt: string | null;
  reviewedAt: string | null;
};
export const applicationLabels = {
  pending: "În analiză",
  approved: "Aprobată",
  rejected: "Respinsă",
  unknown: "Stare necunoscută",
};
export function publicApplications(rows: unknown): SellerApplicationView[] {
  if (!Array.isArray(rows)) throw new Error("Invalid applications response");
  return rows
    .filter((row) => row && typeof row._id === "string")
    .map((row) => ({
      id: row._id,
      status: ["pending", "approved", "rejected"].includes(row.status)
        ? row.status
        : "unknown",
      createdAt:
        typeof row.createdAt === "string" &&
        Number.isFinite(Date.parse(row.createdAt))
          ? row.createdAt
          : null,
      reviewedAt:
        typeof row.reviewedAt === "string" &&
        Number.isFinite(Date.parse(row.reviewedAt))
          ? row.reviewedAt
          : null,
    }))
    .sort(
      (a, b) =>
        Date.parse(b.createdAt ?? "1970-01-01") -
        Date.parse(a.createdAt ?? "1970-01-01"),
    );
}
