import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { ProjectsPage } from "./projects-page";

export const metadata: Metadata = buildMetadata({
  title: "Side Projects da Comunidade | RemoteDevs BR",
  description: "Conheça os side projects criados pela comunidade e vote nos seus favoritos.",
  canonicalPath: "/projects",
});

export default function Page() {
  return <ProjectsPage />;
}