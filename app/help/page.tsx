import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { Help } from "./help-page";

export const metadata: Metadata = buildMetadata({
  title: "Central de Ajuda | RemoteDevs BR",
  description: "Tire suas dúvidas sobre a plataforma RemoteDevs BR, vagas remotas e como acelerar sua carreira internacional.",
  canonicalPath: "/help",
});

export default function Page() {
  return <Help />;
}