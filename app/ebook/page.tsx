import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { pt } from "@/lib/i18n-dicts";
import { EbookPage } from "./ebook-page";

export const metadata: Metadata = buildMetadata({
  title: pt("ebook.seoTitle"),
  description: pt("ebook.seoDesc"),
  canonicalPath: "/ebook",
  ogType: "book",
});

export default function Page() {
  return <EbookPage />;
}