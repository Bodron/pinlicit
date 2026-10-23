import "server-only";
import { positionsFromBids } from "./account-positions";
import type { ApiProduct } from "./account-positions";
import { accountProduct as product } from "./account-positions";
import type { AccountResult, AccountUser } from "./account";
import { backendRequest, sessionToken } from "./session-server";
export async function getAccount(): Promise<AccountResult> {
  const token = await sessionToken();
  if (!token) return { data: null, status: 401 };
  try {
    const me = await backendRequest("me", token);
    if (!me.ok) return { data: null, status: me.status === 401 ? 401 : 503 };
    const u = await me.json();
    const user: AccountUser = {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone,
    };
    const paths = ["me/bids", "me/favorites", "me/products"];
    const responses = await Promise.all(
      paths.map(async (path) => {
        try {
          const response = await backendRequest(path, token);
          return {
            status: response.status,
            items: response.ok ? await response.json() : null,
          };
        } catch {
          return { status: 503, items: null };
        }
      }),
    );
    if (responses.some((r) => r.status === 401))
      return { data: null, status: 401 };
    const [bids, favorites, products] = responses;
    const warnings = responses.flatMap((r, index) =>
      r.items === null
        ? [
            ["Ofertele", "Favoritele", "Anunțurile"][index] +
              " nu au putut fi actualizate.",
          ]
        : [],
    );
    return {
      status: 200,
      data: {
        user,
        positions: bids.items ? positionsFromBids(bids.items) : null,
        favorites: favorites.items ? favorites.items.map(product) : null,
        products: products.items
          ? products.items
              .filter((p: ApiProduct) => p.status !== "hidden")
              .map(product)
          : null,
        updatedAt: Date.now(),
        warnings,
      },
    };
  } catch {
    return { data: null, status: 503 };
  }
}
