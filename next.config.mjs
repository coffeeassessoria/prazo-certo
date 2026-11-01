/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async headers() { return [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }, { key: 'Service-Worker-Allowed', value: '/' }] }] },
  async rewrites() {
    return [{ source: '/guia', destination: '/guia/index.html' }]
  },
  experimental: { serverActions: { bodySizeLimit: '12mb' } },
}
export default nextConfig
