/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Only rewrite in development. In production (Vercel), we use the integrated /api functions.
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
      return []
    }
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/:path*`,
      },
    ]
  },
}

export default nextConfig
