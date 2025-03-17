/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase maximum server response size
  async headers() {
    return [
      {
        source: '/api/upload',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
          // These don't directly affect the body size limit, but they help with large responses
          {
            key: 'Transfer-Encoding',
            value: 'chunked',
          },
        ],
      },
    ];
  },
  // Try both possible locations for the serverActions config
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

export default nextConfig;
