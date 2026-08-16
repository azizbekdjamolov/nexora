/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    // In development the browser talks to the API same-origin via /api/*
    // (single domain = simple cookies, no CORS). In production set
    // NEXT_PUBLIC_API_URL on the client instead.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:4000";
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;