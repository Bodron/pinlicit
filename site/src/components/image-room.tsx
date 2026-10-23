"use client";
import { ProductImage } from "./product-image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  type Catalog,
  type Product,
  categoryName,
  money,
  reserveMet,
  remaining,
} from "@/lib/catalog";
import { roomSelection } from "@/lib/image-room";
import { useAccount } from "./account-workspace";
import { Icon } from "./icon";
import { Countdown } from "./countdown";
function RoomImage({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`room-photo ${compact ? "is-compact" : ""}`}>
      <div className="room-photo-label">
        <Icon name="image" size={14} />
        <span>{compact ? product.title : "Fotografia produsului"}</span>
      </div>
      {failed || !product.imageUrl ? (
        <div className="room-media-error">
          <Icon name="image" size={42} />
          <p>Fotografia nu este disponibilă momentan.</p>
          {product.imageUrl && (
            <button onClick={() => setFailed(false)}>Încearcă din nou</button>
          )}
          <Link href={`/anunturi/${product._id}`}>
            Vezi detaliile anunțului
          </Link>
        </div>
      ) : (
        <ProductImage
          product={product}
          alt={product.title}
          fill
          sizes={compact ? "33vw" : "(max-width: 900px) 100vw, 60vw"}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
export function ImageRoom() {
  const {
    data,
    now,
    refresh: refreshAccount,
    refreshing: accountRefreshing,
    error: accountError,
  } = useAccount();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [view, setView] = useState("stage");
  const [revision, setRevision] = useState(0);
  const [loadedKey, setLoadedKey] = useState("");
  const [error, setError] = useState("");
  const stage = useRef<HTMLDivElement>(null);
  const key = `${page}:${now}:${revision}`;
  const loading = key !== loadedKey;
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/catalog?stage=live&limit=4&sort=ending&page=${page}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            result.error ?? "Nu putem încărca anunțurile cu fotografii.",
          );
        if (!controller.signal.aborted) {
          setCatalog(result);
          if (page > Math.max(1, result.pages))
            setPage(Math.max(1, result.pages));
          setError("");
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedKey(key);
      });
    return () => controller.abort();
  }, [page, now, revision, key]);
  if (!data) return null;
  const { available, selected, others } = roomSelection(
    catalog?.items ?? [],
    selectedId,
    now,
  );
  const participation = selected
    ? data.positions?.find((p) => p.product._id === selected._id)
    : null;
  const stale = Boolean(error) || loading;
  function select(id: string) {
    setSelectedId(id);
    setView("stage");
    stage.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return (
    <>
      <section className="image-room-heading">
        <div>
          <span className="eyebrow">
            <span className="status-dot" />
            Produsele în prim-plan
          </span>
          <h1>Fotografii ale produselor active</h1>
          <p>
            Privește fotografiile produselor și comută între licitațiile
            disponibile. Fotografiile sunt prezentări încărcate de vânzători.
          </p>
        </div>
        <div
          className="image-room-modes"
          role="group"
          aria-label="Mod de vizionare"
        >
          <button
            className={view === "stage" ? "selected" : ""}
            aria-pressed={view === "stage"}
            onClick={() => setView("stage")}
          >
            <Icon name="image" size={17} />
            Produs principal
          </button>
          <button
            className={view === "grid" ? "selected" : ""}
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
          >
            <Icon name="grid" size={17} />
            Grilă 2×2
          </button>
          <span>
            <Icon name="image" size={15} />
            {available.length} fotografii în selecție
          </span>
        </div>
      </section>
      {(error || accountError) && (
        <div className="account-error" role="alert">
          {error || accountError}
          <button
            onClick={() => {
              setRevision((value) => value + 1);
              void refreshAccount();
            }}
          >
            Reîncearcă
          </button>
        </div>
      )}
      {!selected ? (
        <div className="account-empty" aria-busy={loading}>
          <Icon name="image" size={38} />
          <h2>
            {loading
              ? "Se încarcă prezentările…"
              : error
                ? "Prezentările nu sunt disponibile momentan."
                : "Nu sunt licitații active în această selecție."}
          </h2>
          <p>Poți descoperi toate anunțurile disponibile în catalog.</p>
          {page > 1 && (
            <button
              className="button button-primary"
              onClick={() => setPage(1)}
            >
              Prima pagină
            </button>
          )}
          <Link href="/explore" className="button button-primary">
            Explorează catalogul
            <Icon name="arrow" size={16} />
          </Link>
        </div>
      ) : (
        <>
          <div className="image-room-workspace">
            <section
              className="image-room-stage"
              aria-label="Fotografia și prețul produsului"
            >
              <div
                ref={stage}
                className={
                  view === "grid" ? "room-stage-grid" : "room-stage-single"
                }
              >
                {view === "grid" ? (
                  available.map((product) => (
                    <div className="room-grid-tile" key={product._id}>
                      <RoomImage product={product} compact />
                      <div>
                        <span>{money(product.currentPrice)}</span>
                        <button onClick={() => select(product._id)}>
                          Afișează în prim-plan
                          <Icon name="arrow" size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <RoomImage key={selected._id} product={selected} />
                )}
              </div>
              <div
                className="room-selection-tabs"
                role="group"
                aria-label="Selectează produsul principal"
              >
                {available.map((product) => (
                  <button
                    key={product._id}
                    className={selected._id === product._id ? "selected" : ""}
                    aria-pressed={selected._id === product._id}
                    onClick={() => select(product._id)}
                  >
                    <Icon name="image" size={14} />
                    {product.title}
                  </button>
                ))}
              </div>
              <div className="room-bid-bar">
                <div>
                  <span>Oferta curentă</span>
                  <strong>{money(selected.currentPrice)}</strong>
                </div>
                <div>
                  <span>Următoarea ofertă minimă</span>
                  <strong>
                    {money(selected.currentPrice + selected.minBidIncrement)}
                  </strong>
                </div>
                <div className="room-countdown">
                  <span>
                    <Icon name="clock" size={13} />
                    Timp rămas
                  </span>
                  <strong>
                    <Countdown
                      key={selected._id}
                      target={selected.endsAt}
                      now={now}
                    />
                  </strong>
                </div>
                <Link
                  className="button button-primary"
                  href={`/anunturi/${selected._id}`}
                >
                  Vezi licitația
                  <Icon name="gavel" size={17} />
                </Link>
              </div>
              {stale && (
                <p className="room-data-note" role="status">
                  {error
                    ? "Prețul afișat poate fi depășit. Verifică detaliile anunțului."
                    : "Se actualizează selecția…"}
                </p>
              )}
            </section>
            <aside className="room-sidebar">
              <section className="room-description">
                <div className="room-seller">
                  <span>
                    <Icon name="user" size={21} />
                  </span>
                  <div>
                    <strong>
                      {selected.seller?.name ?? "Vânzător Pinbind"}
                    </strong>
                    <span>{categoryName(selected.category?.name)}</span>
                  </div>
                  <span className="room-label">Prezentare</span>
                </div>
                <div className="room-description-box">
                  <span>
                    <Icon name="image" size={15} />
                    Descrierea vânzătorului
                  </span>
                  <h2>{selected.title}</h2>
                  <p>{selected.description}</p>
                </div>
                <Link href={`/anunturi/${selected._id}`}>
                  Toate detaliile produsului
                  <Icon name="arrow" size={15} />
                </Link>
              </section>
              <section className="room-participation">
                <h2>
                  <Icon name="gavel" size={19} />
                  Participarea ta
                </h2>
                {data.positions === null ? (
                  <p className="room-data-note">
                    Ofertele contului nu sunt disponibile momentan.
                  </p>
                ) : participation ? (
                  <>
                    <div className="room-own-bid">
                      <span>Maximul tău ofertat</span>
                      <strong>{money(participation.maxAmount)}</strong>
                      <span
                        className={`account-status ${!participation.leading ? "outbid" : ""}`}
                      >
                        {participation.leading
                          ? "Oferta ta conduce"
                          : "Oferta ta a fost depășită"}
                      </span>
                    </div>
                    <p>
                      Verifică prețul actual înainte de a confirma o nouă ofertă
                      în aplicația Pinbind.
                    </p>
                  </>
                ) : (
                  <div className="room-no-bid">
                    <Icon name="gavel" size={29} />
                    <p>Nu ai plasat oferte pentru acest produs.</p>
                    <span>Poți începe din aplicația Pinbind.</span>
                  </div>
                )}
                <Link href="/cont/oferte">
                  Vezi ofertele și istoricul
                  <Icon name="arrow" size={15} />
                </Link>
                <div className="room-reserve">
                  <span>Rezervă</span>
                  <strong>
                    {reserveMet(selected) ? "Atinsă" : "Neatinsă"}
                  </strong>
                </div>
              </section>
              <div className="room-controls-note">
                <Icon name="image" size={19} />
                <p>
                  Compară fotografiile produselor și verifică descrierile și
                  prețurile înainte de a licita.
                </p>
              </div>
            </aside>
          </div>
          <section className="room-secondary">
            <div className="room-secondary-heading">
              <div>
                <Icon name="image" size={23} />
                <h2>
                  {view === "grid"
                    ? "Alege produsul principal"
                    : "Alte prezentări din selecție"}
                </h2>
                <span>{others.length}</span>
              </div>
              <span>Comută în prim-plan fără să părăsești pagina</span>
            </div>
            <div className="room-secondary-grid">
              {others.map((product) => (
                <article key={product._id}>
                  <button
                    className="room-preview"
                    onClick={() => select(product._id)}
                    aria-label={`Vezi fotografia pentru ${product.title}`}
                  >
                    {product.imageUrl ? (
                      <ProductImage
                        product={product}
                        alt=""
                        fill
                        sizes="(max-width:760px) 100vw, 33vw"
                      />
                    ) : (
                      <Icon name="image" size={48} />
                    )}
                    <span>
                      <span className="status-dot" />
                      Licitație activă
                    </span>
                    <span className="room-preview-time">
                      {remaining(product.endsAt, now)}
                    </span>
                    <span className="room-preview-image">
                      <Icon name="image" size={40} />
                    </span>
                  </button>
                  <div className="room-preview-copy">
                    <span>{categoryName(product.category?.name)}</span>
                    <h3>{product.title}</h3>
                    <p>{product.description}</p>
                    <div>
                      <div>
                        <span>Oferta curentă</span>
                        <strong>{money(product.currentPrice)}</strong>
                      </div>
                      <button onClick={() => select(product._id)}>
                        Afișează în prim-plan
                        <Icon name="arrow" size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {!others.length && (
              <p className="room-data-note">
                Acesta este singurul anunț activ din selecția curentă.
              </p>
            )}
          </section>
        </>
      )}
      <div className="room-footer-controls">
        <span>
          {accountRefreshing
            ? "Se actualizează datele…"
            : "Prețurile și disponibilitatea se actualizează la 30 secunde cât fila este vizibilă."}
        </span>
        <div>
          <button
            disabled={page <= 1 || loading}
            onClick={() => setPage((value) => value - 1)}
            aria-label="Selecția anterioară"
          >
            <Icon name="chevron" size={16} />
          </button>
          <span>
            {page} / {Math.max(1, catalog?.pages ?? 1)}
          </span>
          <button
            disabled={page >= (catalog?.pages ?? 1) || loading}
            onClick={() => setPage((value) => value + 1)}
            aria-label="Selecția următoare"
          >
            <Icon name="chevron" size={16} />
          </button>
          <button
            className="room-reload"
            disabled={loading}
            onClick={() => setRevision((value) => value + 1)}
          >
            <Icon name="refresh" size={15} />
            Actualizează
          </button>
        </div>
      </div>
    </>
  );
}
