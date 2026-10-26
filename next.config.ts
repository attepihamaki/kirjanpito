import type { NextConfig } from "next"

import { BASE_PATH } from "./lib/site"

const nextConfig: NextConfig = {
  // The whole app is client-side and ships as static files. See CLAUDE.md §2.
  output: "export",
  // GitHub Pages serves this project repo under /kirjanpito. basePath covers
  // the routes, every next/link and the _next/ assets, so no assetPrefix is
  // needed — the two only differ when assets come from another origin.
  basePath: BASE_PATH,
  // Emits out/app/vat/index.html rather than out/app/vat.html, which serves
  // correctly on any static host without rewrite rules.
  trailingSlash: true,
  images: { unoptimized: true },
}

export default nextConfig
