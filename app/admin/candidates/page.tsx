"use client";

// TODO (item 4): Admin Candidate Search
// Página para administradores buscarem e filtrarem perfis cadastrados
// (stack, senioridade, nível de inglês, faixa salarial, readiness score, etc.).
// Será o protótipo da feature de "recruiter marketplace".
import { AppLayout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { RequireAdmin } from "@/components/Guards";
import { Construction } from "lucide-react";

function Inner() {
  return (
    <AppLayout>
      <SEO
        title="Admin - Candidatos | RemoteDevs BR"
        description="Busca de candidatos no painel administrativo."
        canonicalPath="/admin/candidates"
      />
      <div className="container max-w-3xl py-20 text-center">
        <Construction className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-3xl font-bold">Candidate Search (em breve)</h1>
        <p className="text-muted-foreground mt-3">
          Busca e filtros avançados sobre o pool de candidatos.
          Próximo ciclo: filtros por stack, senioridade, inglês, salário e readiness score,
          além de exportação e shortlists para recruiters.
        </p>
      </div>
    </AppLayout>
  );
}

export default function AdminCandidates() {
  return <RequireAdmin><Inner /></RequireAdmin>;
}
