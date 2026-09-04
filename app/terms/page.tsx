import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { pt } from "@/lib/i18n-dicts";
import { TermsPage } from "./terms-page";

export const metadata: Metadata = buildMetadata({
  title: `${pt("terms.title")} | RemoteDevs BR`,
  description: pt("terms.desc"),
  canonicalPath: "/terms",
});

export default function Page() {
  return <TermsPage />;
}