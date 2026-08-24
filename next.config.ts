import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @node-rs/argon2 ships native bindings; keep it external to the server bundle.
  serverExternalPackages: ["@node-rs/argon2"],
  // Don't advertise the framework/version.
  poweredByHeader: false,
  turbopack: {
    // Pin the workspace root so Turbopack never mistakes an ancestor
    // directory's lockfile for the project root.
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // The dashboard never embeds third-party frames.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
