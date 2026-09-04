import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { Achievements } from "./achievements-page";

export const metadata: Metadata = buildMetadata({
  title: "Conquistas | RemoteDevs BR",
  description: "Veja suas conquistas, badges e progresso de XP na plataforma RemoteDevs BR.",
  canonicalPath: "/achievements",
});

export default function Page() {
  return <Achievements />;
}