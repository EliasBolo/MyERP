import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs', 'speakeasy'],
  },
  images: {
    remotePatterns: [],
  },
};

export default withNextIntl(nextConfig);
