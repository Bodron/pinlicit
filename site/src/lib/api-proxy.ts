import { NextResponse } from "next/server";

export async function proxyPublic(path: string, query?: URLSearchParams) {
  const base = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:3000";
  const url = new URL(`${base.replace(/\/$/, "")}/${path}`);
  if (query) for (const [key, value] of query) url.searchParams.set(key, value);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      return NextResponse.json(
        {
          error:
            response.status === 400
              ? "Verifică filtrele selectate."
              : "Catalogul nu este disponibil momentan.",
        },
        { status: response.status === 400 ? 400 : 502 },
      );
    return NextResponse.json(await response.json(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Nu ne putem conecta la platformă. Încearcă din nou." },
      { status: 503 },
    );
  }
}
