import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { HomePage } from "./home-page";

export const metadata: Metadata = buildMetadata({
  title: "RemoteDevs BR - Trabalhe remoto para empresas dos EUA",
  description: "Acelere sua carreira internacional e encontre as melhores vagas remotas que pagam em dólar.",
  canonicalPath: "/",
});

export default function Page() {
  return <HomePage />;
}