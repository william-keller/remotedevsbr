import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { pt } from "@/lib/i18n-dicts";
import { AnalyzeResume } from "./analyze-page";

export const metadata: Metadata = buildMetadata({
  title: pt("analyze.seoTitle"),
  description: pt("analyze.seoDesc"),
  canonicalPath: "/analyze",
});

export default function Page() {
  return <AnalyzeResume />;
}