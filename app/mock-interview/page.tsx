import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { pt } from "@/lib/i18n-dicts";
import { MockInterview } from "./mock-interview-page";

export const metadata: Metadata = buildMetadata({
  title: pt("mockInterview.seoTitle"),
  description: pt("mockInterview.seoDesc"),
  canonicalPath: "/mock-interview",
});

export default function Page() {
  return <MockInterview />;
}