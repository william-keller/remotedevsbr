import type { NextConfig } from "next";

const noindexPaths = [
  "/dashboard",
  "/profile",
  "/onboarding",
  "/applications",
  "/analytics",
  "/pro",
  "/reset-password",
  "/update-password",
  "/english-check",
  "/admin/:path*",
  "/recruiter/:path*",
];

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/invoice-generator",
        destination: "/tools/invoice-generator",
        statusCode: 301,
      },
    ];
  },
  async headers() {
    return noindexPaths.map((source) => ({
      source,
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    }));
  },
};

export default nextConfig;