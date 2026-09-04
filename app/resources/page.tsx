import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { ResourcesPage } from "./resources-page";

export const metadata: Metadata = buildMetadata({
  title: "Recursos para Trabalho Remoto Internacional | RemoteDevs BR",
  description: "Acesse guias, artigos e recursos essenciais para conseguir seu primeiro emprego remoto em empresa dos EUA.",
  canonicalPath: "/resources",
});

export default function Page() {
  return <ResourcesPage />;
}