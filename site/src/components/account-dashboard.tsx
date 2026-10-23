"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Position } from "@/lib/account";
import { type Product, money, remaining } from "@/lib/catalog";
import {
  useSavedSearches,
  saveSearch,
  removeSearch,
} from "@/lib/saved-searches";
import { Icon, type IconName } from "./icon";
import { Countdown } from "./countdown";
import { useAccount } from "./account-workspace";
const tabs = [
  { id: "active", label: "Oferte active", icon: "gavel" },
  { id: "closed", label: "Licitații încheiate", icon: "clock" },
  { id: "favorites", label: "Favorite", icon: "heart" },
  { id: "products", label: "Anunțurile mele", icon: "list" },
  { id: "profile", label: "Datele contului", icon: "user" },
] as const;
function active(product: Product, now: number) {
  return product.status === "active" && Date.parse(product.endsAt) > now;
}
function ProductRow({
  product,
  position,
  now,
}: {
  product: Product;
  position?: Position;
  now: number;
}) {
  const isActive = active(product, now);
  const label =
    product.status === "sold"
      ? "Vândut"
      : product.status === "reserved"
        ? "Rezervat"
        : !isActive
          ? "Încheiată"
          : position
            ? position.leading
              ? "Oferta ta conduce"
              : "Ofertă depășită"
            : "Activ";
  return (
    <article className="account-product-row">
      <div className="account-lot">
        <div className="account-lot-thumb">
          {product.thumbnailUrl ? (
            <Image
              src={product.thumbnailUrl}
              alt=""
              fill
              unoptimized
              sizes="64px"
            />
          ) : (
            <Icon name="video" size={24} />
          )}
        </div>
        <div>
          <span>Anunț #{product._id.slice(-6).toUpperCase()}</span>
          <h3>
            <Link href={`/anunturi/${product._id}`}>{product.title}</Link>
          </h3>
          <p>{product.description}</p>
        </div>
      </div>
      <div className="account-row-price">
        <strong>{money(product.currentPrice)}</strong>
        {position && <span>Maximul tău: {money(position.maxAmount)}</span>}
      </div>
      <div>
        <span
          className={`account-status ${position && !position.leading && isActive ? "outbid" : ""}`}
        >
          {label}
        </span>
      </div>
      <div className="account-remaining">
        <Icon name="clock" size={15} />
        {remaining(product.endsAt, now)}
      </div>
      <Link
        className="account-row-action"
        href={`/anunturi/${product._id}`}
        aria-label={`Vezi anunțul ${product.title}`}
      >
        <Icon name="arrow" size={17} />
      </Link>
    </article>
  );
}
export function AccountDashboard({
  initialTab = "active",
}: {
  initialTab?: string;
}) {
  const { data, refresh, refreshing, error, now } = useAccount();
  const [tab, setTab] = useState(initialTab);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("ending");
  const [tablePage, setTablePage] = useState({ key: "", page: 1 });
  const [notice, setNotice] = useState("");
  const [searchText, setSearchText] = useState("");
  const searches = useSavedSearches();
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  const positions = data?.positions;
  const live = positions?.filter((p) => active(p.product, now)) ?? [];
  const closed = positions?.filter((p) => !active(p.product, now)) ?? [];
  const outbid = live.filter((p) => !p.leading);
  const urgent = [...outbid].sort(
    (a, b) => Date.parse(a.product.endsAt) - Date.parse(b.product.endsAt),
  )[0];
  const counts: Record<string, number | null> = {
    active: positions ? live.length : null,
    closed: positions ? closed.length : null,
    favorites: data?.favorites?.length ?? null,
    products: data?.products?.length ?? null,
  };
  const source =
    tab === "active"
      ? live.map((p) => ({ product: p.product, position: p }))
      : tab === "closed"
        ? closed.map((p) => ({ product: p.product, position: p }))
        : ((tab === "favorites" ? data?.favorites : data?.products)?.map(
            (product) => ({ product, position: undefined }),
          ) ?? []);
  const rows = source
    .filter((row) =>
      `${row.product.title} ${row.product.description}`
        .toLocaleLowerCase("ro")
        .includes(query.toLocaleLowerCase("ro")),
    )
    .sort((a, b) =>
      sort === "price"
        ? b.product.currentPrice - a.product.currentPrice
        : Date.parse(a.product.endsAt) - Date.parse(b.product.endsAt),
    );
  const tableKey = `${tab}:${query}:${sort}`;
  const pages = Math.max(1, Math.ceil(rows.length / 12));
  const currentPage = Math.min(
    pages,
    tablePage.key === tableKey ? tablePage.page : 1,
  );
  const visibleRows = rows.slice((currentPage - 1) * 12, currentPage * 12);
  function selectTab(id: string) {
    setTab(id);
    setQuery("");
    document
      .getElementById("account-table")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (!data) return null;
  return (
    <>
      <section className="account-profile-bar">
        <div className="account-profile">
          <span className="account-avatar">
            {data.user.name
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase()}
          </span>
          <div>
            <div>
              <h1>{data.user.name}</h1>
              <span className="account-role">
                {data.user.role === "seller"
                  ? "Vânzător"
                  : data.user.role === "admin"
                    ? "Administrator"
                    : "Cumpărător"}
              </span>
            </div>
            <p>
              <Icon name="user" size={14} />
              {data.user.email}
            </p>
            <span className="account-small">
              Ofertele, favoritele și anunțurile contului tău.
            </span>
          </div>
        </div>
        <div className="account-profile-actions">
          <div>
            <span>Maximele tale active</span>
            <strong>
              {positions
                ? money(live.reduce((sum, p) => sum + p.maxAmount, 0))
                : "—"}
            </strong>
            <small>Suma plafoanelor ofertate, nu un sold.</small>
          </div>
          <Link href="/explore" className="button button-primary">
            Descoperă anunțuri
            <Icon name="arrow" size={17} />
          </Link>
          <button
            className="account-icon-control"
            onClick={() => selectTab("profile")}
            aria-label="Datele contului"
          >
            <Icon name="user" />
          </button>
        </div>
      </section>
      <section className="account-metrics" aria-label="Rezumatul contului">
        {[
          {
            label: "Oferte active",
            value: positions ? live.length : null,
            note: "Licitații la care participi",
            bottom: positions
              ? `${live.filter((p) => p.leading).length} cu oferta în frunte`
              : "Date indisponibile",
            icon: "gavel",
            id: "active",
          },
          {
            label: "Oferte depășite",
            value: positions ? outbid.length : null,
            note: "Verifică prețul actual",
            bottom: "Confirmă o nouă ofertă în aplicație",
            icon: "bell",
            id: "active",
          },
          {
            label: "Licitații încheiate",
            value: positions ? closed.length : null,
            note: "Istoricul participărilor tale",
            bottom: "Rezultatele și predarea se verifică în aplicație",
            icon: "clock",
            id: "closed",
          },
          {
            label: "Favorite",
            value: data.favorites?.length ?? null,
            note: "Produse salvate în cont",
            bottom: "Sincronizate cu aplicația Pinbind",
            icon: "heart",
            id: "favorites",
          },
        ].map((metric) => (
          <button
            key={metric.label}
            className={
              metric.label === "Oferte depășite" && outbid.length
                ? "account-metric is-alert"
                : "account-metric"
            }
            onClick={() => selectTab(metric.id)}
          >
            <span>
              {metric.label}
              <Icon name={metric.icon as IconName} size={19} />
            </span>
            <strong>{metric.value ?? "—"}</strong>
            <p>{metric.note}</p>
            <small>{metric.bottom}</small>
          </button>
        ))}
      </section>
      {error && (
        <div className="account-error" role="alert">
          {error}
          <button onClick={() => void refresh()} disabled={refreshing}>
            Reîncearcă
          </button>
        </div>
      )}
      {data.warnings.length > 0 && (
        <div className="account-error" role="status">
          {data.warnings.join(" ")}
          <button onClick={() => void refresh()} disabled={refreshing}>
            Reîncearcă
          </button>
        </div>
      )}
      {urgent && (
        <section className="account-urgent">
          <div>
            <span className="account-urgent-icon">
              <Icon name="gavel" size={28} />
            </span>
            <div>
              <span className="eyebrow">Oferta ta a fost depășită</span>
              <h2>{urgent.product.title}</h2>
              <p>
                Preț curent:{" "}
                <strong>{money(urgent.product.currentPrice)}</strong>
                <span>Maximul tău: {money(urgent.maxAmount)}</span>
              </p>
              <span className="account-urgent-clock">
                <Icon name="clock" size={15} />
                <Countdown target={urgent.product.endsAt} now={now} />
              </span>
            </div>
          </div>
          <Link
            href={`/anunturi/${urgent.product._id}`}
            className="button button-primary"
          >
            Vezi licitația
            <Icon name="arrow" size={16} />
          </Link>
        </section>
      )}
      <section className="account-table-panel" id="account-table">
        <div className="account-table-toolbar">
          <div className="account-tabs" role="group" aria-label="Secțiuni cont">
            {tabs.map((item) => (
              <button
                key={item.id}
                aria-pressed={tab === item.id}
                className={tab === item.id ? "selected" : ""}
                onClick={() => {
                  setTab(item.id);
                  setQuery("");
                }}
              >
                {item.label}
                {counts[item.id] != null && <span>{counts[item.id]}</span>}
              </button>
            ))}
          </div>
          {tab !== "profile" && (
            <div className="account-table-filters">
              <label>
                <Icon name="search" size={16} />
                <input
                  value={query}
                  maxLength={120}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Caută în anunțuri…"
                  aria-label="Filtrează anunțurile contului"
                />
              </label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sortează anunțurile"
              >
                <option value="ending">După încheiere</option>
                <option value="price">Preț descrescător</option>
              </select>
            </div>
          )}
        </div>
        {tab === "profile" ? (
          <div className="account-details">
            <h2>Datele contului</h2>
            <dl>
              <div>
                <dt>Nume</dt>
                <dd>{data.user.name}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{data.user.email}</dd>
              </div>
              <div>
                <dt>Telefon</dt>
                <dd>{data.user.phone || "Neadăugat"}</dd>
              </div>
              <div>
                <dt>Rol</dt>
                <dd>
                  {data.user.role === "seller"
                    ? "Vânzător"
                    : data.user.role === "admin"
                      ? "Administrator"
                      : "Cumpărător"}
                </dd>
              </div>
            </dl>
            <p>
              Modificarea profilului și setările contului se gestionează în
              aplicația Pinbind.
            </p>
          </div>
        ) : counts[tab] === null ? (
          <div className="account-empty">
            <Icon name="refresh" size={30} />
            <h2>Datele acestei secțiuni nu sunt disponibile.</h2>
            <button
              className="button button-primary"
              onClick={() => void refresh()}
              disabled={refreshing}
            >
              Încearcă din nou
            </button>
          </div>
        ) : rows.length ? (
          <>
            <div className="account-table-heading">
              <span>Anunț și descriere</span>
              <span>Preț / maximul tău</span>
              <span>Stare</span>
              <span>Timp rămas</span>
              <span />
            </div>
            <div>
              {visibleRows.map((row) => (
                <ProductRow key={row.product._id} {...row} now={now} />
              ))}
            </div>
          </>
        ) : (
          <div className="account-empty">
            <Icon name={tab === "favorites" ? "heart" : "gavel"} size={30} />
            <h2>
              {query
                ? "Nicio potrivire pentru această căutare."
                : tab === "favorites"
                  ? "Nu ai produse la favorite."
                  : tab === "products"
                    ? "Nu ai anunțuri publicate."
                    : tab === "closed"
                      ? "Nu ai participări încheiate."
                      : "Nu ai oferte active."}
            </h2>
            <p>
              {tab === "products"
                ? "Publică primul tău anunț video din aplicația Pinbind."
                : "Descoperă produsele din catalog și continuă în aplicație."}
            </p>
            <Link href="/explore" className="button button-primary">
              Explorează catalogul
              <Icon name="arrow" size={16} />
            </Link>
          </div>
        )}
        {tab !== "profile" && pages > 1 && (
          <div className="account-pagination">
            <button
              disabled={currentPage === 1}
              onClick={() =>
                setTablePage({ key: tableKey, page: currentPage - 1 })
              }
            >
              Anterior
            </button>
            <span>
              {currentPage} / {pages}
            </span>
            <button
              disabled={currentPage === pages}
              onClick={() =>
                setTablePage({ key: tableKey, page: currentPage + 1 })
              }
            >
              Următor
            </button>
          </div>
        )}
        <div className="account-update-line">
          <span>
            {refreshing
              ? "Se actualizează…"
              : "Actualizare automată la 30 secunde, cât fila este vizibilă."}
          </span>
          <button onClick={() => void refresh()} disabled={refreshing}>
            <Icon name="refresh" size={14} />
            Actualizează
          </button>
        </div>
      </section>
      <section className="account-bottom-grid">
        <div className="account-searches">
          <span className="eyebrow">Descoperiri la îndemână</span>
          <h2>Căutări salvate</h2>
          <p>
            Păstrează căutările preferate în acest browser. Le poți redeschide
            oricând; nu trimit notificări SMS sau email.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                saveSearch(searchText);
                setSearchText("");
              } catch {
                setNotice("Browserul nu permite salvarea căutărilor.");
              }
            }}
          >
            <label className="sr-only" htmlFor="saved-query">
              Căutare de salvat
            </label>
            <input
              id="saved-query"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              maxLength={120}
              required
              placeholder="Exemplu: Audi A4"
            />
            <button className="button button-primary">Salvează căutarea</button>
          </form>
          <div>
            {searches.map((search) => (
              <div className="account-saved-query" key={search}>
                <Link href={`/explore?q=${encodeURIComponent(search)}`}>
                  <Icon name="search" size={18} />
                  {search}
                  <Icon name="arrow" size={16} />
                </Link>
                <button
                  aria-label={`Șterge căutarea ${search}`}
                  onClick={() => {
                    try {
                      removeSearch(search);
                    } catch {
                      setNotice("Căutarea nu a putut fi ștearsă.");
                    }
                  }}
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            ))}
          </div>
          {!searches.length && (
            <span className="account-small">Nu ai căutări salvate încă.</span>
          )}
        </div>
        <div className="account-help">
          <Icon name="video" size={28} />
          <span className="eyebrow">Continuă în aplicație</span>
          <h2>Mai aproape de următoarea descoperire.</h2>
          <p>
            Licitează, publică anunțuri video și gestionează favoritele din
            aplicația Pinbind. Contul web îți oferă o vedere de ansamblu asupra
            activității tale.
          </p>
          <Link href="/explore" className="button">
            Vezi produsele disponibile
            <Icon name="arrow" size={16} />
          </Link>
          <span className="account-small">
            Salvările locale din catalogul web sunt separate de favoritele
            contului.
          </span>
        </div>
      </section>
      {notice && (
        <div className="toast" role="status">
          <Icon name="check" size={17} />
          {notice}
        </div>
      )}
    </>
  );
}
