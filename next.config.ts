import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @node-rs/argon2 ships native bindings; keep it external to the server bundle.
  serverExternalPackages: ["@node-rs/argon2"],
  turbopack: {
    // Pin the workspace root so Turbopack never mistakes an ancestor
    // directory's lockfile for the project root.
    root: process.cwd(),
  },
};

export default nextConfig;
