import { Watchlist } from "@/components/watchlist";
export const metadata = {
  title: "Favoritele mele | Pinbind",
  robots: { index: false, follow: false },
};
export default function FavoritesPage() {
  return <Watchlist />;
}
