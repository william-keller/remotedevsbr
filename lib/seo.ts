import type { Metadata } from "next";
import type { OpenGraphType } from "next/dist/lib/metadata/types/opengraph-types";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://your-domain.example").replace(/\/+$/, "");

interface SeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  ogType?: OpenGraphType;
  ogImage?: string;
}

export function buildMetadata({
  title,
  description,
  canonicalPath,
  ogType = "website",
  ogImage = "/og-image.png",
}: SeoConfig): Metadata {
  const fullOgImage = ogImage.startsWith("http") ? ogImage : `${SITE_URL}${ogImage}`;
  const canonicalUrl = canonicalPath ? `${SITE_URL}${canonicalPath}` : undefined;

  return {
    title: { absolute: title },
    description,
    alternates: canonicalPath ? { canonical: canonicalUrl } : undefined,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "RemoteDevs BR",
      locale: "pt_BR",
      type: ogType,
      images: [
        {
          url: fullOgImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [fullOgImage],
    },
  };
}