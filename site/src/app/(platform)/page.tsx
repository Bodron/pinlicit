import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Marketplace } from "@/components/marketplace";
import { getMarketplaceData } from "@/lib/marketplace-server";
async function HomeContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Preserve links to the catalog that were shared before it moved to /explore.
  const allowed = ["q", "categoryId", "stage"];
  const query = new URLSearchParams();
  for (const key of allowed)
    if (typeof params[key] === "string") query.set(key, params[key]);
  if (query.size) redirect(`/explore?${query}`);
  const data = await getMarketplaceData();
  return (
    <Marketplace
      initialCatalog={data.catalog}
      categories={data.categories}
      initialNow={Date.now()}
    />
  );
}
export default function Home(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <main id="catalog" className="page-status" aria-busy="true">
          Se încarcă Pinbind…
        </main>
      }
    >
      <HomeContent {...props} />
    </Suspense>
  );
}
