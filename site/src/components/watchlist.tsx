"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { type Product, categoryName, money, remaining } from "@/lib/catalog";
import {
  activeFavorite,
  endingFavorite,
  selectFavorites,
} from "@/lib/watchlist";
import { useWatchSettings, updateWatchSettings } from "@/lib/watch-settings";
import { useAccount } from "./account-workspace";
import { Icon } from "./icon";
import { Dialog } from "./dialog";
function FavoriteCard({
  product,
  now,
  priority,
  busy,
  onRemove,
  threshold,
  showMarker,
  onThreshold,
}: {
  product: Product;
  now: number;
  priority?: boolean;
  busy: boolean;
  onRemove: () => void;
  threshold?: number;
  showMarker: boolean;
  onThreshold: (value: number) => void;
}) {
  const p = product;
  return (
    <article className={`watch-card ${priority ? "is-priority" : ""}`}>
      <Link
        href={`/anunturi/${p._id}#prezentare`}
        className="watch-media"
        aria-label={`Vezi videoclipul pentru ${p.title}`}
      >
        {p.thumbnailUrl ? (
          <Image
            src={p.thumbnailUrl}
            alt=""
            fill
            unoptimized
            sizes={
              priority
                ? "(max-width:900px) 100vw, 50vw"
                : "(max-width:760px) 100vw, 33vw"
            }
          />
        ) : (
          <div>
            <Icon name="video" size={48} />
            <span>Prezentare video</span>
          </div>
        )}
        <span>
          <Icon name="video" size={14} />
          Anunț video
        </span>
        <span className="watch-media-time">
          <Icon name="clock" size={14} />
          {remaining(p.endsAt, now)}
        </span>
        <Icon className="watch-play-icon" name="play" size={42} />
      </Link>
      <div className="watch-card-copy">
        <div>
          <div>
            <span>{categoryName(p.category?.name)}</span>
            <h2>
              <Link href={`/anunturi/${p._id}`}>{p.title}</Link>
            </h2>
          </div>
          <button
            disabled={busy}
            onClick={onRemove}
            aria-label={`Elimină ${p.title} din favorite`}
            className="watch-remove"
          >
            <Icon name={busy ? "refresh" : "heart"} size={20} />
          </button>
        </div>
        <p>{p.description}</p>
      </div>
      <div className="watch-card-bottom">
        <div className="watch-card-prices">
          <div>
            <span>Preț de pornire</span>
            <b>{money(p.startingPrice)}</b>
          </div>
          <div>
            <span>Oferta curentă</span>
            <strong>{money(p.currentPrice)}</strong>
          </div>
        </div>
        <div className="watch-card-actions">
          <Link href={`/anunturi/${p._id}`} className="button button-primary">
            Vezi licitația
            <Icon name="gavel" size={15} />
          </Link>
          <Link href={`/anunturi/${p._id}#prezentare`}>
            <Icon name="play" size={17} />
            Vezi video
          </Link>
        </div>
        {showMarker && (
          <div className="watch-threshold">
            <label>
              <span>Reper local de preț (RON)</span>
              <input
                type="number"
                min="0"
                max="1000000000"
                step="0.01"
                value={threshold === undefined ? "" : threshold / 100}
                placeholder="Nesetat"
                aria-label={`Reper local pentru ${p.title}, în RON`}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") onThreshold(-1);
                  else if (
                    e.target.validity.valid &&
                    Number.isFinite(Number(value))
                  )
                    onThreshold(Math.round(Number(value) * 100));
                }}
              />
            </label>
            {threshold !== undefined && (
              <span className={p.currentPrice >= threshold ? "is-reached" : ""}>
                {p.currentPrice >= threshold
                  ? "Reper atins"
                  : "Sub reperul ales"}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
export function Watchlist() {
  const {
    data,
    now,
    error: accountError,
    refresh,
    refreshing,
    favoriteChanged,
  } = useAccount();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("ending");
  const [pageState, setPage] = useState({ key: "", page: 1 });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<string[]>([]);
  const inflight = useRef(new Map<string, AbortController>());
  const [preferences, setPreferences] = useState(false);
  const [draftMarkers, setDraftMarkers] = useState(true);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const settings = useWatchSettings(data?.user.id ?? "anonymous");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/catalog?stage=live&limit=8&sort=ending", {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((result) => setRecommendations(result.items))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(
    () => () => {
      for (const controller of inflight.current.values()) controller.abort();
    },
    [],
  );
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  if (!data) return null;
  const favorites = data.favorites;
  const counts = {
    all: favorites?.length,
    active: favorites?.filter((p) => activeFavorite(p, now)).length,
    ending: favorites?.filter((p) => endingFavorite(p, now)).length,
    closed: favorites?.filter(
      (p) => p.status !== "active" || Date.parse(p.endsAt) <= now,
    ).length,
  };
  const selected = selectFavorites(favorites ?? [], filter, query, sort, now);
  const key = `${filter}:${query}:${sort}`;
  const pages = Math.max(1, Math.ceil(selected.length / 8));
  const page = Math.min(pages, pageState.key === key ? pageState.page : 1);
  const visible = selected.slice((page - 1) * 8, page * 8);
  const priority = visible.filter((p) => activeFavorite(p, now)).slice(0, 2);
  const others = visible.filter(
    (p) => !priority.some((item) => item._id === p._id),
  );
  const exclude = new Set([
    ...(favorites ?? []).map((p) => p._id),
    ...(data.products ?? []).map((p) => p._id),
  ]);
  const recs = recommendations
    .filter((p) => !exclude.has(p._id) && activeFavorite(p, now))
    .slice(0, 2);
  async function mutate(product: Product, add: boolean) {
    if (inflight.current.has(product._id)) return;
    const controller = new AbortController();
    inflight.current.set(product._id, controller);
    setPending((ids) => [...ids, product._id]);
    setError("");
    try {
      const response = await fetch(`/api/favorites/${product._id}`, {
        method: add ? "POST" : "DELETE",
        signal: controller.signal,
      });
      const result = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) {
        if (response.status === 401) void refresh();
        throw new Error(result.error);
      }
      favoriteChanged(product._id, add ? product : undefined);
      setNotice(
        add
          ? "Adăugat la favoritele contului."
          : "Eliminat din favoritele contului.",
      );
    } catch (err) {
      if (!controller.signal.aborted)
        setError(
          err instanceof Error
            ? err.message
            : "Favoritele nu au putut fi actualizate.",
        );
    } finally {
      inflight.current.delete(product._id);
      if (!controller.signal.aborted)
        setPending((ids) => ids.filter((id) => id !== product._id));
    }
  }
  function threshold(id: string, value: number) {
    try {
      const thresholds = { ...settings.thresholds };
      if (value < 0) delete thresholds[id];
      else thresholds[id] = value;
      updateWatchSettings(data!.user.id, { thresholds });
    } catch {
      setError("Browserul nu permite salvarea reperelor locale.");
    }
  }
  const renderCard = (p: Product, large = false) => (
    <FavoriteCard
      key={p._id}
      product={p}
      now={now}
      priority={large}
      busy={pending.includes(p._id)}
      onRemove={() => void mutate(p, false)}
      threshold={settings.thresholds[p._id]}
      showMarker={settings.showMarkers}
      onThreshold={(value) => threshold(p._id, value)}
    />
  );
  return (
    <>
      <div className="watch-page-content">
        <section className="watch-heading">
          <div>
            <span className="eyebrow">
              Colecția ta personală / Favorite din cont
            </span>
            <h1>Favoritele mele</h1>
            <p>
              {favorites
                ? `${favorites.length} ${favorites.length === 1 ? "produs salvat" : "produse salvate"} în contul tău Pinbind.`
                : "Favoritele nu sunt disponibile momentan."}{" "}
              Regăsește prezentările video și urmărește licitațiile care te
              interesează.
            </p>
          </div>
          <div>
            <button
              className="button watch-secondary"
              onClick={() => {
                setDraftMarkers(settings.showMarkers);
                setPreferences(true);
              }}
            >
              <Icon name="filter" size={17} />
              Preferințe afișare
            </button>
            <button
              className="button watch-secondary"
              disabled={!selected.length}
              onClick={() => window.print()}
            >
              <Icon name="list" size={17} />
              Tipărește / PDF
            </button>
          </div>
        </section>
        <div className="watch-filters">
          <div role="group" aria-label="Filtrează favoritele">
            {[
              { id: "all", label: "Toate" },
              { id: "active", label: "Active acum" },
              { id: "ending", label: "Se încheie în 24h" },
              { id: "closed", label: "Încheiate / indisponibile" },
            ].map((item) => (
              <button
                key={item.id}
                className={filter === item.id ? "selected" : ""}
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
                <span>{counts[item.id as keyof typeof counts] ?? "—"}</span>
              </button>
            ))}
          </div>
          <div>
            <label>
              <Icon name="search" size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={120}
                placeholder="Caută în favorite…"
                aria-label="Caută în favorite"
              />
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sortează favoritele"
            >
              <option value="ending">După încheiere</option>
              <option value="price">Preț descrescător</option>
            </select>
          </div>
        </div>
        {(error || accountError || data.warnings.length > 0) && (
          <div className="account-error" role="alert">
            {error || accountError || data.warnings.join(" ")}
            <button disabled={refreshing} onClick={() => void refresh()}>
              Actualizează
            </button>
          </div>
        )}
        {favorites === null ? (
          <div className="account-empty">
            <Icon name="refresh" size={32} />
            <h2>Favoritele nu au putut fi încărcate.</h2>
            <button
              className="button button-primary"
              onClick={() => void refresh()}
              disabled={refreshing}
            >
              Încearcă din nou
            </button>
          </div>
        ) : !selected.length ? (
          <div className="account-empty">
            <Icon name="heart" size={34} />
            <h2>
              {query || filter !== "all"
                ? "Niciun produs în această selecție."
                : "Nu ai produse la favorite încă."}
            </h2>
            <p>
              Descoperă anunțuri în catalog. Favoritele contului sunt separate
              de salvările locale ale browserului.
            </p>
            <Link className="button button-primary" href="/explore">
              Explorează catalogul
              <Icon name="arrow" size={16} />
            </Link>
          </div>
        ) : (
          <>
            {priority.length > 0 && (
              <section className="watch-priority">
                <div className="watch-section-heading">
                  <h2>
                    <span className="status-dot" />
                    În prim-plan · licitații active
                  </h2>
                  <span>Ordinea respectă selecția ta</span>
                </div>
                <div className="watch-priority-grid">
                  {priority.map((p) => renderCard(p, true))}
                </div>
              </section>
            )}
            {others.length > 0 && (
              <section>
                <div className="watch-section-heading">
                  <h2>Alte produse din selecție</h2>
                  <span>{others.length} produse</span>
                </div>
                <div className="watch-grid">
                  {others.map((p) => renderCard(p))}
                </div>
              </section>
            )}
          </>
        )}
        {pages > 1 && (
          <div className="account-pagination">
            <button
              disabled={page === 1}
              onClick={() => setPage({ key, page: page - 1 })}
            >
              Anterior
            </button>
            <span>
              {page} / {pages}
            </span>
            <button
              disabled={page === pages}
              onClick={() => setPage({ key, page: page + 1 })}
            >
              Următor
            </button>
          </div>
        )}
        <div className="account-update-line">
          <span>
            {refreshing
              ? "Se actualizează…"
              : "Actualizare la 30 secunde cât fila este vizibilă. Reperele de preț sunt locale, fără notificări SMS/email."}
          </span>
          <button disabled={refreshing} onClick={() => void refresh()}>
            <Icon name="refresh" size={14} />
            Actualizează
          </button>
        </div>
        <section className="watch-discovery">
          <div>
            <span className="eyebrow">Continuă explorarea</span>
            <h2>Mai sunt produse de descoperit.</h2>
            <p>
              Anunțuri active din catalog, care nu sunt deja în favorite sau în
              lista produselor tale.
            </p>
            <Link href="/explore">
              Deschide catalogul
              <Icon name="arrow" size={16} />
            </Link>
          </div>
          <div>
            {recs.map((p) => (
              <article key={p._id}>
                <Link href={`/anunturi/${p._id}`} className="watch-rec-image">
                  {p.thumbnailUrl ? (
                    <Image
                      src={p.thumbnailUrl}
                      alt=""
                      fill
                      unoptimized
                      sizes="56px"
                    />
                  ) : (
                    <Icon name="video" size={24} />
                  )}
                </Link>
                <div>
                  <Link href={`/anunturi/${p._id}`}>{p.title}</Link>
                  <span>{money(p.currentPrice)}</span>
                </div>
                <button
                  disabled={pending.includes(p._id)}
                  onClick={() => void mutate(p, true)}
                  aria-label={`Adaugă ${p.title} la favorite`}
                >
                  <Icon
                    name={pending.includes(p._id) ? "refresh" : "heart"}
                    size={20}
                  />
                </button>
              </article>
            ))}
          </div>
        </section>
        {notice && (
          <div className="toast" role="status">
            <Icon name="check" size={17} />
            {notice}
          </div>
        )}
        {preferences && (
          <Dialog
            title="Preferințe de afișare"
            onClose={() => setPreferences(false)}
          >
            <div className="watch-preferences">
              <p>
                Aceste setări și reperele de preț se salvează în acest browser,
                separat pentru contul tău. Nu trimit notificări SMS, email sau
                push.
              </p>
              <label>
                <div>
                  <strong>Afișează reperele de preț</strong>
                  <span>
                    Alege o sumă pentru fiecare produs și vezi dacă prețul
                    curent a atins reperul.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={draftMarkers}
                  onChange={(e) => setDraftMarkers(e.target.checked)}
                />
              </label>
              <div>
                <button onClick={() => setPreferences(false)}>Anulează</button>
                <button
                  className="button button-primary"
                  onClick={() => {
                    try {
                      updateWatchSettings(data.user.id, {
                        showMarkers: draftMarkers,
                      });
                      setPreferences(false);
                    } catch {
                      setError("Preferințele nu au putut fi salvate.");
                    }
                  }}
                >
                  Salvează
                </button>
              </div>
            </div>
          </Dialog>
        )}
      </div>
      <section className="watch-print">
        <h1>Favorite Pinbind</h1>
        <p>
          {data.user.name} · Selecție la{" "}
          {new Date(now).toLocaleString("ro-RO", {
            timeZone: "Europe/Bucharest",
          })}
        </p>
        <table>
          <thead>
            <tr>
              <th>Produs</th>
              <th>Preț curent</th>
              <th>Încheiere</th>
            </tr>
          </thead>
          <tbody>
            {selected.map((p) => (
              <tr key={p._id}>
                <td>
                  {p.title}
                  <br />
                  ID: {p._id}
                </td>
                <td>{money(p.currentPrice)}</td>
                <td>
                  {new Date(p.endsAt).toLocaleString("ro-RO", {
                    timeZone: "Europe/Bucharest",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>Rezumat al selecției. Prețurile și disponibilitatea pot evolua.</p>
      </section>
    </>
  );
}
