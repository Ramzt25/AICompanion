/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ai-companion/shared'],
  webpack: (config) => {
    config.externals.push({
      'pg-native': 'pg-native',
    })
    return config
  },
}

module.exports = nextConfig