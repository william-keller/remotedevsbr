import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { SalaryPage } from "./salary-page";

export const metadata: Metadata = buildMetadata({
  title: "Calculadora Salarial para Devs Remotos | RemoteDevs BR",
  description: "Calcule sua faixa salarial ideal para trabalho remoto em dólar com base na sua senioridade e stack.",
  canonicalPath: "/tools/salary",
});

export default function Page() {
  return <SalaryPage />;
}