/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("puppeteer-extra", "puppeteer-extra-plugin-stealth");
    }
    return config;
  },
};

export default nextConfig;
