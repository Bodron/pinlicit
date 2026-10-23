import { NextResponse } from "next/server";
import { getPublicProduct } from "@/lib/product-server";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { product, status } = await getPublicProduct(id);
  return NextResponse.json(
    product ?? {
      error:
        status === 404
          ? "Anunțul nu mai este disponibil."
          : "Nu putem actualiza anunțul momentan.",
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
