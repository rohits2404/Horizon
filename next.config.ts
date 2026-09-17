import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default withSentryConfig(nextConfig, {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options

    org: "ro-organization",

    project: "javascript-nextjs-horizon",

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // Upload a larger set of source maps for prettier stack traces
    widenClientFileUpload: true,

    // Uncomment to route browser requests to Sentry through a Next.js rewrite
    // tunnelRoute: "/monitoring",

    webpack: {
        // Enables automatic instrumentation of Vercel Cron Monitors
        automaticVercelMonitors: true,

        // Tree-shaking options for reducing bundle size
        treeshake: {
            // Remove Sentry logger statements to reduce bundle size
            removeDebugLogging: true,
        },
    },
});
