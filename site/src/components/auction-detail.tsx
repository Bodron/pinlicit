"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { type Product, categoryName, money, reserveMet } from "@/lib/catalog";
import { toggleBookmark, useBookmarks } from "@/lib/bookmarks";
import { Icon } from "./icon";
import { Dialog } from "./dialog";
import { Countdown } from "./countdown";

export function AuctionDetail({
  initialProduct,
  initialNow,
}: {
  initialProduct: Product;
  initialNow: number;
}) {
  const [product, setProduct] = useState(initialProduct);
  const [now, setNow] = useState(initialNow);
  const [tab, setTab] = useState("description");
  const [media, setMedia] = useState("video");
  const [videoFailed, setVideoFailed] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [info, setInfo] = useState(false);
  const [notice, setNotice] = useState("");
  const saved = useBookmarks().includes(product._id);
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    async function refresh() {
      if (document.hidden || pending) return;
      pending = true;
      try {
        const response = await fetch(`/api/products/${initialProduct._id}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.status === 404) {
          setUnavailable(true);
          setRefreshError("Anunțul a fost retras sau nu mai este disponibil.");
          return;
        }
        if (!response.ok) throw new Error();
        const data: Product = await response.json();
        if (!controller.signal.aborted) {
          setProduct(data);
          setNow(Date.now());
          setUnavailable(false);
          setRefreshError("");
        }
      } catch {
        if (!controller.signal.aborted)
          setRefreshError(
            "Actualizarea nu a reușit. Prețul afișat poate fi depășit.",
          );
      } finally {
        pending = false;
      }
    }
    const poll = setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(poll);
      controller.abort();
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [initialProduct._id]);
  useEffect(() => {
    const next = [Date.parse(product.startsAt), Date.parse(product.endsAt)]
      .filter((time) => time > now)
      .sort((a, b) => a - b)[0];
    if (!next) return;
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.min(2147483647, Math.max(0, next - Date.now()) + 50),
    );
    return () => clearTimeout(timer);
  }, [product.startsAt, product.endsAt, now]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  const upcoming = Date.parse(product.startsAt) > now;
  const closed =
    unavailable ||
    product.status !== "active" ||
    Date.parse(product.endsAt) <= now;
  const status = unavailable
    ? "Indisponibil"
    : product.status === "sold"
      ? "Vândut"
      : product.status === "reserved"
        ? "Rezervat"
        : closed
          ? "Licitație încheiată"
          : upcoming
            ? "Începe în curând"
            : "Licitație în desfășurare";
  const date = (value: string) =>
    new Intl.DateTimeFormat("ro-RO", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Europe/Bucharest",
    }).format(new Date(value));
  function save() {
    try {
      setNotice(
        toggleBookmark(product._id)
          ? "Anunț salvat în acest browser."
          : "Anunț eliminat din salvate.",
      );
    } catch {
      setNotice("Browserul nu permite salvarea locală.");
    }
  }
  return (
    <main className="auction-page" id="catalog">
      <div className="auction-breadcrumb">
        <div>
          <Link href="/explore">Catalog</Link>
          <span>/</span>
          <Link
            href={
              product.category?._id
                ? `/explore?categoryId=${product.category._id}`
                : "/explore"
            }
          >
            {categoryName(product.category?.name)}
          </Link>
          <span>/</span>
          <strong>{product.title}</strong>
        </div>
        <span className="auction-reference">
          Anunț #{product._id.slice(-6).toUpperCase()}
        </span>
      </div>
      <div className="auction-columns">
        <section
          className="auction-showcase"
          aria-label="Prezentarea produsului"
        >
          <div className="auction-theater" id="prezentare">
            <div className="auction-media-toolbar">
              <div role="group" aria-label="Alege prezentarea">
                <button
                  aria-pressed={media === "video"}
                  onClick={() => setMedia("video")}
                >
                  <Icon name="video" size={17} />
                  Prezentare video
                </button>
                {product.thumbnailUrl && (
                  <button
                    aria-pressed={media === "image"}
                    onClick={() => setMedia("image")}
                  >
                    <Icon name="grid" size={17} />
                    Fotografie
                  </button>
                )}
              </div>
              <span>Pinbind / Video</span>
            </div>
            <div className="auction-stage">
              {media === "image" && product.thumbnailUrl ? (
                <Image
                  src={product.thumbnailUrl}
                  alt={product.title}
                  fill
                  unoptimized
                  sizes="(max-width: 900px) 100vw, 60vw"
                />
              ) : videoFailed || !product.videoUrl ? (
                <div className="auction-media-error">
                  <Icon name="video" size={44} />
                  <p>Videoclipul nu poate fi redat momentan.</p>
                  <button
                    className="button button-primary"
                    onClick={() => setVideoFailed(false)}
                  >
                    Încearcă din nou
                  </button>
                </div>
              ) : (
                <video
                  key={product.videoUrl}
                  src={`${product.videoUrl.split("#")[0]}#t=0.1`}
                  poster={product.thumbnailUrl}
                  controls
                  playsInline
                  preload="metadata"
                  onError={() => setVideoFailed(true)}
                  aria-label={`Prezentare video pentru ${product.title}`}
                />
              )}
            </div>
            <div className="auction-media-caption">
              <Icon name="video" size={17} />
              <span>
                Vezi produsul în mișcare. Folosește comenzile playerului pentru
                sunet și ecran complet.
              </span>
            </div>
          </div>
          <div className="auction-title">
            <div className="auction-labels">
              <span>{categoryName(product.category?.name)}</span>
              <span>
                <Icon name="user" size={14} />
                {product.seller?.name ?? "Vânzător Pinbind"}
              </span>
            </div>
            <h1>{product.title}</h1>
            <p>{product.description}</p>
          </div>
          <div className="auction-metrics">
            <div>
              <span>Preț de pornire</span>
              <strong>{money(product.startingPrice)}</strong>
            </div>
            <div>
              <span>Pas de licitare</span>
              <strong>{money(product.minBidIncrement)}</strong>
            </div>
            <div>
              <span>Rezervă</span>
              <strong>{reserveMet(product) ? "Atinsă" : "Neatinsă"}</strong>
            </div>
          </div>
          <div className="auction-information">
            <div
              className="auction-tabs"
              role="tablist"
              aria-label="Informații despre anunț"
            >
              {[
                { id: "description", label: "Descriere" },
                { id: "details", label: "Detalii licitație" },
                { id: "seller", label: "Vânzător" },
              ].map((item) => (
                <button
                  key={item.id}
                  role="tab"
                  id={`tab-${item.id}`}
                  aria-selected={tab === item.id}
                  aria-controls="auction-tab-panel"
                  tabIndex={tab === item.id ? 0 : -1}
                  onClick={() => setTab(item.id)}
                  onKeyDown={(event) => {
                    const ids = ["description", "details", "seller"];
                    let next = ids.indexOf(tab);
                    if (event.key === "ArrowRight") next = (next + 1) % 3;
                    else if (event.key === "ArrowLeft") next = (next + 2) % 3;
                    else if (event.key === "Home") next = 0;
                    else if (event.key === "End") next = 2;
                    else return;
                    event.preventDefault();
                    setTab(ids[next]);
                    document.getElementById(`tab-${ids[next]}`)?.focus();
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div
              className="auction-tab-panel"
              role="tabpanel"
              id="auction-tab-panel"
              aria-labelledby={`tab-${tab}`}
              tabIndex={0}
            >
              {tab === "description" ? (
                <>
                  <h2>Despre acest produs</h2>
                  <p className="auction-full-description">
                    {product.description}
                  </p>
                  <div className="auction-detail-note">
                    <Icon name="video" />
                    <p>
                      Descrierea și videoclipul sunt furnizate de vânzător.
                      Urmărește prezentarea și verifică detaliile înainte să
                      licitezi.
                    </p>
                  </div>
                </>
              ) : tab === "details" ? (
                <>
                  <h2>Calendar și condiții</h2>
                  <dl className="auction-specs">
                    <div>
                      <dt>Începe la</dt>
                      <dd>{date(product.startsAt)}</dd>
                    </div>
                    <div>
                      <dt>Se încheie la</dt>
                      <dd>{date(product.endsAt)}</dd>
                    </div>
                    <div>
                      <dt>Monedă</dt>
                      <dd>Leu românesc (RON)</dd>
                    </div>
                    <div>
                      <dt>Stare</dt>
                      <dd>{status}</dd>
                    </div>
                  </dl>
                  <p className="auction-small">
                    Ore afișate pentru România. Ofertele se plasează în
                    aplicația Pinbind.
                  </p>
                </>
              ) : (
                <>
                  <h2>{product.seller?.name ?? "Vânzător Pinbind"}</h2>
                  <p>
                    Pentru întrebări despre produs și detalii despre predare,
                    contactează vânzătorul prin aplicația Pinbind.
                  </p>
                </>
              )}
            </div>
          </div>
          <Link href="/explore" className="auction-back">
            <Icon name="arrow" size={16} />
            Înapoi la toate anunțurile
          </Link>
        </section>
        <aside
          className="auction-bidding"
          aria-label="Preț și participare la licitație"
        >
          <div className="auction-bid-card">
            <div className="auction-status">
              <span>
                <span className={`status-dot ${closed ? "is-closed" : ""}`} />
                {status}
              </span>
              {!closed && (
                <span
                  className="auction-countdown"
                  aria-label={upcoming ? "Timp până la începere" : "Timp rămas"}
                >
                  <Icon name="clock" size={16} />
                  <Countdown
                    target={upcoming ? product.startsAt : product.endsAt}
                    now={now}
                  />
                </span>
              )}
            </div>
            <div className="auction-price-label">
              <span>Oferta curentă</span>
              <span className={reserveMet(product) ? "reserve-met" : ""}>
                <Icon
                  name={reserveMet(product) ? "check" : "shield"}
                  size={15}
                />
                {reserveMet(product) ? "Rezervă atinsă" : "Rezervă neatinsă"}
              </span>
            </div>
            <div className="auction-current-price">
              {money(product.currentPrice)}
            </div>
            <div className="auction-next">
              <span>Următoarea ofertă minimă</span>
              <strong>
                {money(product.currentPrice + product.minBidIncrement)}
              </strong>
            </div>
            {refreshError && (
              <p className="auction-refresh-error" role="status">
                {refreshError}
              </p>
            )}
            <div className="auction-step-preview">
              <span className="eyebrow">Pași de licitare</span>
              <div>
                {[1, 2, 3].map((n) => (
                  <span key={n}>+{money(product.minBidIncrement * n)}</span>
                ))}
              </div>
              <p>
                Pasul minim pentru acest anunț este{" "}
                {money(product.minBidIncrement)}.
              </p>
            </div>
            <button
              className="button button-primary auction-bid-button"
              disabled={closed || upcoming}
              onClick={() => setInfo(true)}
            >
              <Icon name="gavel" size={20} />
              {closed
                ? "Licitație indisponibilă"
                : upcoming
                  ? "Licitația nu a început"
                  : "Licitează în aplicație"}
            </button>
            {product.buyNowPrice > 0 && !closed && !upcoming && (
              <button className="auction-buy-now" onClick={() => setInfo(true)}>
                Cumpără acum <strong>{money(product.buyNowPrice)}</strong>
                <Icon name="arrow" size={16} />
              </button>
            )}
            <p className="auction-small auction-centered">
              Autentifică-te în aplicația Pinbind pentru a plasa o ofertă sau a
              cumpăra.
            </p>
            <div className="auction-updates">
              <div>
                <Icon name="refresh" size={16} />
                <strong>Preț actualizat periodic</strong>
                <span>30 sec.</span>
              </div>
              <p>
                Verifică prețul și disponibilitatea în aplicație înainte de a
                confirma o ofertă.
              </p>
            </div>
            <div className="auction-secondary-actions">
              <button onClick={save} aria-pressed={saved}>
                <Icon name="heart" size={18} />
                {saved ? "Salvat în browser" : "Salvează anunțul"}
              </button>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    setNotice("Link copiat.");
                  } catch {
                    setNotice("Copiază adresa anunțului din bara browserului.");
                  }
                }}
              >
                <Icon name="arrow" size={18} />
                Copiază linkul
              </button>
            </div>
          </div>
          <div className="auction-safeguards">
            <h2>
              <Icon name="shield" size={20} />
              Înainte să licitezi
            </h2>
            <p>
              <Icon name="video" size={18} />
              <span>
                <strong>Vezi prezentarea.</strong> Urmărește produsul și citește
                descrierea completă.
              </span>
            </p>
            <p>
              <Icon name="user" size={18} />
              <span>
                <strong>Discută cu vânzătorul.</strong> Clarifică starea
                produsului și modalitatea de predare.
              </span>
            </p>
            <p>
              <Icon name="gavel" size={18} />
              <span>
                <strong>Verifică oferta.</strong> Confirmă suma și
                disponibilitatea în aplicația Pinbind.
              </span>
            </p>
          </div>
        </aside>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Icon name="check" size={18} />
          {notice}
        </div>
      )}
      {info && (
        <Dialog
          title="Continuă în aplicația Pinbind"
          onClose={() => setInfo(false)}
        >
          <div className="info-content">
            <Icon name="gavel" size={38} />
            <p>
              Deschide anunțul „{product.title}” în aplicația Pinbind,
              autentifică-te și verifică prețul actual înainte de a licita sau
              cumpăra.
            </p>
            <button
              className="button button-primary"
              onClick={() => setInfo(false)}
            >
              Am înțeles
            </button>
          </div>
        </Dialog>
      )}
    </main>
  );
}
