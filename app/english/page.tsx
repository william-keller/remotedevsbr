import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { English } from "./english-page";

export const metadata: Metadata = buildMetadata({
  title: "Aulas de Inglês para Devs | RemoteDevs BR",
  description: "Aprenda inglês técnico voltado para entrevistas e trabalho remoto internacional.",
  canonicalPath: "/english",
});

export default function Page() {
  return <English />;
}