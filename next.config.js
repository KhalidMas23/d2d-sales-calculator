/* eslint-disable @typescript-eslint/no-require-imports */

module.exports = {
  reactStrictMode: true,

  // Optional: if you're using images in next/image
  images: {
    remotePatterns: [
      // GitHub for Aquaria logo
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      // Allow all HTTPS domains for partner logos
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};