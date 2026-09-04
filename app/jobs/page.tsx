import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { JobsPage } from "./jobs-page";

export const metadata: Metadata = buildMetadata({
  title: "Vagas Remotas Internacionais para Devs | RemoteDevs BR",
  description: "Encontre as melhores vagas de trabalho remoto internacional em dólar.",
  canonicalPath: "/jobs",
});

export default function Page() {
  return <JobsPage />;
}