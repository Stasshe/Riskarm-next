/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    unoptimized: true,
  },
  staticPageGenerationTimeout: 300,
};

module.exports = nextConfig;
