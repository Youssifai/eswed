/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fixes npm packages that depend on `net` module which is not available browser-side
      config.resolve.fallback = { 
        net: false,
        tls: false,
        fs: false,
        dns: false,
        child_process: false,
        http2: false
      };
    }
    return config;
  },
};

module.exports = nextConfig; 