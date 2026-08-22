import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["http://127.0.0.1:3000", "http://localhost:3000", "http://21.0.21.87:3000"],
};

export default nextConfig;
