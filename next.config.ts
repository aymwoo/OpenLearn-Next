import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
  // 关闭严格模式，更快
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true, // 完全绕过 sharp，dev 模式不会报错
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
}

export default nextConfig
