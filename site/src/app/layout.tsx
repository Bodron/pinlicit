import type { Metadata } from "next";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pinbind — Descoperă licitațiile prin video",
  description:
    "Descoperă anunțurile video și licitațiile active de pe Pinbind. Explorează, filtrează și găsește următoarea piesă din colecția ta.",
  icons: { icon: "/pinbind-icon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ro" className="h-full antialiased">
      <body id="top" className="min-h-full flex flex-col">
        <a href="#catalog" className="skip-link">
          Sari la conținut
        </a>
        {children}
      </body>
    </html>
  );
}
