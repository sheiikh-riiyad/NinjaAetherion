import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  distDir: process.env.NETLIFY_BUILD === "true" ? ".next-netlify" : ".next",
  allowedDevOrigins: ["192.168.10.224"],
};

export default nextConfig;
