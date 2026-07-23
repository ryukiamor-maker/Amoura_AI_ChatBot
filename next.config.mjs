/** @type {import('next').NextConfig} */
const basePath = '/projects/amoura-ai-chatbot'

const nextConfig = {
  basePath,
  poweredByHeader: false,
  reactStrictMode: true,
  // Lab's fallback rewrite appends a slash when the matched remainder is empty.
  // Let the app-level redirect handle that request; otherwise Next normalizes
  // it back to the public no-slash URL and the proxy enters a 308 loop.
  skipTrailingSlashRedirect: true,
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
