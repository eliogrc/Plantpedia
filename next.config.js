/**
 * @type {import('next').NextConfig}
 */
const { i18n } = require('./next-i18next.config')
const withBundleAnalyzer =
  process.env.ANALYZE === 'true'
    ? require('@next/bundle-analyzer')({ enabled: true })
    : (config) => config

const ContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' https://images.ctfassets.net https://randomfox.ca https://avatars.githubusercontent.com data: blob:",
  "connect-src 'self' https://graphql.contentful.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self' https://github.com",
].join('; ')

const nextConfig = {
  output: 'standalone',
  // Material UI v4 uses findDOMNode internally in TouchRipple/Modal; disabling
  // StrictMode silences the React 18 StrictMode findDOMNode dev warning.
  reactStrictMode: false,
  poweredByHeader: false,
  // Desactivar source maps en producción
  productionBrowserSourceMaps: false,
  // Security & Cache headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '0',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy,
          },
        ],
      },
      {
        source: '/(leaf.png|favicon.ico|robots.txt)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
          },
        ],
      },
    ]
  },
  // Turns off the built-in optimizer (/_next/image answers 404): every image uses
  // Contentful's own CDN resizing through components/Image.tsx.
  images: {
    loader: 'custom',
    loaderFile: './lib/contentfulImageLoader.js',
  },
  i18n,
}

module.exports = withBundleAnalyzer(nextConfig)
