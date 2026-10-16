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
