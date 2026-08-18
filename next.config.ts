import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnNavigation: true,
  reloadOnOnline: true,
  globPublicPatterns: ["**/*.{svg,png,ico,json}"],
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    typedEnv: true,
  },
};

export default withSerwist(nextConfig);
