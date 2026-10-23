import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicProduct } from "@/lib/product-server";
import { AuctionDetail } from "@/components/auction-detail";
export const metadata = { title: "Detalii licitație | Pinbind" };
async function Auction({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { product, status } = await getPublicProduct(id);
  if (status === 404) notFound();
  if (!product)
    return (
      <main className="page-status" id="catalog">
        <h1>Nu putem încărca anunțul momentan.</h1>
        <p>Platforma nu răspunde. Reîncarcă pagina sau revino la catalog.</p>
        <Link className="button button-primary" href="/explore">
          Înapoi la catalog
        </Link>
      </main>
    );
  return <AuctionDetail initialProduct={product} initialNow={Date.now()} />;
}
export default function AuctionPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="page-status" id="catalog" aria-busy="true">
          Se încarcă detaliile licitației…
        </main>
      }
    >
      <Auction {...props} />
    </Suspense>
  );
}
