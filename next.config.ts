import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

/** Pasta do projeto (bendita), para o Next não inferir a raiz errada (ex.: C:\Users\bruno por outro package-lock). */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Evita aviso "inferred workspace root" e garante .env.local / tracing a partir desta pasta
  outputFileTracingRoot: projectRoot,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
