import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevents bundling issues with nodemailer on Vercel serverless
  serverExternalPackages: ["nodemailer"],
  // Optimise image handling
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
