import { NextResponse } from "next/server";
import { getAccount } from "@/lib/account-server";
import { privateHeaders, sessionCookie } from "@/lib/session-server";
export async function GET() {
  const { data, status } = await getAccount();
  const response = NextResponse.json(
    data ?? {
      error:
        status === 401
          ? "Autentifică-te pentru a vedea contul."
          : "Contul nu poate fi încărcat momentan.",
    },
    { status, headers: privateHeaders },
  );
  if (status === 401)
    response.cookies.set(sessionCookie, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  return response;
}
