import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { pt } from "@/lib/i18n-dicts";
import { PrivacyPolicy } from "./privacy-policy-page";

export const metadata: Metadata = buildMetadata({
  title: `${pt("privacy.title")} | RemoteDevs BR`,
  description: pt("privacy.desc"),
  canonicalPath: "/privacy-policy",
});

export default function Page() {
  return <PrivacyPolicy />;
}