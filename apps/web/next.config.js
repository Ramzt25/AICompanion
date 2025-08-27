/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  transpilePackages: ['@ai-companion/shared'],
  webpack: (config) => {
    config.externals.push({
      'pg-native': 'pg-native',
    })
    return config
  },
}

module.exports = nextConfig