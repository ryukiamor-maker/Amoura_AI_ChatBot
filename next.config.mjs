/** @type {import('next').NextConfig} */
const basePath = '/projects/amoura-ai-chatbot'

const nextConfig = {
  basePath,
  poweredByHeader: false,
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/',
        destination: `${basePath}/preview`,
        basePath: false,
        permanent: false
      }
    ]
  }
}

export default nextConfig
