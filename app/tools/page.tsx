import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { ToolsPage } from "./tools-page";

export const metadata: Metadata = buildMetadata({
  title: "Ferramentas Grátis para Devs | RemoteDevs BR",
  description: "Ferramentas gratuitas: carta de apresentação com IA, verificador ATS, calculadora salarial e otimizador de LinkedIn.",
  canonicalPath: "/tools",
});

export default function Page() {
  return <ToolsPage />;
}