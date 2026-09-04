import type { Metadata } from "next";

import { getExampleBySlug } from "@/lib/cover-letter-content";
import { pt } from "@/lib/i18n-dicts";
import { buildMetadata, SITE_URL } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { ExampleDetailPage } from "./example-detail-page";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ex = getExampleBySlug(slug);
  if (!ex) return {};
  return buildMetadata({
    title: `${pt(ex.roleKey)} | ${pt("coverLetter.examplesSeoTitle")}`,
    description: pt(ex.excerptKey),
    canonicalPath: `/tools/cover-letter/examples/${ex.slug}`,
  });
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const ex = getExampleBySlug(slug);
  if (!ex) return <ExampleDetailPage slug={slug} />;

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: pt(ex.roleKey),
    description: pt(ex.excerptKey),
    url: `${SITE_URL}/tools/cover-letter/examples/${ex.slug}`,
  };

  return (
    <>
      <JsonLd data={article} />
      <ExampleDetailPage slug={slug} />
    </>
  );
}