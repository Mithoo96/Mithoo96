import type { NextConfig } from "next";

// `npm run export` builds a static copy of the demo into ./out for simple hosting (Netlify, Vercel, any static host).
const nextConfig: NextConfig = process.env.STATIC_EXPORT ? { output: "export" } : { experimental: { serverActions: { bodySizeLimit: "16mb" } } };
export default nextConfig;
