import type { NextConfig } from "next";

// The browser calls /api/v1 on this same origin and Next forwards it to the FastAPI backend, so a
// phone needs only one https URL (one tunnel) and no CORS setup.
const backend = process.env.KAIROS_API_ORIGIN ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  async rewrites() {
    return [
      { source: "/api/v1/health", destination: `${backend}/health` },
      { source: "/api/v1/:path*", destination: `${backend}/api/v1/:path*` },
    ];
  },
  experimental: {
    // Default is 30s; a first live load of a large event page can take about a minute.
    proxyTimeout: 150_000,
  },
  partialPrefetching: true,
  turbopack: { root: process.cwd() },
};

export default nextConfig;
