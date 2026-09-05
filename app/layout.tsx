import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "RemoteDevs BR - Trabalhe remoto para empresas dos EUA",
    template: "%s | RemoteDevs BR",
  },
  description: "Acelere sua carreira internacional e encontre as melhores vagas remotas que pagam em dólar.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "RemoteDevs BR - Trabalhe remoto para empresas dos EUA",
    description: "Acelere sua carreira internacional e encontre as melhores vagas remotas que pagam em dólar.",
    url: SITE_URL,
    siteName: "RemoteDevs BR",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RemoteDevs BR - Trabalhe Remoto Para Empresas dos EUA",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RemoteDevs BR - Trabalhe remoto para empresas dos EUA",
    description: "Acelere sua carreira internacional e encontre as melhores vagas remotas que pagam em dólar.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
