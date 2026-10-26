import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // The whole app is client-side and ships as static files. See CLAUDE.md §2.
  output: "export",
  // Emits out/app/vat/index.html rather than out/app/vat.html, which serves
  // correctly on any static host without rewrite rules.
  trailingSlash: true,
  images: { unoptimized: true },
}

export default nextConfig
