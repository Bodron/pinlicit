"use client";
import { useBookmarks, toggleBookmark } from "@/lib/bookmarks";
import { useEffect, useRef, useState } from "react";
import { type Catalog, type Category, categoryName } from "@/lib/catalog";
import { CatalogCard } from "./catalog-card";
import { Dialog } from "./dialog";
import { Icon } from "./icon";

const stages = [
  { id: "all", label: "Toate licitațiile", color: "#757872" },
  { id: "live", label: "În desfășurare", color: "#ba1a1a" },
  { id: "ending", label: "Se încheie în 12 ore", color: "#9e8b61" },
  { id: "reserve", label: "Preț de rezervă atins", color: "#0f766e" },
  { id: "upcoming", label: "Încep în curând", color: "#c5c7c0" },
];

export function Explore({
  initialSearch = "",
  initialStage = "all",
  initialCategory = "",
}: {
  initialSearch?: string;
  initialStage?: string;
  initialCategory?: string;
}) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [stage, setStage] = useState(initialStage);
  const [sort, setSort] = useState("ending");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [price, setPrice] = useState({ min: "", max: "" });
  const [page, setPage] = useState(1);
  const [view, setView] = useState("grid");
  const [loadedKey, setLoadedKey] = useState("");
  const [requestError, setRequestError] = useState("");
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(0);
  const saved = useBookmarks();
  const [notice, setNotice] = useState("");
  const [info, setInfo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const results = useRef<HTMLElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/categories", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setCategories)
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);
  const params = new URLSearchParams({
    page: String(page),
    limit: "12",
    sort,
    stage,
  });
  if (search) params.set("q", search);
  if (category) params.set("categoryId", category);
  if (price.min)
    params.set("minPrice", String(Math.round(Number(price.min) * 100)));
  if (price.max)
    params.set("maxPrice", String(Math.round(Number(price.max) * 100)));
  const requestQuery = params.toString();
  const currentKey = `${requestQuery}:${revision}`;
  const loading = loadedKey !== currentKey;
  const error = loading ? "" : requestError;
  useEffect(() => {
    const controller = new AbortController();
    const key = `${requestQuery}:${revision}`;
    fetch(`/api/catalog?${requestQuery}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error ?? "Catalogul nu a putut fi încărcat.");
        if (!controller.signal.aborted) {
          setCatalog(data);
          setRequestError("");
          setNow(Date.now());
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setRequestError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedKey(key);
      });
    return () => controller.abort();
  }, [requestQuery, revision]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) {
        setNow(Date.now());
        setRevision((v) => v + 1);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  function reset() {
    setCategory("");
    setStage("all");
    setQuery("");
    setSearch("");
    setSort("ending");
    setMin("");
    setMax("");
    setPrice({ min: "", max: "" });
    setPage(1);
  }
  function save(id: string) {
    try {
      const added = toggleBookmark(id);
      setNotice(
        added
          ? "Salvat în acest browser. Favoritele din cont se gestionează în aplicație."
          : "Eliminat din salvatele acestui browser.",
      );
    } catch {
      setNotice("Browserul nu permite salvarea locală.");
    }
  }
  function goPage(value: number) {
    setPage(value);
    results.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const filterCount =
    Number(Boolean(category)) +
    Number(stage !== "all") +
    Number(Boolean(price.min || price.max));
  const infoText =
    info === "Vinde pe Pinbind"
      ? "Publică un anunț cu fotografie din secțiunea Vinde a aplicației Pinbind. După aprobarea contului de vânzător, anunțul tău va apărea și în acest catalog."
      : info === "Contul tău Pinbind"
        ? "Autentificarea, ofertele și favoritele din cont sunt disponibile în aplicația Pinbind. Aici poți explora anunțurile și vedea fotografiile produselor fără cont."
        : "Pinbind aduce licitațiile în prim-plan prin fotografii. Explorează anunțurile, verifică descrierea și prețul curent, apoi folosește aplicația Pinbind pentru a licita sau pentru a lua legătura cu vânzătorul.";

  return (
    <>
      <main className="catalog-container" id="catalog">
        <section className="catalog-hero">
          <div className="hero-copy">
            <div className="collection-label">
              <span className="label-dot" />
              Catalogul Pinbind <span className="label-slash">/</span>
              <span>Anunțuri din platformă</span>
            </div>
            <h1>
              Descoperă următoarea
              <br className="hero-break" /> piesă din colecția ta.
            </h1>
            <p>
              Obiecte cu poveste, prezentate prin fotografii. Explorează
              licitațiile, descoperă detaliile și găsește ceea ce merită
              păstrat.
            </p>
          </div>
          <div className="catalog-stats">
            <div>
              <span className="eyebrow">Licitații active</span>
              <strong>
                {catalog?.stats.activeTotal ?? "—"}
                <small> anunțuri</small>
              </strong>
            </div>
            <span className="stat-divider" />
            <div>
              <span className="eyebrow">Se încheie în 24h</span>
              <strong>
                {catalog?.stats.endingToday ?? "—"}
                <small> anunțuri</small>
              </strong>
            </div>
          </div>
        </section>
        <div className="catalog-toolbar">
          <div className="category-pills" role="group" aria-label="Categorii">
            <button
              className={!category ? "selected" : ""}
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
                onClick={() => {
                  setCategory(item._id);
                  setPage(1);
                }}
              >
                {categoryName(item.name)}
              </button>
            ))}
          </div>
          <div className="sort-and-view">
            <label className="sort-control">
              <select
                aria-label="Sortează anunțurile"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ending">Se încheie curând</option>
                <option value="newest">Adăugate recent</option>
                <option value="price-desc">Preț descrescător</option>
                <option value="price-asc">Preț crescător</option>
              </select>
              <Icon name="chevron" size={14} />
            </label>
            <div className="view-toggle" role="group" aria-label="Mod afișare">
              <button
                aria-label="Afișare grilă"
                aria-pressed={view === "grid"}
                className={view === "grid" ? "selected" : ""}
                onClick={() => setView("grid")}
              >
                <Icon name="grid" size={18} />
              </button>
              <button
                aria-label="Afișare listă"
                aria-pressed={view === "list"}
                className={view === "list" ? "selected" : ""}
                onClick={() => setView("list")}
              >
                <Icon name="list" size={18} />
              </button>
            </div>
          </div>
        </div>
        <label className="mobile-search">
          <Icon name="search" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Caută în catalog…"
            aria-label="Caută anunțuri"
            maxLength={120}
          />
        </label>
        <div className="catalog-layout">
          <aside className={`catalog-sidebar ${showFilters ? "is-open" : ""}`}>
            <div className="filter-panel">
              <div className="filter-heading">
                <h2>
                  Filtrează selecția
                  {filterCount > 0 && (
                    <span className="filter-count">{filterCount}</span>
                  )}
                </h2>
                <button className="text-button" onClick={reset}>
                  Resetează
                </button>
              </div>
              <div className="filter-section">
                <h3>Moneda licitațiilor</h3>
                <div className="currency-note">
                  <span>RON</span>
                  <span>
                    Leu românesc <Icon name="check" size={16} />
                  </span>
                </div>
              </div>
              <form
                className="filter-section"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (min && max && Number(min) > Number(max)) {
                    setNotice("Prețul minim nu poate depăși prețul maxim.");
                    return;
                  }
                  setPrice({ min, max });
                  setPage(1);
                }}
              >
                <h3>
                  Interval de preț <span>RON</span>
                </h3>
                <div className="price-track">
                  <span />
                </div>
                <div className="price-inputs">
                  <label>
                    <span>De la</span>
                    <input
                      type="number"
                      min="0"
                      max="1000000000"
                      step="0.01"
                      value={min}
                      onChange={(e) => setMin(e.target.value)}
                      placeholder="0"
                      aria-label="Preț minim în RON"
                    />
                  </label>
                  <span>–</span>
                  <label>
                    <span>Până la</span>
                    <input
                      type="number"
                      min="0"
                      max="1000000000"
                      step="0.01"
                      value={max}
                      onChange={(e) => setMax(e.target.value)}
                      placeholder="Oricât"
                      aria-label="Preț maxim în RON"
                    />
                  </label>
                </div>
                <button className="apply-price" type="submit">
                  Aplică intervalul <Icon name="arrow" size={14} />
                </button>
              </form>
              <fieldset className="filter-section">
                <legend>Stadiul licitației</legend>
                <div className="stage-options">
                  {stages.map((item) => (
                    <label key={item.id}>
                      <span
                        className="stage-dot"
                        style={{ background: item.color }}
                      />
                      <span>{item.label}</span>
                      <input
                        type="radio"
                        name="stage"
                        checked={stage === item.id}
                        onChange={() => {
                          setStage(item.id);
                          setPage(1);
                        }}
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="filter-section image-filter">
                <span className="image-icon">
                  <Icon name="image" size={22} />
                </span>
                <div>
                  <strong>Fotografii ale produselor</strong>
                  <p>Descoperă fiecare detaliu</p>
                </div>
                <Icon name="check" size={17} />
              </div>
            </div>
            <div className="standard-note">
              <Icon name="gavel" size={24} />
              <h3>Mai aproape de produs.</h3>
              <p>
                O fotografie arată detaliile. Privește produsul și citește
                descrierea înainte să faci o ofertă.
              </p>
              <a href="#cum-functioneaza">
                Descoperă Pinbind <Icon name="arrow" size={14} />
              </a>
            </div>
          </aside>
          <section
            className="catalog-results"
            ref={results}
            aria-label="Anunțuri disponibile"
            aria-busy={loading}
          >
            <div className="results-heading">
              <p>
                {loading && !catalog ? (
                  "Se încarcă selecția…"
                ) : (
                  <>
                    <strong>{catalog?.total ?? 0}</strong>{" "}
                    {catalog?.total === 1 ? "anunț" : "anunțuri"}
                    {search ? <> pentru „{search}”</> : " în selecția ta"}
                  </>
                )}
              </p>
              <button
                className="mobile-filter-button"
                onClick={() => setShowFilters(!showFilters)}
                aria-expanded={showFilters}
              >
                <Icon name="filter" size={17} /> Filtre{" "}
                {filterCount > 0 && `(${filterCount})`}
              </button>
              <span className="results-trust">
                <Icon name="image" size={16} /> Anunțuri cu fotografii
                <span className="label-dot" />
                Prețuri în RON
              </span>
            </div>
            {error ? (
              <div className="empty-state" role="alert">
                <Icon name="refresh" size={30} />
                <h2>Catalogul nu a putut fi încărcat</h2>
                <p>{error}</p>
                <button
                  className="button button-primary"
                  onClick={() => setRevision((v) => v + 1)}
                >
                  Încearcă din nou
                </button>
              </div>
            ) : loading && !catalog ? (
              <div className="product-grid">
                {Array.from({ length: 6 }, (_, i) => (
                  <div className="card-skeleton" key={i}>
                    <div />
                    <span />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            ) : catalog?.items.length ? (
              <div
                className={`product-grid ${view === "list" ? "list-view" : ""} ${loading ? "refreshing" : ""}`}
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
              <div className="empty-state">
                <Icon name="search" size={30} />
                <h2>Nicio potrivire, deocamdată.</h2>
                <p>Încearcă altă căutare sau un interval de preț mai larg.</p>
                <button className="button button-primary" onClick={reset}>
                  Vezi toate anunțurile
                </button>
              </div>
            )}
            {!error && catalog && catalog.pages > 1 && (
              <nav className="pagination" aria-label="Paginare catalog">
                <button
                  aria-label="Pagina anterioară"
                  disabled={page <= 1 || loading}
                  onClick={() => goPage(page - 1)}
                >
                  <Icon name="chevron" size={16} className="rotate-back" />
                </button>
                {Array.from(
                  { length: Math.min(5, catalog.pages) },
                  (_, i) =>
                    Math.max(1, Math.min(page - 2, catalog.pages - 4)) + i,
                ).map((number) => (
                  <button
                    key={number}
                    aria-current={page === number ? "page" : undefined}
                    className={page === number ? "active" : ""}
                    disabled={loading}
                    onClick={() => goPage(number)}
                  >
                    {number}
                  </button>
                ))}
                <button
                  aria-label="Pagina următoare"
                  disabled={page >= catalog.pages || loading}
                  onClick={() => goPage(page + 1)}
                >
                  <Icon name="chevron" size={16} />
                </button>
              </nav>
            )}
            <section className="advisory-banner" id="cum-functioneaza">
              <div>
                <span className="eyebrow">Descoperă. Privește. Licitează.</span>
                <h2>
                  O altă perspectivă
                  <br />
                  asupra licitațiilor.
                </h2>
                <p>
                  Explorează catalogul aici și continuă în aplicația Pinbind.
                  Fotografii, oferte și toate detaliile produsului, într-un
                  singur loc.
                </p>
                <button
                  className="button button-primary"
                  onClick={() => setInfo("Cum funcționează Pinbind")}
                >
                  Cum funcționează <Icon name="arrow" size={16} />
                </button>
              </div>
              <div className="advisory-emblem">
                <Icon name="shield" size={72} />
              </div>
            </section>
          </section>
        </div>
      </main>
      {notice && (
        <div className="toast" role="status">
          <Icon name="check" size={18} />
          {notice}
        </div>
      )}
      {info && (
        <Dialog title={info} onClose={() => setInfo("")}>
          <div className="info-content">
            <Icon name="image" size={38} />
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
