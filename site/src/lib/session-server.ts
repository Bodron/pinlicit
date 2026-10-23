import "server-only";
import { cookies } from "next/headers";
export const sessionCookie = "pinbind_session";
export const privateHeaders = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
};
export function sameOrigin(request: Request) {
  try {
    const origin = new URL(request.headers.get("origin") ?? "");
    return (
      ["http:", "https:"].includes(origin.protocol) &&
      origin.host === request.headers.get("host") &&
      request.headers.get("sec-fetch-site") !== "cross-site"
    );
  } catch {
    return false;
  }
}
export async function backendRequest(
  path: string,
  token?: string,
  init?: RequestInit,
) {
  const base = (
    process.env.API_INTERNAL_URL ?? "http://127.0.0.1:3000"
  ).replace(/\/$/, "");
  return fetch(`${base}/${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
    headers: {
      ...init?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
export async function sessionToken() {
  return (await cookies()).get(sessionCookie)?.value;
}
