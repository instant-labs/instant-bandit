/** @type {import('next').NextConfig} */
const nextConfig = {

  // Note: Using strict mode in development is good practice.
  // However, be aware that this interntionally causes double renders,
  // and therefore can be confusing when diagnosing flicker/CLS issues.
  reactStrictMode: false,

  swcMinify: true,
};

module.exports = nextConfig;
