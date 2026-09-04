import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { LinkedinPage } from "./linkedin-page";

export const metadata: Metadata = buildMetadata({
  title: "Otimizador de LinkedIn para Devs | RemoteDevs BR",
  description: "Otimize seu perfil do LinkedIn para atrair recrutadores internacionais de empresas que contratam remotamente.",
  canonicalPath: "/tools/linkedin",
});

export default function Page() {
  return <LinkedinPage />;
}