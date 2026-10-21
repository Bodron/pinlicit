import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Licit Super Admin",
  description: "Seller approval dashboard for Licit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
