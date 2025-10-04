/** @type {import('next').NextConfig} */
// Refresh cache
const nextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      maxDuration: 120, // Increase timeout to 2 minutes for AI operations
    },
    serverComponentsExternalPackages: ['openai'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'proposalup.wahajmansoor.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
