export type CoverLetterTemplate = {
  id: string;
  nameKey: string;
  descKey: string;
};

export type CoverLetterExample = {
  slug: string;
  roleKey: string;
  seniorityKey: string;
  stackKey: string;
  excerptKey: string;
  targetRole: string;
  sampleJobDescription: string;
  sampleResume: string;
};

export const COVER_LETTER_TEMPLATES: CoverLetterTemplate[] = [
  { id: "classic", nameKey: "coverLetter.tpl.classic", descKey: "coverLetter.tpl.classicDesc" },
  { id: "modern", nameKey: "coverLetter.tpl.modern", descKey: "coverLetter.tpl.modernDesc" },
  { id: "minimal", nameKey: "coverLetter.tpl.minimal", descKey: "coverLetter.tpl.minimalDesc" },
  { id: "impact", nameKey: "coverLetter.tpl.impact", descKey: "coverLetter.tpl.impactDesc" },
  { id: "startup", nameKey: "coverLetter.tpl.startup", descKey: "coverLetter.tpl.startupDesc" },
  { id: "enterprise", nameKey: "coverLetter.tpl.enterprise", descKey: "coverLetter.tpl.enterpriseDesc" },
];

export const COVER_LETTER_EXAMPLES: CoverLetterExample[] = [
  {
    slug: "senior-react-remote",
    roleKey: "coverLetter.ex.seniorReact",
    seniorityKey: "coverLetter.ex.senior",
    stackKey: "coverLetter.ex.react",
    excerptKey: "coverLetter.ex.seniorReactExcerpt",
    targetRole: "Senior Frontend Engineer (US Remote)",
    sampleJobDescription: `We are hiring a Senior Frontend Engineer (remote, US timezone overlap).
Requirements: React, TypeScript, Next.js, performance optimization, design systems, 5+ years experience.
Nice to have: GraphQL, testing (Jest/RTL), accessibility.`,
    sampleResume: `Senior Frontend Engineer, 6 years. Led migration to Next.js App Router, cut LCP 40%. Built design system used by 4 squads. React, TypeScript, Node. Based in Brazil, fluent English, 4h overlap with US East.`,
  },
  {
    slug: "backend-node-us",
    roleKey: "coverLetter.ex.backendNode",
    seniorityKey: "coverLetter.ex.mid",
    stackKey: "coverLetter.ex.node",
    excerptKey: "coverLetter.ex.backendNodeExcerpt",
    targetRole: "Backend Engineer - Node.js (Remote)",
    sampleJobDescription: `Backend Engineer for payments platform. Node.js, PostgreSQL, AWS, REST APIs, observability.
Must have: distributed systems basics, code reviews, on-call rotation.`,
    sampleResume: `Backend developer, 4 years Node.js/PostgreSQL. Built billing microservice handling 2M events/day. AWS Lambda, RDS, Datadog. Open source contributor.`,
  },
  {
    slug: "devops-sre-remote",
    roleKey: "coverLetter.ex.devops",
    seniorityKey: "coverLetter.ex.senior",
    stackKey: "coverLetter.ex.devopsStack",
    excerptKey: "coverLetter.ex.devopsExcerpt",
    targetRole: "DevOps / SRE (US Remote)",
    sampleJobDescription: `SRE for SaaS platform. Kubernetes, Terraform, CI/CD, incident response, SLOs.
Experience with AWS and GitHub Actions required.`,
    sampleResume: `SRE 7 years. Reduced MTTR 35% via runbooks and alerting. EKS, Terraform, ArgoCD. On-call lead for 20-engineer org.`,
  },
  {
    slug: "fullstack-typescript",
    roleKey: "coverLetter.ex.fullstack",
    seniorityKey: "coverLetter.ex.mid",
    stackKey: "coverLetter.ex.fullstackStack",
    excerptKey: "coverLetter.ex.fullstackExcerpt",
    targetRole: "Full Stack Engineer (TypeScript)",
    sampleJobDescription: `Full stack role: React + Node APIs, Prisma, PostgreSQL. Product-minded engineer, startup pace.`,
    sampleResume: `Full stack 5 years TypeScript. Shipped MVP in 8 weeks, 10k MAU. React, Node, Prisma, Supabase.`,
  },
  {
    slug: "qa-automation-us",
    roleKey: "coverLetter.ex.qa",
    seniorityKey: "coverLetter.ex.mid",
    stackKey: "coverLetter.ex.qaStack",
    excerptKey: "coverLetter.ex.qaExcerpt",
    targetRole: "QA Automation Engineer (Remote)",
    sampleJobDescription: `QA Automation: Playwright/Cypress, CI integration, API testing, shift-left culture.`,
    sampleResume: `QA Engineer 4 years. Built Playwright suite cutting regressions 50%. CI in GitHub Actions, Postman/Newman.`,
  },
  {
    slug: "data-engineer-remote",
    roleKey: "coverLetter.ex.data",
    seniorityKey: "coverLetter.ex.senior",
    stackKey: "coverLetter.ex.dataStack",
    excerptKey: "coverLetter.ex.dataExcerpt",
    targetRole: "Data Engineer (Remote)",
    sampleJobDescription: `Data pipelines with Airflow, dbt, Snowflake/BigQuery. SQL excellence, data quality checks.`,
    sampleResume: `Data Engineer 6 years. dbt + Airflow pipelines for fintech. Reduced pipeline failures 60%. SQL, Python, GCP.`,
  },
];

export function getExampleBySlug(slug: string): CoverLetterExample | undefined {
  return COVER_LETTER_EXAMPLES.find((e) => e.slug === slug);
}
