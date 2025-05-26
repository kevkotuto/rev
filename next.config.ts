import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['puppeteer']
  },
  // Configuration pour les uploads de fichiers
  api: {
    bodyParser: {
      sizeLimit: '200mb',
    },
  },
  // Configuration pour les uploads via les routes API
  serverRuntimeConfig: {
    maxFileSize: 200 * 1024 * 1024, // 200MB
  },
};

export default nextConfig;
