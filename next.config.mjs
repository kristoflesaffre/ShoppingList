// Grote afbeeldingsmappen staan op Vercel Blob i.p.v. in elke deployment
// (zie .vercelignore en scripts/sync-static-images.mjs). Houd in sync met
// src/lib/static-images.ts.
const STATIC_IMAGES_BASE_URL =
  process.env.STATIC_IMAGES_BASE_URL ??
  "https://qkivl469lscxy579.public.blob.vercel-storage.com";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/images/landal/:path*",
        destination: "/images/vakantie/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return {
      // fallback: alleen als het bestand niet in public/ staat (lokaal wel).
      fallback: [
        {
          source: "/images/:path*",
          destination: `${STATIC_IMAGES_BASE_URL}/images/:path*`,
        },
      ],
    };
  },
  experimental: {
    // Next 14: externe Instant-packages niet door webpack voor server (minder crash → HTML 500).
    serverComponentsExternalPackages: ["@instantdb/admin", "@instantdb/core"],
    // Verhoog body size limit voor foto-upload naar AI (meerdere JPEG's tegelijk).
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  webpack(config) {
    // Nodig voor zxing-wasm (client-side QR/barcode decoder)
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },
};

export default nextConfig;
