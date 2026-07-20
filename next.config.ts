import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // Permite abrir la app desde el celular por IP en desarrollo
  allowedDevOrigins: ["192.168.0.21", "127.0.0.1", "localhost"],
  experimental: {
    proxyClientMaxBodySize: "15mb",
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  headers: async () => [
    {
      source: "/sw.js",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=0, must-revalidate",
        },
        {
          key: "Service-Worker-Allowed",
          value: "/",
        },
      ],
    },
    {
      source: "/manifest.webmanifest",
      headers: [
        {
          key: "Content-Type",
          value: "application/manifest+json",
        },
      ],
    },
  ],
};
export default nextConfig;
