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
    
    // Add support for .mjs files
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: "javascript/auto",
    });
    
    return config;
  },
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // We'll handle TypeScript errors in our code
    ignoreBuildErrors: true
  },
  // Server runtime configuration
  serverRuntimeConfig: {
    // Body parser limit for larger file uploads
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  experimental: {
    esmExternals: true,
    swcMinify: true
  },
  // Output options
  output: 'standalone',
  poweredByHeader: false,
  // Disable static generation globally for the app router
  staticPageGenerationTimeout: 120,
  generateEtags: false
};

module.exports = nextConfig; 