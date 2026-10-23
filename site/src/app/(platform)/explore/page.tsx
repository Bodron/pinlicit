import { Suspense } from "react";
import { Explore } from "@/components/explore";
export const metadata = { title: "Explorează licitațiile | Pinbind" };
async function Catalog({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 120) : "";
  const stage = params.stage === "live" ? "live" : "all";
  const category =
    typeof params.categoryId === "string" &&
    /^[a-f\d]{24}$/i.test(params.categoryId)
      ? params.categoryId
      : "";
  return (
    <Explore
      key={`${q}:${stage}:${category}`}
      initialSearch={q}
      initialStage={stage}
      initialCategory={category}
    />
  );
}
export default function Home(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <main id="catalog" className="page-status">
          Se încarcă anunțurile…
        </main>
      }
    >
      <Catalog {...props} />
    </Suspense>
  );
}
