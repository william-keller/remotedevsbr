import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { ClassesPage } from "./classes-page";

export const metadata: Metadata = buildMetadata({
  title: "Aulas de Inglês para Devs | RemoteDevs BR",
  description: "Aprenda inglês voltado para entrevistas e trabalho remoto no exterior.",
  canonicalPath: "/classes",
});

export default function Page() {
  return <ClassesPage />;
}