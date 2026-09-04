import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { ResumePage } from "./resume-page";

export const metadata: Metadata = buildMetadata({
  title: "Criador de Currículo para Devs | RemoteDevs BR",
  description: "Crie um currículo profissional otimizado para vagas remotas internacionais com nosso builder gratuito.",
  canonicalPath: "/tools/resume",
});

export default function Page() {
  return <ResumePage />;
}