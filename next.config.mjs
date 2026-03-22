/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next 14: externe Instant-packages niet door webpack voor server (minder crash → HTML 500).
    serverComponentsExternalPackages: ["@instantdb/admin", "@instantdb/core"],
  },
};

export default nextConfig;
