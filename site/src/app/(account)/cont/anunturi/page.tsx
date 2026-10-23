import { MyListings } from "@/components/my-listings";
export const metadata = {
  title: "Anunțurile mele | Pinbind",
  robots: { index: false, follow: false },
};
export default function MyListingsPage() {
  return <MyListings />;
}
