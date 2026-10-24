import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The service worker is hand-written (public/sw.js, registered by
// components/pwa-register.tsx); next-pwa's webpack plugin does not run under
// Turbopack, which Next 16 uses for builds.

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        // The extension and desktop app call the API from other origins
        // using API keys (no cookies), so a permissive CORS policy is safe.
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Authorization, Content-Type, X-Start-Seconds, X-Duration-Seconds',
          },
        ],
      },
    ]
  },
}

export default nextConfig
