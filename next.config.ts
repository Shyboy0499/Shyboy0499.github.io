import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath: process.env.GITHUB_ACTIONS ? '/Shyboy0499.github.io' : '',
  trailingSlash: true,
};

export default nextConfig;
