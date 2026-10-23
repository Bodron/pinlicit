"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useAccount } from "./account-workspace";
import { Icon } from "./icon";
import { Countdown } from "./countdown";
import { money, remaining } from "@/lib/catalog";
import {
  isLivePosition,
  isClosedLeader,
  positionStatus,
  selectPositions,
  ledgerCsv,
} from "@/lib/bid-ledger";
export function BidLedger() {
  const { data, now, error, refresh, refreshing } = useAccount();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("ending");
  const [pageState, setPage] = useState({ key: "", page: 1 });
  const [notice, setNotice] = useState("");
  if (!data) return null;
  const positions = data.positions;
  const live = positions?.filter((p) => isLivePosition(p, now)) ?? [];
  const outbid = live.filter((p) => !p.leading);
  const closed = positions?.filter((p) => !isLivePosition(p, now)) ?? [];
  const urgent = [...outbid].sort(
    (a, b) => Date.parse(a.product.endsAt) - Date.parse(b.product.endsAt),
  )[0];
  const leading = live.filter((p) => p.leading).length;
  const rate = live.length ? Math.round((leading / live.length) * 100) : 0;
  const filters = [
    { id: "all", label: "Toate participările", count: positions?.length },
    { id: "active", label: "Licitații active", count: live.length },
    { id: "outbid", label: "Oferte depășite", count: outbid.length },
    {
      id: "leading-closed",
      label: "Încheiate în frunte",
      count: closed.filter((p) => isClosedLeader(p, now)).length,
    },
    {
      id: "closed",
      label: "Alte încheiate",
      count: closed.filter((p) => !isClosedLeader(p, now)).length,
    },
  ];
  const selected = selectPositions(positions ?? [], filter, query, sort, now);
  const pageKey = `${filter}:${query}:${sort}`;
  const pages = Math.max(1, Math.ceil(selected.length / 12));
  const page = Math.min(pages, pageState.key === pageKey ? pageState.page : 1);
  const rows = selected.slice((page - 1) * 12, page * 12);
  function exportCsv() {
    try {
      const blob = new Blob([ledgerCsv(selected, now)], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pinbind-oferte-${new Date(now).toISOString().slice(0, 10)}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      setNotice("Exportul CSV al selecției a fost pregătit.");
    } catch {
      setNotice("Exportul nu a putut fi pregătit. Încearcă din nou.");
    }
  }
  return (
    <>
      <section className="ledger-heading">
        <div>
          <span className="eyebrow">
            Activitatea contului / {data.user.name}
          </span>
          <h1>Ofertele tale și istoricul licitațiilor</h1>
          <p>
            Urmărește participările, prețurile curente și maximele ofertate.
            Ofertele sunt grupate pe anunț, pentru o imagine clară a activității
            tale.
          </p>
        </div>
        <div>
          <button
            className="button ledger-export"
            onClick={exportCsv}
            disabled={!positions || !selected.length}
          >
            <Icon name="list" size={17} />
            Exportă CSV
          </button>
          <Link className="button button-primary" href="/explore?stage=live">
            <Icon name="gavel" size={17} />
            Descoperă licitații
          </Link>
        </div>
      </section>
      <section className="ledger-metrics" aria-label="Rezumatul ofertelor">
        <article>
          <span>
            Maxime ofertate active
            <Icon name="gavel" size={18} />
          </span>
          <strong>
            {positions
              ? money(live.reduce((sum, p) => sum + p.maxAmount, 0))
              : "—"}
          </strong>
          <p>
            {positions
              ? `${live.length} licitații active`
              : "Date indisponibile"}{" "}
            · suma plafoanelor, nu un sold
          </p>
        </article>
        <article className={outbid.length ? "is-alert" : ""}>
          <span>
            Oferte depășite
            <Icon name="bell" size={18} />
          </span>
          <strong>{positions ? outbid.length : "—"}</strong>
          <p>
            {outbid.length
              ? "Verifică prețul înainte de a licita din nou."
              : "Nicio ofertă depășită în licitațiile active."}
          </p>
        </article>
        <article>
          <span>
            Licitații încheiate
            <Icon name="clock" size={18} />
          </span>
          <strong>{positions ? closed.length : "—"}</strong>
          <p>Participări încheiate sau anunțuri indisponibile.</p>
        </article>
        <article>
          <span>
            Oferte în frunte
            <Icon name="check" size={18} />
          </span>
          <div>
            <strong>
              {positions && live.length ? `${leading} / ${live.length}` : "—"}
            </strong>
            <svg
              className="ledger-ring"
              viewBox="0 0 36 36"
              role="img"
              aria-label={`${leading} din ${live.length} oferte active în frunte`}
            >
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="#e8e8e9"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                pathLength="100"
                strokeDasharray={`${rate} 100`}
                transform="rotate(-90 18 18)"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p>Din licitațiile active la ultima actualizare.</p>
        </article>
      </section>
      {urgent && (
        <section className="ledger-urgent">
          <div className="ledger-urgent-product">
            <div className="ledger-urgent-thumb">
              {urgent.product.thumbnailUrl ? (
                <Image
                  src={urgent.product.thumbnailUrl}
                  alt=""
                  fill
                  unoptimized
                  sizes="100px"
                />
              ) : (
                <Icon name="video" size={36} />
              )}
              <span>Depășită</span>
            </div>
            <div>
              <span className="eyebrow">Oferta ta a fost depășită</span>
              <h2>{urgent.product.title}</h2>
              <p>
                Maximul tău: <strong>{money(urgent.maxAmount)}</strong>
                <span>
                  Preț curent:{" "}
                  <strong>{money(urgent.product.currentPrice)}</strong>
                </span>
              </p>
            </div>
          </div>
          <div className="ledger-urgent-actions">
            <div>
              <Icon name="clock" size={23} />
              <span>
                Timp rămas
                <strong>
                  <Countdown target={urgent.product.endsAt} now={now} />
                </strong>
              </span>
            </div>
            <Link
              className="button button-primary"
              href={`/anunturi/${urgent.product._id}`}
            >
              Vezi licitația
              <Icon name="arrow" size={17} />
            </Link>
          </div>
        </section>
      )}
      {(error || data.warnings.length > 0) && (
        <div className="account-error" role="alert">
          {error || data.warnings.join(" ")}
          <button onClick={() => void refresh()} disabled={refreshing}>
            Reîncearcă
          </button>
        </div>
      )}
      <section aria-label="Lista participărilor">
        <div className="ledger-controls">
          <div
            className="ledger-filters"
            role="group"
            aria-label="Filtrează participările"
          >
            {filters.map((item) => (
              <button
                key={item.id}
                className={`${filter === item.id ? "selected " : ""}${item.id === "outbid" && outbid.length ? "has-alert" : ""}`}
                onClick={() => setFilter(item.id)}
                aria-pressed={filter === item.id}
              >
                {item.label}
                <span>{positions ? item.count : "—"}</span>
              </button>
            ))}
          </div>
          <div className="ledger-search-sort">
            <label>
              <Icon name="search" size={17} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={120}
                placeholder="Caută după produs sau ID…"
                aria-label="Caută în istoricul ofertelor"
              />
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sortează participările"
            >
              <option value="ending">Se încheie curând</option>
              <option value="price">Preț descrescător</option>
              <option value="recent">Activitate recentă</option>
            </select>
          </div>
        </div>
        {positions === null ? (
          <div className="account-empty">
            <Icon name="refresh" size={30} />
            <h2>Ofertele nu au putut fi încărcate.</h2>
            <button
              className="button button-primary"
              onClick={() => void refresh()}
              disabled={refreshing}
            >
              Încearcă din nou
            </button>
          </div>
        ) : rows.length ? (
          <div className="ledger-list">
            {rows.map((position) => {
              const p = position.product;
              const active = isLivePosition(position, now);
              return (
                <article
                  key={p._id}
                  className={`ledger-row ${!active ? "is-closed" : ""}`}
                >
                  <div className="ledger-row-product">
                    <div className="ledger-row-thumb">
                      {p.thumbnailUrl ? (
                        <Image
                          src={p.thumbnailUrl}
                          alt=""
                          fill
                          unoptimized
                          sizes="80px"
                        />
                      ) : (
                        <Icon name="video" size={30} />
                      )}
                    </div>
                    <div>
                      <div>
                        <span
                          className={`account-status ${active && !position.leading ? "outbid" : ""}`}
                        >
                          {positionStatus(position, now)}
                        </span>
                        <span className="ledger-lot-id">
                          #{p._id.slice(-6).toUpperCase()}
                        </span>
                      </div>
                      <h2>
                        <Link href={`/anunturi/${p._id}`}>{p.title}</Link>
                      </h2>
                      <p>{p.description}</p>
                    </div>
                  </div>
                  <div className="ledger-row-values">
                    <div>
                      <span>Preț curent</span>
                      <strong>{money(p.currentPrice)}</strong>
                    </div>
                    <div>
                      <span>Maximul tău</span>
                      <strong>{money(position.maxAmount)}</strong>
                    </div>
                    <div>
                      <span>{active ? "Timp rămas" : "Ultima ta ofertă"}</span>
                      <b>
                        {active
                          ? remaining(p.endsAt, now)
                          : new Intl.DateTimeFormat("ro-RO", {
                              dateStyle: "medium",
                              timeZone: "Europe/Bucharest",
                            }).format(new Date(position.lastBidAt))}
                      </b>
                    </div>
                    <div className="ledger-row-actions">
                      <Link href={`/anunturi/${p._id}`}>
                        Vezi detaliile
                        <Icon name="arrow" size={15} />
                      </Link>
                      <Link
                        href={`/anunturi/${p._id}#prezentare`}
                        aria-label={`Vezi videoclipul pentru ${p.title}`}
                      >
                        <Icon name="video" size={18} />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="account-empty">
            <Icon name="gavel" size={32} />
            <h2>
              {query
                ? "Nicio potrivire pentru această căutare."
                : "Nicio participare în această selecție."}
            </h2>
            <p>
              Ofertele plasate din aplicația Pinbind apar aici, în contul tău.
            </p>
            <Link href="/explore" className="button button-primary">
              Explorează catalogul
              <Icon name="arrow" size={17} />
            </Link>
          </div>
        )}
        {pages > 1 && (
          <div className="account-pagination">
            <button
              disabled={page === 1}
              onClick={() => setPage({ key: pageKey, page: page - 1 })}
            >
              Anterior
            </button>
            <span>
              {page} / {pages}
            </span>
            <button
              disabled={page === pages}
              onClick={() => setPage({ key: pageKey, page: page + 1 })}
            >
              Următor
            </button>
          </div>
        )}
        <div className="account-update-line">
          <span>
            {refreshing
              ? "Se actualizează…"
              : `${selected.length} participări în selecție · actualizare la 30 secunde când fila este vizibilă.`}
          </span>
          <button disabled={refreshing} onClick={() => void refresh()}>
            <Icon name="refresh" size={14} />
            Actualizează
          </button>
        </div>
        {notice && (
          <p className="ledger-export-notice" role="status">
            {notice}
          </p>
        )}
      </section>
      <section className="ledger-notes">
        <div>
          <span>
            <Icon name="shield" size={24} />
          </span>
          <div>
            <h2>Informații pentru următoarea ofertă</h2>
            <p>
              Istoricul reflectă activitatea contului, fără a confirma plăți sau
              livrări.
            </p>
          </div>
        </div>
        <div className="ledger-notes-grid">
          <article>
            <h3>
              <Icon name="gavel" size={18} />
              Maximul tău și prețul curent
            </h3>
            <p>
              Maximul este plafonul ofertat de tine. Prețul curent al produsului
              poate fi diferit. Verifică ambele valori înainte de a confirma o
              nouă ofertă.
            </p>
          </article>
          <article>
            <h3>
              <Icon name="clock" size={18} />
              Timp și disponibilitate
            </h3>
            <p>
              Ofertele din ultimele momente pot prelungi licitația. Verifică
              timpul și prețul actual pe pagina anunțului și în aplicație.
            </p>
          </article>
          <article>
            <h3>
              <Icon name="list" size={18} />
              Istoric, fără concluzii automate
            </h3>
            <p>
              „Încheiată în frunte” arată poziția ultimei oferte a contului. Nu
              confirmă adjudecarea, plata sau predarea produsului. Exportul CSV
              este un rezumat al selecției, nu un document fiscal.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
