import type { Product } from "./catalog";

export function productImageUrl(
  product: Pick<Product, "imageUrl" | "imageVariants">,
  width: number,
) {
  const variants = (product.imageVariants ?? [])
    .filter((item) => item.width > 0 && item.url)
    .slice()
    .sort((a, b) => a.width - b.width);
  return (
    variants.find((item) => item.width >= width)?.url ??
    variants.at(-1)?.url ??
    product.imageUrl
  );
}
