"use client";
import { ProductImage } from "./product-image";
import Link from "next/link";
import { useState } from "react";
import { useAccount } from "./account-workspace";
import { Icon } from "./icon";
import { Dialog } from "./dialog";
import { categoryName, money, remaining, reserveMet } from "@/lib/catalog";
import { listingStage, listingStages, selectListings } from "@/lib/my-listings";
export function MyListings() {
  const { data, now, error, refresh, refreshing } = useAccount();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("ending");
  const [pageState, setPage] = useState({ key: "", page: 1 });
  const [info, setInfo] = useState("");
  if (!data) return null;
  const products = data.products;
  const counts = Object.fromEntries(
    listingStages.map((stage) => [
      stage.id,
      products?.filter((p) => listingStage(p, now) === stage.id).length ?? null,
    ]),
  );
  const selected = selectListings(products ?? [], filter, query, sort, now);
  const key = `${filter}:${query}:${sort}`;
  const pages = Math.max(1, Math.ceil(selected.length / 6));
  const page = Math.min(pages, pageState.key === key ? pageState.page : 1);
  const rows = selected.slice((page - 1) * 6, page * 6);
  const role =
    data.user.role === "seller"
      ? "Vânzător"
      : data.user.role === "admin"
        ? "Administrator"
        : "Cumpărător";
  return (
    <>
      <section className="listings-heading">
        <div>
          <span className="eyebrow">
            <span className="status-dot" />
            Portofoliul tău de produse
          </span>
          <h1>Anunțurile mele</h1>
          <p>
            Urmărește produsele publicate, perioada de licitare și starea
            fiecărui anunț, de la programare până la încheiere.
          </p>
        </div>
        <div>
          <Link
            href="/cont?section=profile"
            className="button listings-secondary-button"
          >
            <Icon name="user" size={17} />
            Datele contului
          </Link>
          <button
            className="button button-primary"
            onClick={() => setInfo("Publică un anunț nou")}
          >
            <Icon name="image" size={18} />
            Publică un anunț nou
          </button>
        </div>
      </section>
      <section
        className="listings-pipeline"
        aria-label="Stările anunțurilor tale"
      >
        {listingStages.map((stage, index) => (
          <button
            key={stage.id}
            className={filter === stage.id ? "selected" : ""}
            aria-pressed={filter === stage.id}
            onClick={() =>
              setFilter((value) => (value === stage.id ? "all" : stage.id))
            }
          >
            <div>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <span>
                {counts[stage.id] ?? "—"}{" "}
                {counts[stage.id] === 1 ? "anunț" : "anunțuri"}
              </span>
            </div>
            <h2>{stage.label}</h2>
            <p>{stage.note}</p>
            <div
              className="listings-stage-track"
              role="img"
              aria-label={
                products
                  ? `${counts[stage.id]} din ${products.length} anunțuri sunt ${stage.label.toLocaleLowerCase("ro")}`
                  : "Date indisponibile"
              }
            >
              <span
                style={{
                  width: products?.length
                    ? `${(Number(counts[stage.id]) / products.length) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </button>
        ))}
      </section>
      {(error || data.warnings.length > 0) && (
        <div className="account-error" role="alert">
          {error || data.warnings.join(" ")}
          <button onClick={() => void refresh()} disabled={refreshing}>
            Reîncearcă
          </button>
        </div>
      )}
      <div className="listings-workspace">
        <section className="listings-inventory" aria-label="Lista anunțurilor">
          <div className="listings-inventory-heading">
            <h2>Produsele și istoricul tău</h2>
            <span>
              {products
                ? `${selected.length ? `${(page - 1) * 6 + 1}–${Math.min(page * 6, selected.length)}` : "0"} din ${selected.length} anunțuri`
                : "Date indisponibile"}
            </span>
          </div>
          <div className="listings-filters">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filtrează după starea anunțului"
            >
              <option value="all">Toate stările</option>
              {listingStages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
                </option>
              ))}
            </select>
            <label>
              <Icon name="search" size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={120}
                placeholder="Caută produsul sau ID-ul…"
                aria-label="Caută în anunțurile mele"
              />
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sortează anunțurile"
            >
              <option value="ending">După încheiere</option>
              <option value="price">Preț descrescător</option>
              <option value="title">Nume A–Z</option>
            </select>
          </div>
          {products === null ? (
            <div className="account-empty">
              <Icon name="refresh" size={30} />
              <h2>Anunțurile nu au putut fi încărcate.</h2>
              <button
                className="button button-primary"
                disabled={refreshing}
                onClick={() => void refresh()}
              >
                Încearcă din nou
              </button>
            </div>
          ) : rows.length ? (
            <div className="listings-cards">
              {rows.map((product) => {
                const stage = listingStage(product, now);
                const stageLabel = listingStages.find(
                  (s) => s.id === stage,
                )!.label;
                const date = new Intl.DateTimeFormat("ro-RO", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Europe/Bucharest",
                });
                return (
                  <article key={product._id} className="listings-card">
                    <Link
                      href={`/anunturi/${product._id}`}
                      className="listings-card-media"
                      aria-label={`Vezi anunțul ${product.title}`}
                    >
                      {product.imageUrl ? (
                        <ProductImage
                          product={product}
                          alt=""
                          fill
                          sizes="(max-width:760px) 100vw, 220px"
                        />
                      ) : (
                        <div>
                          <Icon name="image" size={46} />
                          <span>Fotografia produsului</span>
                        </div>
                      )}
                      <span className="listings-lot-id">
                        #{product._id.slice(-6).toUpperCase()}
                      </span>
                      <span className="listings-media-open-icon">
                        <Icon name="image" size={36} />
                      </span>
                    </Link>
                    <div className="listings-card-content">
                      <div className="listings-card-meta">
                        <span className={`listings-status ${stage}`}>
                          {product.status === "sold" ? "Vândut" : stageLabel}
                          {stage === "scheduled" &&
                            ` · ${date.format(new Date(product.startsAt))}`}
                        </span>
                        <span>{categoryName(product.category?.name)}</span>
                      </div>
                      <h3>
                        <Link href={`/anunturi/${product._id}`}>
                          {product.title}
                        </Link>
                      </h3>
                      <p className="listings-description">
                        {product.description}
                      </p>
                      <dl className="listings-card-values">
                        <div>
                          <dt>Preț curent</dt>
                          <dd>{money(product.currentPrice)}</dd>
                        </div>
                        <div>
                          <dt>Preț de rezervă</dt>
                          <dd>
                            {product.reservePrice
                              ? money(product.reservePrice)
                              : "Fără rezervă"}
                          </dd>
                        </div>
                        <div>
                          <dt>Pas de licitare</dt>
                          <dd>{money(product.minBidIncrement)}</dd>
                        </div>
                      </dl>
                      <div className="listings-card-footer">
                        <span>
                          <Icon
                            name={stage === "live" ? "clock" : "image"}
                            size={16}
                          />
                          {stage === "live"
                            ? remaining(product.endsAt, now)
                            : stage === "scheduled"
                              ? "Urmează să înceapă"
                              : stage === "reserved"
                                ? "Marcat ca rezervat"
                                : `Încheiere: ${date.format(new Date(product.endsAt))}`}
                        </span>
                        <div>
                          <button
                            onClick={() => setInfo("Gestionează anunțul")}
                            aria-label={`Cum gestionezi anunțul ${product.title}`}
                          >
                            Gestionează
                          </button>
                          <Link href={`/anunturi/${product._id}`}>
                            Vezi pagina
                            <Icon name="arrow" size={14} />
                          </Link>
                        </div>
                      </div>
                      <span className="listings-reserve-note">
                        {reserveMet(product)
                          ? "Preț de rezervă atins sau nesetat."
                          : "Prețul de rezervă nu a fost atins."}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="account-empty">
              <Icon name="image" size={36} />
              <h2>
                {query || filter !== "all"
                  ? "Niciun anunț în această selecție."
                  : "Nu ai anunțuri publicate încă."}
              </h2>
              <p>
                Prezintă primul tău produs printr-o fotografie și publică-l din
                aplicația Pinbind.
              </p>
              {query || filter !== "all" ? (
                <button
                  className="button button-primary"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                >
                  Vezi toate anunțurile
                </button>
              ) : (
                <button
                  className="button button-primary"
                  onClick={() => setInfo("Publică un anunț nou")}
                >
                  Cum public un produs?
                  <Icon name="arrow" size={16} />
                </button>
              )}
            </div>
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
                : "Actualizare la 30 secunde când fila este vizibilă."}
            </span>
            <button onClick={() => void refresh()} disabled={refreshing}>
              <Icon name="refresh" size={14} />
              Actualizează
            </button>
          </div>
        </section>
        <aside className="listings-sidebar">
          <section className="listings-seller-card">
            <div className="listings-sidebar-label">
              <span>Contul tău de vânzător</span>
              <span>{role}</span>
            </div>
            <div className="listings-seller-person">
              <span>
                <Icon name="user" size={27} />
              </span>
              <div>
                <h2>{data.user.name}</h2>
                <p>{data.user.email}</p>
              </div>
            </div>
            <p>
              Publică și gestionează produsele din aplicația Pinbind. Starea
              anunțurilor și prețurile curente apar și aici, în contul tău web.
            </p>
            <Link href="/cont?section=profile">
              Vezi datele contului
              <Icon name="arrow" size={15} />
            </Link>
            <Link href="/cont/oferte">
              Ofertele și participările tale
              <Icon name="gavel" size={15} />
            </Link>
          </section>
          <section className="listings-guide-card">
            <h2>Detaliile unui anunț bun</h2>
            <dl>
              <div>
                <dt>Prezentare</dt>
                <dd>O fotografie clar al produsului</dd>
              </div>
              <div>
                <dt>Descriere</dt>
                <dd>Stare, detalii și informații utile</dd>
              </div>
              <div>
                <dt>Prețuri</dt>
                <dd>În lei românești (RON)</dd>
              </div>
              <div>
                <dt>Calendar</dt>
                <dd>Data începerii și încheierii</dd>
              </div>
            </dl>
            <div>
              <Icon name="image" size={19} />
              <p>
                O prezentare atentă îi ajută pe cumpărători să înțeleagă mai
                bine produsul. Verifică descrierea și condițiile înainte de
                publicare.
              </p>
            </div>
          </section>
          <section className="listings-publish-card">
            <span className="eyebrow">Următorul tău anunț</span>
            <h2>Arată ce îl face special.</h2>
            <p>
              Filmează produsul, adaugă detaliile și stabilește perioada de
              licitare din aplicație.
            </p>
            <button
              className="button"
              onClick={() => setInfo("Publică un anunț nou")}
            >
              Cum public un produs?
              <Icon name="arrow" size={16} />
            </button>
          </section>
        </aside>
      </div>
      {info && (
        <Dialog title={info} onClose={() => setInfo("")}>
          <div className="info-content">
            <Icon name="image" size={38} />
            <p>
              {info === "Gestionează anunțul"
                ? "Deschide anunțurile tale în aplicația Pinbind pentru opțiunile de administrare disponibile. Pe web poți urmări starea, prețurile și pagina publică a produsului."
                : "Deschide aplicația Pinbind și intră în secțiunea Vinde. Urmează pașii pentru contul de vânzător, apoi adaugă fotografia, descrierea, categoria, prețurile și calendarul licitației."}
            </p>
            <button
              className="button button-primary"
              onClick={() => setInfo("")}
            >
              Am înțeles
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
