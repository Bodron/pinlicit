"use client";
import { ProductImage } from "./product-image";
import Link from "next/link";
import { useState } from "react";
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
  const [failed, setFailed] = useState(false);
  return (
    <article className="auction-card">
      <div className="card-media">
        {product.imageUrl && !failed ? (
          <ProductImage
            product={product}
            alt={product.title}
            fill
            sizes="(max-width: 700px) 100vw, 33vw"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="media-fallback">
            <Icon name="image" size={42} />
            <span>
              {failed
                ? "Fotografia nu poate fi încărcată"
                : "Fotografie indisponibilă"}
            </span>
          </div>
        )}
        <Link
          className="media-open"
          href={`/anunturi/${product._id}`}
          aria-label={`Vezi fotografia: ${product.title}`}
        />
        <div className="card-badges">
          <span className="badge">
            <Icon name="image" size={15} /> Fotografia produsului
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
          className="media-open-icon"
          href={`/anunturi/${product._id}`}
          aria-label={`Deschide ${product.title}`}
        >
          <Icon name="image" size={42} />
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
