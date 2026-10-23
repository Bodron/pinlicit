import { Suspense } from "react";
import { AccountDashboard } from "@/components/account-dashboard";
export const metadata = {
  title: "Contul meu | Pinbind",
  robots: { index: false, follow: false },
};
async function Content({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const section =
    typeof query.section === "string" &&
    ["active", "closed", "favorites", "products", "profile"].includes(
      query.section,
    )
      ? query.section
      : "active";
  return <AccountDashboard key={section} initialTab={section} />;
}
export default function AccountPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<p>Se încarcă secțiunea…</p>}>
      <Content {...props} />
    </Suspense>
  );
}
