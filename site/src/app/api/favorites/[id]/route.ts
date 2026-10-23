import { NextResponse } from "next/server";
import {
  backendRequest,
  privateHeaders,
  sameOrigin,
  sessionToken,
} from "@/lib/session-server";
async function mutate(request: Request, params: Promise<{ id: string }>) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Cerere nepermisă." },
      { status: 403, headers: privateHeaders },
    );
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id))
    return NextResponse.json(
      { error: "Anunț invalid." },
      { status: 400, headers: privateHeaders },
    );
  const token = await sessionToken();
  if (!token)
    return NextResponse.json(
      { error: "Autentifică-te pentru a modifica favoritele." },
      { status: 401, headers: privateHeaders },
    );
  try {
    const upstream = await backendRequest(`me/favorites/${id}`, token, {
      method: request.method,
    });
    if (!upstream.ok) {
      let message = "Favoritele nu au putut fi actualizate.";
      if (upstream.status === 401)
        message = "Sesiunea a expirat. Autentifică-te din nou.";
      if (upstream.status === 400)
        message =
          "Anunțul nu poate fi adăugat la favorite. Verifică să nu fie propriul produs.";
      if (upstream.status === 404) message = "Anunțul nu mai este disponibil.";
      return NextResponse.json(
        { error: message },
        {
          status: [400, 401, 403, 404].includes(upstream.status)
            ? upstream.status
            : 503,
          headers: privateHeaders,
        },
      );
    }
    return NextResponse.json(
      { productId: id, isFavorite: request.method === "POST" },
      { headers: privateHeaders },
    );
  } catch {
    return NextResponse.json(
      { error: "Nu ne putem conecta la platformă." },
      { status: 503, headers: privateHeaders },
    );
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return mutate(request, params);
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return mutate(request, params);
}
