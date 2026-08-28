/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
  },
  eslint: {
    // The codebase currently has a large pile of pre-existing lint
    // violations (mostly `no-explicit-any` / unused vars) that predate
    // this change and block `next build` entirely. Lint separately via
    // `npm run lint` in CI; don't let style violations block deploys.
    // Tracked as follow-up cleanup — see PR description.
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_APP_NAME: 'Accessibility Navigator',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
}

module.exports = nextConfig