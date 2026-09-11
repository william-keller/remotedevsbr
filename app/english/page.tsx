import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { pt } from "@/lib/i18n-dicts";
import { SITE_URL } from "@/lib/seo";
import { ENGLISH_BRAND } from "@/lib/english/config";
import { EnglishPage } from "./english-page";

export const metadata: Metadata = buildMetadata({
  title: pt("english.seoTitle"),
  description: pt("english.seoDesc"),
  canonicalPath: "/english",
});

const courseJsonLd = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: ENGLISH_BRAND.programName,
  description: pt("english.seoDesc"),
  provider: {
    "@type": "Organization",
    name: "RemoteDevsBR",
    sameAs: SITE_URL,
  },
  inLanguage: ["pt-BR", "en"],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <EnglishPage />
    </>
  );
}