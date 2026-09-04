import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { pt } from "@/lib/i18n-dicts";
import { CoverLetterTemplatesPage } from "./templates-page";

export const metadata: Metadata = buildMetadata({
  title: pt("coverLetter.templatesSeoTitle"),
  description: pt("coverLetter.templatesSeoDesc"),
  canonicalPath: "/tools/cover-letter/templates",
});

export default function Page() {
  return <CoverLetterTemplatesPage />;
}