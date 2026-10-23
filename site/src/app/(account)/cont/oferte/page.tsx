import { BidLedger } from "@/components/bid-ledger";
export const metadata = {
  title: "Ofertele și istoricul meu | Pinbind",
  robots: { index: false, follow: false },
};
export default function BidsPage() {
  return <BidLedger />;
}
