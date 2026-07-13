/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
