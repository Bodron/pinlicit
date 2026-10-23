"use client";
import { ProductImage } from "./product-image";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  type Catalog,
  type Category,
  categoryName,
  money,
  reserveMet,
} from "@/lib/catalog";
import { toggleBookmark, useBookmarks } from "@/lib/bookmarks";
import { Icon } from "./icon";
import { Dialog } from "./dialog";
import { CatalogCard } from "./catalog-card";
import { Countdown } from "./countdown";

const categoryImages: Record<string, string> = {
  auto: "/categories/auto.jpg",
  casa: "/categories/casa.jpg",
  collectibles: "/categories/collectibles.jpg",
};
const steps = [
  {
    number: "01",
    title: "Descoperă prin fotografii",
    text: "Vezi fotografia produsului, urmărește detaliile și citește descrierea vânzătorului. O perspectivă mai apropiată asupra fiecărui anunț.",
    icon: "image" as const,
    note: "Fotografii ale produselor ale produselor",
  },
  {
    number: "02",
    title: "Alege oferta potrivită",
    text: "Compară prețul curent, pasul minim și timpul rămas. Când găsești ceea ce cauți, continuă licitarea în aplicația Pinbind.",
    icon: "gavel" as const,
    note: "Prețuri și pași de licitare în RON",
  },
  {
    number: "03",
    title: "Discută cu vânzătorul",
    text: "Clarifică starea produsului și detaliile de predare în aplicație. Verifică toate informațiile înainte să confirmi o ofertă.",
    icon: "user" as const,
    note: "Detalii clare înainte de cumpărare",
  },
];
export function Marketplace({
  initialCatalog,
  categories,
  initialNow,
}: {
  initialCatalog: Catalog | null;
  categories: Category[];
  initialNow: number;
}) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [featured, setFeatured] = useState(initialCatalog?.items[0] ?? null);
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(initialNow);
  const [loadedKey, setLoadedKey] = useState(initialCatalog ? ":1:0" : "");
  const [error, setError] = useState("");
  const [featuredError, setFeaturedError] = useState("");
  const [notice, setNotice] = useState("");
  const [info, setInfo] = useState(false);
  const [failedImageUrl, setFailedImageUrl] = useState("");
  const saved = useBookmarks();
  const key = `${category}:${page}:${revision}`;
  const loading = key !== loadedKey;
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({
      stage: "live",
      limit: "4",
      sort: "ending",
      page: String(page),
    });
    if (category) query.set("categoryId", category);
    fetch(`/api/catalog?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error ?? "Anunțurile nu pot fi încărcate.");
        if (!controller.signal.aborted) {
          setCatalog(data);
          setError("");
          setNow(Date.now());
          if (!category && page === 1) {
            setFeatured(data.items[0] ?? null);
            setFeaturedError("");
          }
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedKey(key);
      });
    return () => controller.abort();
  }, [category, page, revision, key]);
  const featuredId = featured?._id;
  useEffect(() => {
    if ((!category && page === 1) || !featuredId) return;
    const controller = new AbortController();
    fetch(`/api/products/${featuredId}`, { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 404) {
          if (!controller.signal.aborted) setFeatured(null);
          return;
        }
        if (!response.ok) throw new Error();
        const product = await response.json();
        if (!controller.signal.aborted) {
          setFeatured(product);
          setFeaturedError("");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setFeaturedError(
            "Prețul din prim-plan nu a putut fi actualizat. Verifică pagina anunțului.",
          );
      });
    return () => controller.abort();
  }, [revision, category, page, featuredId]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) setRevision((value) => value + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  function save(id: string) {
    try {
      setNotice(
        toggleBookmark(id)
          ? "Salvat în acest browser. Favoritele contului sunt disponibile în aplicație."
          : "Eliminat din salvatele acestui browser.",
      );
    } catch {
      setNotice("Browserul nu permite salvarea locală.");
    }
  }
  const featuredOpen =
    featured &&
    featured.status === "active" &&
    Date.parse(featured.endsAt) > now;
  return (
    <main id="catalog" className="marketplace-page">
      <div className="marketplace-ticker">
        <div>
          <span className="status-dot" />
          DESCOPERĂ PRIN FOTOGRAFII<span className="ticker-separator">/</span>
          <span className="ticker-product">
            {featured?.title ?? "Obiecte cu poveste, pe Pinbind"}
          </span>
        </div>
        <span>
          <Icon name="image" size={15} />
          Anunțuri cu fotografii <span className="ticker-separator">
            •
          </span>{" "}
          Prețuri în RON
        </span>
      </div>
      <section
        className="marketplace-hero marketplace-container"
        aria-label="Anunț în prim-plan"
      >
        <div className="marketplace-hero-copy">
          <div className="marketplace-hero-badges">
            <span>
              <span className="status-dot" />
              {featuredOpen ? "Licitație activă" : "Descoperă Pinbind"}
            </span>
            {featured && (
              <span>
                <Icon name="gavel" size={14} />
                {reserveMet(featured) ? "Rezervă atinsă" : "Rezervă neatinsă"}
              </span>
            )}
          </div>
          <span className="eyebrow">
            {featured
              ? "În prim-plan pe Pinbind"
              : "Următoarea descoperire începe aici"}
          </span>
          <h1>
            {featured?.title ??
              "Obiecte cu poveste. Descoperă-le prin fotografii."}
          </h1>
          <p>
            {featured?.description ??
              "Explorează produsele din platformă și vezi fiecare detaliu înainte să faci o ofertă."}
          </p>
          {featured ? (
            <div className="marketplace-bid-box">
              <div className="marketplace-price-row">
                <div>
                  <span className="eyebrow">Oferta curentă</span>
                  <strong>{money(featured.currentPrice)}</strong>
                </div>
                <div>
                  <span className="eyebrow">Următoarea ofertă</span>
                  <b>
                    {money(featured.currentPrice + featured.minBidIncrement)}
                  </b>
                </div>
              </div>
              <div className="marketplace-timer">
                <span>
                  <Icon name="clock" size={18} />
                  {featuredOpen ? "Timp rămas" : "Stare licitație"}
                </span>
                {featuredOpen ? (
                  <Countdown
                    key={featured._id}
                    target={featured.endsAt}
                    now={now}
                  />
                ) : (
                  <strong>Încheiată</strong>
                )}
              </div>
              <div className="marketplace-hero-actions">
                <Link
                  href={`/anunturi/${featured._id}`}
                  className="button button-primary"
                >
                  <Icon name="gavel" size={17} />
                  Vezi licitația
                </Link>
                <button
                  className="button marketplace-save"
                  aria-pressed={saved.includes(featured._id)}
                  onClick={() => save(featured._id)}
                >
                  <Icon name="heart" size={17} />
                  {saved.includes(featured._id) ? "Salvat" : "Salvează"}
                </button>
              </div>
            </div>
          ) : (
            <Link href="/explore" className="button button-primary">
              Explorează catalogul
              <Icon name="arrow" size={17} />
            </Link>
          )}
          {featuredError && (
            <p className="auction-refresh-error" role="status">
              {featuredError}
            </p>
          )}
          <div className="marketplace-seller">
            <span>
              <Icon name={featured ? "user" : "image"} size={21} />
            </span>
            <div>
              <strong>
                {featured?.seller?.name
                  ? `Publicat de ${featured.seller.name}`
                  : "O platformă construită în jurul fotografiilor"}
              </strong>
              <p>
                {featured
                  ? `${categoryName(featured.category?.name)} · Fotografia produsului a vânzătorului`
                  : "Descoperă. Privește. Alege."}
              </p>
            </div>
          </div>
        </div>
        <div className="marketplace-hero-media">
          <div className="marketplace-photo">
            {featured?.imageUrl && failedImageUrl !== featured.imageUrl ? (
              <ProductImage
                preload
                key={featured.imageUrl}
                product={featured}
                alt={featured.title}
                fill
                sizes="(max-width: 900px) 100vw, 50vw"
                onError={() => setFailedImageUrl(featured.imageUrl)}
              />
            ) : (
              <div className="marketplace-image-empty">
                <Icon name="image" size={64} />
                <p>
                  {failedImageUrl
                    ? "Fotografia nu poate fi încărcată momentan."
                    : "Mai aproape de fiecare detaliu."}
                </p>
                {featured && (
                  <Link href={`/anunturi/${featured._id}`}>
                    Vezi detaliile anunțului
                    <Icon name="arrow" size={16} />
                  </Link>
                )}
              </div>
            )}
            <span className="marketplace-photo-label">
              <Icon name="image" size={15} />
              Fotografia produsului
            </span>
          </div>
          <div className="marketplace-media-footnote">
            <Icon name="image" size={18} />
            <span>Vezi fotografia produsului, în ritmul tău.</span>
          </div>
        </div>
      </section>
      <section className="marketplace-categories">
        <div className="marketplace-container">
          <div className="marketplace-section-heading">
            <div>
              <span className="eyebrow">Categorii de explorat</span>
              <h2>Fiecare pasiune are locul ei.</h2>
            </div>
            <Link href="/explore">
              Vezi toate categoriile
              <Icon name="arrow" size={17} />
            </Link>
          </div>
          <div
            className="category-pills marketplace-category-pills"
            role="group"
            aria-label="Filtrează licitațiile pe categorii"
          >
            <button
              className={!category ? "selected" : ""}
              aria-pressed={!category}
              onClick={() => {
                setCategory("");
                setPage(1);
              }}
            >
              Toate anunțurile
            </button>
            {categories.map((item) => (
              <button
                key={item._id}
                className={category === item._id ? "selected" : ""}
                aria-pressed={category === item._id}
                onClick={() => {
                  setCategory(item._id);
                  setPage(1);
                }}
              >
                {categoryName(item.name)}
              </button>
            ))}
          </div>
          <div className="marketplace-category-grid">
            {categories.slice(0, 4).map((item) => {
              const image =
                categoryImages[item.slug.toLowerCase()] ??
                categoryImages[item.name.toLowerCase()];
              return (
                <Link
                  key={item._id}
                  href={`/explore?categoryId=${item._id}`}
                  className="marketplace-category-tile"
                >
                  {image ? (
                    <Image
                      src={image}
                      alt=""
                      fill
                      sizes="(max-width:600px) 100vw, (max-width:900px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="marketplace-category-art">
                      <Icon
                        name={item.slug.includes("electro") ? "image" : "gavel"}
                        size={80}
                      />
                    </div>
                  )}
                  <div>
                    <span>Descoperă categoria</span>
                    <h3>
                      {categoryName(item.name)}
                      <Icon name="arrow" size={20} />
                    </h3>
                  </div>
                </Link>
              );
            })}
          </div>
          {!categories.length && (
            <p className="marketplace-muted">
              Categoriile nu sunt disponibile momentan.{" "}
              <Link href="/explore">Deschide catalogul.</Link>
            </p>
          )}
        </div>
      </section>
      <section
        className="marketplace-listings marketplace-container"
        id="licitatii"
      >
        <div className="marketplace-section-heading">
          <div>
            <span className="eyebrow">
              Anunțuri cu fotografii, oferte reale
            </span>
            <h2>Licitații de descoperit</h2>
          </div>
          <div className="marketplace-pagination">
            <span>
              {catalog?.total ?? "—"}{" "}
              {catalog?.total === 1 ? "anunț activ" : "anunțuri active"}
            </span>
            <button
              aria-label="Pagina anterioară"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => value - 1)}
            >
              <Icon name="chevron" size={17} />
            </button>
            <button
              aria-label="Pagina următoare"
              disabled={page >= (catalog?.pages ?? 1) || loading}
              onClick={() => setPage((value) => value + 1)}
            >
              <Icon name="chevron" size={17} />
            </button>
          </div>
        </div>
        <div aria-live="polite" aria-busy={loading}>
          {error && !loading ? (
            <div className="marketplace-empty">
              <Icon name="refresh" size={28} />
              <h3>Nu putem actualiza anunțurile.</h3>
              <p>{error}</p>
              <button
                className="button button-primary"
                onClick={() => setRevision((value) => value + 1)}
              >
                Încearcă din nou
              </button>
            </div>
          ) : !catalog ? (
            <div className="marketplace-empty">Se încarcă anunțurile…</div>
          ) : catalog.items.length ? (
            <div
              className={`marketplace-card-grid ${loading ? "refreshing" : ""}`}
            >
              {catalog.items.map((product) => (
                <CatalogCard
                  key={product._id}
                  product={product}
                  now={now}
                  saved={saved.includes(product._id)}
                  onSave={() => save(product._id)}
                />
              ))}
            </div>
          ) : (
            <div className="marketplace-empty">
              <Icon name="search" size={30} />
              <h3>
                {loading
                  ? "Se încarcă selecția…"
                  : "Nicio licitație activă în această selecție."}
              </h3>
              <Link href="/explore" className="button button-primary">
                Vezi catalogul complet
                <Icon name="arrow" size={16} />
              </Link>
            </div>
          )}
        </div>
        <Link
          href={category ? `/explore?categoryId=${category}` : "/explore"}
          className="marketplace-view-all"
        >
          Explorează toate anunțurile
          <Icon name="arrow" size={17} />
        </Link>
      </section>
      <section className="marketplace-how" id="cum-functioneaza">
        <div className="marketplace-container">
          <div className="marketplace-editorial-heading">
            <span className="eyebrow">Mai mult decât o fotografie</span>
            <h2>O altă perspectivă asupra licitațiilor.</h2>
            <p>
              Pe Pinbind, produsele își spun povestea prin fotografii. Descoperă
              detaliile, urmărește ofertele și alege în cunoștință de cauză.
            </p>
          </div>
          <div className="marketplace-steps">
            {steps.map((step) => (
              <article key={step.number}>
                <span className="marketplace-step-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                <div>
                  <Icon name={step.icon} size={18} />
                  {step.note}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="marketplace-trust marketplace-container">
        <div>
          <span className="eyebrow">Înainte de fiecare ofertă</span>
          <h2>Detaliile fac diferența.</h2>
          <p>
            O alegere bună începe cu informațiile potrivite. Ia-ți timp să vezi
            produsul și să verifici condițiile licitației.
          </p>
          <div className="marketplace-real-stats">
            <div>
              <strong>{catalog?.stats.activeTotal ?? "—"}</strong>
              <span>Anunțuri active în platformă</span>
            </div>
            <div>
              <strong>RON</strong>
              <span>Moneda licitațiilor</span>
            </div>
          </div>
        </div>
        <div className="marketplace-trust-cards">
          <article>
            <Icon name="image" size={28} />
            <h3>Privește dincolo de imagine.</h3>
            <p>
              Privește fotografia, citește descrierea și verifică detaliile care
              contează pentru tine.
            </p>
            <Link href="/explore">
              Descoperă produsele
              <Icon name="arrow" size={16} />
            </Link>
          </article>
          <article>
            <Icon name="gavel" size={28} />
            <h3>Fiecare ofertă contează.</h3>
            <p>
              Prețul curent, pasul minim și timpul rămas sunt disponibile pe
              pagina fiecărei licitații. Confirmarea se face în aplicație.
            </p>
            <Link href="/explore?stage=live">
              Vezi licitațiile active
              <Icon name="arrow" size={16} />
            </Link>
          </article>
        </div>
      </section>
      <section className="marketplace-container marketplace-sell">
        <div>
          <span className="marketplace-sell-label">Pentru vânzători</span>
          <h2>
            Produsul tău are o poveste.
            <br />
            Arată-o prin fotografii.
          </h2>
          <p>
            Prezintă detaliile care îl fac special. Publică anunțul din
            aplicația Pinbind și fă-l vizibil în catalogul platformei.
          </p>
          <div>
            <button className="button" onClick={() => setInfo(true)}>
              Începe să vinzi
              <Icon name="arrow" size={17} />
            </button>
            <Link href="/explore">
              Descoperă platforma
              <Icon name="arrow" size={17} />
            </Link>
          </div>
        </div>
        <Icon name="image" size={180} />
      </section>
      {notice && (
        <div className="toast" role="status">
          <Icon name="check" size={18} />
          {notice}
        </div>
      )}
      {info && (
        <Dialog title="Vinde pe Pinbind" onClose={() => setInfo(false)}>
          <div className="info-content">
            <Icon name="image" size={38} />
            <p>
              Deschide aplicația Pinbind și intră în secțiunea Vinde. După
              aprobarea contului de vânzător, poți publica un anunț cu
              fotografie care va apărea și în catalogul web.
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
