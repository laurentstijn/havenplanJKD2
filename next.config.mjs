/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Deze environment variables zijn al beschikbaar via NEXT_PUBLIC_
    // maar we kunnen ze hier expliciet definiëren voor duidelijkheid
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Vervang server-only environment variables met undefined op client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
}

export default nextConfig
