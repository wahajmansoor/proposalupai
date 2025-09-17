import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      maxDuration: 120, // Increase timeout to 2 minutes for AI operations
    },
  },
  // Add the development server's origin to the list of allowed origins.
  // This resolves a cross-origin request warning during development.
  allowedDevOrigins: [
    '6000-firebase-studio-1757946881684.cluster-c36dgv2kibakqwbbbsgmia3fny.cloudworkstations.dev',
  ],
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
    ],
  },
};

export default nextConfig;
