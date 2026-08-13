import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le build standalone est embarqué dans l’installeur Electron.
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  // Gittins charge son module WASM depuis son propre dossier Node ; il doit
  // rester externe au bundle serveur pour que le chemin du fichier reste valide.
  serverExternalPackages: ['gittins'],
  turbopack: {
    resolveAlias: {
      // Piper contient des branches Node optionnelles dans son bundle navigateur.
      fs: { browser: './src/lib/empty.ts' },
      path: { browser: './src/lib/empty.ts' },
    },
  },
};

export default nextConfig;
