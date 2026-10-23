"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  Suspense,
  type ReactNode,
} from "react";
import type { Product } from "@/lib/catalog";
import { reconcileFavorite } from "@/lib/watchlist";
import type { AccountData, AccountResult } from "@/lib/account";
import { Icon, type IconName } from "./icon";
import { AccountLogin } from "./account-login";
type Session = {
  data: AccountData | null;
  error: string;
  refreshing: boolean;
  now: number;
  refresh: () => Promise<void>;
  favoriteChanged: (id: string, added?: Product) => void;
};
const AccountContext = createContext<Session | null>(null);
export function useAccount() {
  const session = useContext(AccountContext);
  if (!session) throw new Error("Account workspace required");
  return session;
}
const navigation: { href: string; label: string; icon: IconName }[] = [
  { href: "/cont", label: "Prezentare generală", icon: "grid" },
  { href: "/cont/imagini", label: "Fotografii ale produselor", icon: "image" },
  { href: "/cont/oferte", label: "Oferte și istoric", icon: "gavel" },
  { href: "/cont/anunturi", label: "Anunțurile mele", icon: "list" },
  { href: "/cont/favorite", label: "Favorite", icon: "heart" },
  { href: "/cont/verificare", label: "Verificare și cont", icon: "shield" },
];
function SidebarLinks({ active = "" }: { active?: string }) {
  return (
    <>
      {navigation.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={active === item.href ? "selected" : ""}
          aria-current={active === item.href ? "page" : undefined}
        >
          <Icon name={item.icon} />
          {item.label}
        </Link>
      ))}
    </>
  );
}
function ActiveSidebar() {
  const pathname = usePathname();
  const params = useSearchParams();
  const section = params.get("section");
  return (
    <SidebarLinks
      active={
        pathname === "/cont" && section ? `/cont?section=${section}` : pathname
      }
    />
  );
}
export function AccountWorkspace({
  children,
  initialResult,
}: {
  children: ReactNode;
  initialResult: AccountResult;
}) {
  const router = useRouter();
  const [data, setData] = useState<AccountData | null>(initialResult.data);
  const [unavailable, setUnavailable] = useState(initialResult.status === 503);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(initialResult.data?.updatedAt ?? 0);
  const pending = useRef(false);
  const epoch = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const favoriteVersion = useRef(0);
  function favoriteChanged(id: string, added?: Product) {
    favoriteVersion.current++;
    setData((current) =>
      current
        ? {
            ...current,
            favorites: reconcileFavorite(current.favorites, id, added),
          }
        : current,
    );
  }
  async function refresh() {
    if (pending.current) return;
    pending.current = true;
    const requestEpoch = epoch.current;
    const requestFavoriteVersion = favoriteVersion.current;
    const abort = new AbortController();
    controller.current = abort;
    setRefreshing(true);
    try {
      const response = await fetch("/api/dashboard", {
        cache: "no-store",
        signal: abort.signal,
      });
      if (requestEpoch !== epoch.current) return;
      if (response.status === 401) {
        setData(null);
        setError("");
        setUnavailable(false);
        return;
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      if (requestEpoch !== epoch.current) return;
      setData((current) =>
        requestFavoriteVersion === favoriteVersion.current
          ? payload
          : { ...payload, favorites: current?.favorites ?? null },
      );
      setNow(payload.updatedAt);
      setError("");
      setUnavailable(false);
    } catch (err) {
      if (!abort.signal.aborted && requestEpoch === epoch.current) {
        setError(
          err instanceof Error ? err.message : "Actualizarea nu a reușit.",
        );
        setUnavailable(true);
      }
    } finally {
      if (requestEpoch === epoch.current) {
        pending.current = false;
        setRefreshing(false);
      }
    }
  }
  const signedIn = Boolean(data);
  useEffect(() => {
    if (!signedIn) return;
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 30000);
    function visible() {
      if (!document.hidden) void refresh();
    }
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      controller.current?.abort();
      pending.current = false;
    };
  }, [signedIn]);
  async function logout() {
    epoch.current++;
    controller.current?.abort();
    pending.current = false;
    setRefreshing(true);
    try {
      const response = await fetch("/api/session", { method: "DELETE" });
      if (!response.ok) throw new Error();
      setData(null);
      setError("");
      setUnavailable(false);
      router.refresh();
    } catch {
      setError("Deconectarea nu a reușit. Încearcă din nou.");
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <AccountContext.Provider
      value={{ data, refresh, refreshing, error, now, favoriteChanged }}
    >
      <div className={`account-dashboard${signedIn ? "" : " account-guest"}`}>
        {signedIn && (
          <aside className="account-sidebar">
            <Link href="/" className="account-brand">
              <Image
                src="/pinbind-logo.svg"
                alt="Pinbind"
                width={148}
                height={38}
                priority
              />
            </Link>
            <span className="account-sidebar-label">Spațiul meu</span>
            <nav aria-label="Navigare cont">
              <Suspense fallback={<SidebarLinks />}>
                <ActiveSidebar />
              </Suspense>
            </nav>
            <Link href="/" className="account-return">
              <Icon name="arrow" size={18} />
              Înapoi la platformă
            </Link>
          </aside>
        )}
        <div className="account-workspace">
          <header className="account-topbar">
            {signedIn ? (
              <div>
                <Link href="/">Platformă</Link>
                <span>/</span>
                <strong>Contul meu</strong>
              </div>
            ) : (
              <Link href="/" aria-label="Pinbind — înapoi la platformă">
                <Image
                  src="/pinbind-logo.svg"
                  alt="Pinbind"
                  width={148}
                  height={38}
                  priority
                />
              </Link>
            )}
            <div>
              <Link href="/explore" aria-label="Caută în catalog">
                <Icon name="search" />
              </Link>
              <Link
                className="account-avatar-small"
                href="/cont?section=profile"
                aria-label="Profilul meu"
              >
                <Icon name="user" size={17} />
              </Link>
              {data && (
                <button onClick={logout} disabled={refreshing}>
                  Deconectare
                </button>
              )}
            </div>
          </header>
          <main id="catalog" className="account-main">
            {data ? (
              children
            ) : (
              <>
                <AccountLogin
                  onLogin={async () => {
                    await refresh();
                    router.refresh();
                  }}
                  unavailable={unavailable}
                />
                {error && (
                  <p className="account-error" role="alert">
                    {error}
                  </p>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </AccountContext.Provider>
  );
}
