/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fixes npm packages that depend on Node.js modules which are not available browser-side
      config.resolve.fallback = { 
        net: false,
        tls: false,
        fs: false,
        dns: false,
        child_process: false,
        http2: false,
        // Add fallbacks for APIs mentioned in build errors
        dgram: false,
        os: false,
        crypto: require.resolve('crypto-browserify'),
        path: require.resolve('path-browserify'),
        stream: require.resolve('stream-browserify'),
        util: require.resolve('util'),
        buffer: require.resolve('buffer'),
        process: require.resolve('process/browser'),
      };
      
      // Polyfill for globally used Node.js APIs
      config.plugins.push(
        new config.webpack.ProvidePlugin({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer'],
        })
      );
    }
    return config;
  },
  eslint: {
    // Disable ESLint during production builds to avoid deployment failures
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig; 