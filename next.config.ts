import type { NextConfig } from "next";

const CSP = [
  "default-src 'self'",
  // 'unsafe-inline' required: Next.js injects inline scripts for streaming/hydration
  "script-src 'self' 'unsafe-inline'",
  // 'unsafe-inline' required: Leaflet sets inline styles on map elements
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://*.googleusercontent.com",
  "connect-src 'self' https://*.supabase.co",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'geolocation=(), camera=(), microphone=()' },
          { key: 'Strict-Transport-Security',  value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy',    value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
