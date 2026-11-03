import type { NextConfig } from "next";

// `npm run export` builds a static copy of the demo into ./out for simple hosting (Netlify, Vercel, any static host).
const nextConfig: NextConfig = process.env.STATIC_EXPORT ? { output: "export" } : {
  // Keep browser action references and server workers on the same Preview build.
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  experimental: { serverActions: { bodySizeLimit: "16mb" } },
  outputFileTracingIncludes: {
    "/*": ["./server/db/certs/supabase-staging-root.crt"],
  },
};
export default nextConfig;
