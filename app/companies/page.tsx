import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { CompaniesPage } from "./companies-page";

export const metadata: Metadata = buildMetadata({
  title: "Empresas Contratando Devs Remotos | RemoteDevs BR",
  description: "Conheça as empresas gringas que mais contratam brasileiros.",
  canonicalPath: "/companies",
});

export default function Page() {
  return <CompaniesPage />;
}