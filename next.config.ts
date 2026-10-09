import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: { "/api/report-pdf": ["./public/fonts/*.ttf"] },
};

export default nextConfig;
