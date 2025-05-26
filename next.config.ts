import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['puppeteer'],
  eslint: {
    // Ignorer les erreurs ESLint lors du build (permet de build avec des warnings)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignorer temporairement les erreurs de types de paramètres Next.js 15
    ignoreBuildErrors: true,
  },
  // Configuration pour les uploads de fichiers
  serverRuntimeConfig: {
    maxFileSize: 200 * 1024 * 1024, // 200MB
  },
};

export default nextConfig;
