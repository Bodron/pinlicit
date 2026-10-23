"use client";
import Image, { type ImageProps } from "next/image";
import type { Product } from "@/lib/catalog";
import { productImageUrl } from "@/lib/product-images";

// Files are encoded once at upload time. Next supplies responsive srcsets using
// their immutable variant URLs, without a second lossy encoding step.
export function ProductImage({
  product,
  alt,
  ...props
}: Omit<ImageProps, "src" | "loader" | "unoptimized"> & {
  product: Pick<Product, "imageUrl" | "imageVariants">;
}) {
  const optimized = Boolean(product.imageVariants?.length);
  return (
    <Image
      {...props}
      alt={alt}
      src={product.imageUrl}
      unoptimized={!optimized}
      loader={
        optimized ? ({ width }) => productImageUrl(product, width) : undefined
      }
    />
  );
}
