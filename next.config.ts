import type { NextConfig } from "next";

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
};

export default nextConfig;