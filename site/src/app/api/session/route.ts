import { NextResponse } from "next/server";
import {
  backendRequest,
  privateHeaders,
  sameOrigin,
  sessionCookie,
} from "@/lib/session-server";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Cerere nepermisă." },
      { status: 403, headers: privateHeaders },
    );
  if (!request.headers.get("content-type")?.includes("application/json"))
    return NextResponse.json(
      { error: "Format neacceptat." },
      { status: 415, headers: privateHeaders },
    );
  try {
    const raw = await request.text();
    if (raw.length > 4096)
      return NextResponse.json(
        { error: "Datele introduse sunt prea lungi." },
        { status: 400, headers: privateHeaders },
      );
    let input: { email?: unknown; password?: unknown };
    try {
      input = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Date invalide." },
        { status: 400, headers: privateHeaders },
      );
    }
    if (
      !input ||
      typeof input.email !== "string" ||
      typeof input.password !== "string" ||
      input.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()) ||
      input.password.length < 8 ||
      input.password.length > 256
    )
      return NextResponse.json(
        {
          error: "Introdu un email valid și o parolă de cel puțin 8 caractere.",
        },
        { status: 400, headers: privateHeaders },
      );
    const upstream = await backendRequest("auth/login", undefined, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email.trim(),
        password: input.password,
      }),
    });
    if (!upstream.ok)
      return NextResponse.json(
        {
          error:
            upstream.status === 401
              ? "Emailul sau parola sunt incorecte ori contul nu este disponibil."
              : "Autentificarea nu este disponibilă momentan.",
        },
        {
          status: upstream.status === 401 ? 401 : 503,
          headers: privateHeaders,
        },
      );
    const result = await upstream.json();
    if (typeof result.accessToken !== "string") throw new Error();
    const response = NextResponse.json(
      { ok: true },
      { headers: privateHeaders },
    );
    const secure =
      new URL(request.url).protocol === "https:" ||
      request.headers.get("x-forwarded-proto") === "https";
    response.cookies.set(sessionCookie, result.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 7 * 86400,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Nu ne putem conecta la platformă. Încearcă din nou." },
      { status: 503, headers: privateHeaders },
    );
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Cerere nepermisă." },
      { status: 403, headers: privateHeaders },
    );
  const response = NextResponse.json({ ok: true }, { headers: privateHeaders });
  response.cookies.set(sessionCookie, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
