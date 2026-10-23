"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { Icon } from "./icon";
import { Dialog } from "./dialog";
function NavigationLinks({ pathname }: { pathname?: string }) {
  return (
    <>
      {" "}
      <Link
        href="/"
        className={pathname === "/" ? "active" : ""}
        aria-current={pathname === "/" ? "page" : undefined}
      >
        Acasă
      </Link>
      <Link
        href="/explore"
        className={pathname === "/explore" ? "active" : ""}
        aria-current={pathname === "/explore" ? "page" : undefined}
      >
        Explorează
      </Link>
      <Link href="/explore?stage=live">Licitații active</Link>
      <Link
        href="/despre"
        className={pathname === "/despre" ? "active" : ""}
        aria-current={pathname === "/despre" ? "page" : undefined}
      >
        Despre noi
      </Link>
    </>
  );
}
function ActiveNavigation() {
  const pathname = usePathname();
  return <NavigationLinks pathname={pathname} />;
}
export function SiteShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [info, setInfo] = useState("");
  const infoText =
    info === "Vinde pe Pinbind"
      ? "Publică un anunț video din secțiunea Vinde a aplicației Pinbind. După aprobarea contului de vânzător, anunțul tău va apărea și în acest catalog."
      : info === "Contul tău Pinbind"
        ? "Autentificarea, ofertele și favoritele din cont sunt disponibile în aplicația Pinbind. Aici poți explora anunțurile și viziona prezentările video fără cont."
        : "Pinbind aduce licitațiile în prim-plan prin video. Explorează anunțurile, verifică descrierea și prețul curent, apoi folosește aplicația Pinbind pentru a licita sau pentru a lua legătura cu vânzătorul.";

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" href="/" aria-label="Pinbind — acasă">
            <Image
              src="/pinbind-logo.svg"
              alt="Pinbind"
              width={157}
              height={40}
              priority
            />
          </Link>
          <nav className="desktop-nav" aria-label="Navigare principală">
            <Suspense fallback={<NavigationLinks />}>
              <ActiveNavigation />
            </Suspense>
          </nav>
          <form
            className="header-search"
            action="/explore"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/explore?q=${encodeURIComponent(query)}`);
            }}
          >
            <Icon name="search" />
            <input
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Caută anunțuri, produse, video…"
              aria-label="Caută în catalog"
              maxLength={120}
            />
          </form>
          <div className="header-actions">
            <button
              className="button button-primary sell-button"
              onClick={() => setInfo("Vinde pe Pinbind")}
            >
              Începe să vinzi
            </button>
            <Link
              className="icon-button help-button"
              href="/despre"
              aria-label="Despre Pinbind"
            >
              <Icon name="shield" />
            </Link>
            <Link
              className="profile-button"
              href="/cont"
              aria-label="Contul tău Pinbind"
            >
              <Icon name="user" size={18} />
            </Link>
          </div>
        </div>
      </header>
      <div className="site-content">{children}</div>
      <footer className="site-footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <Image
              src="/pinbind-logo.svg"
              alt="Pinbind"
              width={148}
              height={38}
            />
            <p>
              O platformă de licitații în care produsele își spun povestea prin
              video.
            </p>
            <span>
              <Icon name="video" size={18} /> Descoperă fiecare detaliu.
            </span>
          </div>
          <div>
            <h2>Explorează</h2>
            <Link href="/explore">Toate anunțurile</Link>
            <Link href="/explore?stage=live">Licitații active</Link>
            <button onClick={() => setInfo("Vinde pe Pinbind")}>
              Devino vânzător
            </button>
          </div>
          <div>
            <h2>Despre Pinbind</h2>
            <a href="/#cum-functioneaza">Cum funcționează</a>
            <Link href="/cont">Contul și ofertele tale</Link>
            <Link href="/despre">Despre platformă</Link>
          </div>
          <div className="footer-editorial">
            <span className="eyebrow">Dincolo de o fotografie</span>
            <h2>
              Obiecte cu poveste.
              <br />
              Descoperiri cu sens.
            </h2>
            <p>Următoarea piesă preferată poate fi deja aici.</p>
            <Link href="/explore">
              Înapoi la selecție <Icon name="arrow" size={16} />
            </Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Pinbind. Toate drepturile rezervate.</span>
          <span>
            Creat pentru descoperiri, construit în jurul videoclipurilor.
          </span>
        </div>
      </footer>
      {info && (
        <Dialog title={info} onClose={() => setInfo("")}>
          <div className="info-content">
            <Icon name="video" size={38} />
            <p>{infoText}</p>
            <button
              className="button button-primary"
              onClick={() => setInfo("")}
            >
              Continuă explorarea <Icon name="arrow" size={16} />
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
