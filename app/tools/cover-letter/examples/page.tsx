import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { pt } from "@/lib/i18n-dicts";
import { CoverLetterExamplesPage } from "./examples-page";

export const metadata: Metadata = buildMetadata({
  title: pt("coverLetter.examplesSeoTitle"),
  description: pt("coverLetter.examplesSeoDesc"),
  canonicalPath: "/tools/cover-letter/examples",
});

export default function Page() {
  return <CoverLetterExamplesPage />;
}