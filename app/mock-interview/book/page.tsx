import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { pt } from "@/lib/i18n-dicts";
import { BookMockInterview } from "./book-mock-interview-page";

export const metadata: Metadata = buildMetadata({
  title: `${pt("mockInterview.book.title")} | RemoteDevs BR`,
  description: pt("mockInterview.seoDesc"),
  canonicalPath: "/mock-interview/book",
});

export default function Page() {
  return <BookMockInterview />;
}