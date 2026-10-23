import { Suspense } from "react";
import { getAccount } from "@/lib/account-server";
import { AccountWorkspace } from "@/components/account-workspace";
async function Workspace({ children }: { children: React.ReactNode }) {
  const result = await getAccount();
  return <AccountWorkspace initialResult={result}>{children}</AccountWorkspace>;
}
export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main id="catalog" className="page-status" aria-busy="true">
          Se încarcă contul…
        </main>
      }
    >
      <Workspace>{children}</Workspace>
    </Suspense>
  );
}
