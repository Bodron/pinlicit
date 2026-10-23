import { NextResponse } from "next/server";
import {
  backendRequest,
  privateHeaders,
  sessionToken,
} from "@/lib/session-server";
import { publicApplications } from "@/lib/verification";
export async function GET() {
  const token = await sessionToken();
  if (!token)
    return NextResponse.json(
      { error: "Autentifică-te pentru a vedea cererile contului." },
      { status: 401, headers: privateHeaders },
    );
  try {
    const upstream = await backendRequest("seller-applications/me", token);
    if (!upstream.ok)
      return NextResponse.json(
        {
          error:
            upstream.status === 401
              ? "Sesiunea a expirat."
              : "Cererile nu sunt disponibile momentan.",
        },
        {
          status: upstream.status === 401 ? 401 : 503,
          headers: privateHeaders,
        },
      );
    return NextResponse.json(
      { applications: publicApplications(await upstream.json()) },
      { headers: privateHeaders },
    );
  } catch {
    return NextResponse.json(
      { error: "Nu putem încărca istoricul cererilor." },
      { status: 503, headers: privateHeaders },
    );
  }
}
