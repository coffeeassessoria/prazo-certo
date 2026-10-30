/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [{ source: '/guia', destination: '/guia/index.html' }]
  },
  experimental: { serverActions: { bodySizeLimit: '12mb' } },
}
export default nextConfig
