"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  categoryName,
  money,
  remaining,
  reserveMet,
  type Product,
} from "@/lib/catalog";
import { Icon } from "./icon";

export function CatalogCard({
  product,
  saved,
  onSave,
  now,
}: {
  product: Product;
  saved: boolean;
  onSave: () => void;
  now: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" },
    );
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  return (
    <article className="auction-card">
      <div className="card-media" ref={container}>
        {product.thumbnailUrl && !failed ? (
          <Image
            src={product.thumbnailUrl}
            alt={product.title}
            fill
            unoptimized
            onError={() => setFailed(true)}
          />
        ) : visible && product.videoUrl && !failed ? (
          <video
            src={`${product.videoUrl.split("#")[0]}#t=0.1`}
            preload="metadata"
            muted
            playsInline
            onError={() => setFailed(true)}
            aria-label={`Previzualizare ${product.title}`}
          />
        ) : (
          <div className="media-fallback">
            <Icon name="video" size={42} />
            <span>{failed ? "Vezi videoclipul în anunț" : "Anunț video"}</span>
          </div>
        )}
        <Link
          className="media-open"
          href={`/anunturi/${product._id}`}
          aria-label={`Vezi videoclipul: ${product.title}`}
        />
        <div className="card-badges">
          <span className="badge">
            <Icon name="play" size={15} /> Prezentare video
          </span>
          <span className="badge badge-dark">
            <span className="live-dot" />
            {remaining(product.endsAt, now)}
          </span>
        </div>
        <button
          className={`save-button ${saved ? "is-saved" : ""}`}
          aria-label={
            saved
              ? `Elimină ${product.title} din salvate`
              : `Salvează ${product.title} în acest browser`
          }
          aria-pressed={saved}
          onClick={onSave}
        >
          <Icon name="heart" size={19} />
        </button>
        <Link
          className="media-play"
          href={`/anunturi/${product._id}`}
          aria-label={`Deschide ${product.title}`}
        >
          <Icon name="play" size={42} />
        </Link>
      </div>
      <div className="card-description">
        <div className="lot-meta">
          <span>{categoryName(product.category?.name)}</span>
          <span className={reserveMet(product) ? "reserve-met" : ""}>
            {reserveMet(product) ? "Rezervă atinsă" : "Rezervă neatinsă"}
          </span>
        </div>
        <h2>
          <Link href={`/anunturi/${product._id}`}>{product.title}</Link>
        </h2>
        <p>{product.description}</p>
      </div>
      <div className="card-bottom">
        <div>
          <span className="eyebrow">Oferta curentă</span>
          <strong>{money(product.currentPrice)}</strong>
          <span className="seller-label">
            {product.seller?.name
              ? `de ${product.seller.name}`
              : "Pe platforma Pinbind"}
          </span>
        </div>
        <Link
          className="button button-primary button-small"
          href={`/anunturi/${product._id}`}
        >
          Vezi anunțul
          <Icon name="arrow" size={15} />
        </Link>
      </div>
    </article>
  );
}
