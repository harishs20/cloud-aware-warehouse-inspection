import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from the FastAPI backend origin
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  output: "export",
  // Ensure the API URL env var is available at build time for client bundles
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ?? "https://debate-exercise-damaged-recipient.trycloudflare.com",
  },
};

export default nextConfig;
