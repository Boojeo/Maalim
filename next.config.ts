import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// CLAUDE.md rule 2: a production build must never be able to show unverified passages.
if (process.env.NODE_ENV === "production" && process.env.DEV_ALLOW_UNVERIFIED === "1") {
  throw new Error("DEV_ALLOW_UNVERIFIED=1 is not allowed in a production build.");
}

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Source videos are never served; only encoded clips in public/videos.
  outputFileTracingIncludes: { "/**": ["./content/**", "./prompts/**", "./eval/results/**"] },
  outputFileTracingExcludes: { "*": ["public/videos/src/**"] },
};

export default withNextIntl(nextConfig);
