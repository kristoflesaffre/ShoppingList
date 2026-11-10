import withSerwistInit from "@serwist/next";

/**
 * Service worker (Serwist): de app opent ook zonder internet. Zie src/app/sw.ts voor wat er bewaard wordt.
 * Uit tijdens `next dev`, zodat lokaal testen nooit uit een oude cache komt.
 */
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  // Niets uit public/ vooraf (± 120 MB foto's): iconen en foto's komen in de cache zodra je ze ziet.
  globPublicPatterns: [],
  additionalPrecacheEntries: [{ url: "/offline", revision: process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now()) }],
  // Na terug online niet herladen: InstantDB synchroniseert vanzelf, herladen zou invoer onderbreken.
  reloadOnOnline: false,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the HTTPS Hue preview separate from the existing HTTP preview/build.
  distDir: process.env.LOCAL_HTTPS_DEV === "1" ? ".next-https" : ".next",
  async redirects() {
    return [
      {
        source: "/images/landal/:path*",
        destination: "/images/vakantie/:path*",
        permanent: true,
      },
    ];
  },
  experimental: {
    // The manual Gemini route reads these style references on the server.
    outputFileTracingIncludes: {
      "/api/recipes/generate-photo": ["./public/images/reference_images/reference_image_*.png"],
    },
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

export default withSerwist(nextConfig);
