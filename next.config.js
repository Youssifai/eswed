/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['avatars.githubusercontent.com', 'img.clerk.com'],
  },
  // Simple fallbacks for Node.js APIs
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { 
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        dns: false,
        http2: false,
        path: false,
        os: false,
        stream: false,
        crypto: false,
        dgram: false,
        "aws-crt": false, // Fix AWS SDK edge compatibility
        events: require.resolve("events/"),
      };
    }
    return config;
  },
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // We'll handle TypeScript errors in our code
    ignoreBuildErrors: false
  },
  // Increase the body parser limit for larger file uploads
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

module.exports = nextConfig; 