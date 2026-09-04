import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { pt } from "@/lib/i18n-dicts";
import { CoverLetterPage } from "./cover-letter-page";

export const metadata: Metadata = buildMetadata({
  title: pt("coverLetter.seoTitle"),
  description: pt("coverLetter.seoDesc"),
  canonicalPath: "/tools/cover-letter",
});

export default function Page() {
  return <CoverLetterPage />;
}