import type { NextConfig } from "next";

let rawBackendUrl = (process.env.BACKEND_URL || '').trim();

// On Render or production, if BACKEND_URL is missing or private hostname, use public Render URL
if (!rawBackendUrl || rawBackendUrl === 'creator11-backend' || rawBackendUrl === 'creator11-backend:10000') {
  rawBackendUrl = process.env.NODE_ENV === 'production'
    ? 'https://creator11-backend.onrender.com'
    : 'http://localhost:5000';
} else if (!rawBackendUrl.startsWith('http://') && !rawBackendUrl.startsWith('https://')) {
  if (rawBackendUrl.includes('.onrender.com')) {
    rawBackendUrl = `https://${rawBackendUrl}`;
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
