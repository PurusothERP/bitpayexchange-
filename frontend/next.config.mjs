/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' bundles only what's needed — significantly reduces
  // deployment size and cold-start time on Azure App Service.
  output: 'standalone',

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.ipfs.io' },
      { protocol: 'https', hostname: 'ipfs.io' },
      { protocol: 'https', hostname: '**.pinata.cloud' },
      { protocol: 'https', hostname: 'gateway.pinata.cloud' },
      { protocol: 'https', hostname: '**.cloudflare-ipfs.com' },
      { protocol: 'https', hostname: '**.githubusercontent.com' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com' },
    ],
  },
};

export default nextConfig;
