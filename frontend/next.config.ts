import type { NextConfig } from "next";

let rawBackendUrl = (process.env.BACKEND_URL || 'http://localhost:5000').trim();

// Ensure destination URL starts with http:// or https:// for Next.js rewrites
if (!rawBackendUrl.startsWith('http://') && !rawBackendUrl.startsWith('https://')) {
  if (rawBackendUrl.includes('.onrender.com')) {
    rawBackendUrl = `https://${rawBackendUrl}`;
  } else if (!rawBackendUrl.includes(':')) {
    rawBackendUrl = `http://${rawBackendUrl}:10000`;
  } else {
    rawBackendUrl = `http://${rawBackendUrl}`;
  }
}

const backendUrl = rawBackendUrl.replace(/\/+$/, '');

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '*.trycloudflare.com',
    'localhost:3000',
    '127.0.0.1:3000',
    'localhost:3001',
    '127.0.0.1:3001',
    '*.onrender.com',
  ],
  async rewrites() {
    return [
      {
        source: '/api-backend/:path*',
        destination: `${backendUrl}/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
