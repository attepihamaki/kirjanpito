import { execSync } from "node:child_process"
import type { NextConfig } from "next"

import pkg from "./package.json"
import { BASE_PATH } from "./lib/site"

/** The package version and, where git is at hand, the short commit (§7.6). */
function appBuild(): string {
  try {
    const sha = execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim()
    return sha ? `${pkg.version}+${sha}` : pkg.version
  } catch {
    return pkg.version
  }
}

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
  env: { NEXT_PUBLIC_APP_BUILD: appBuild() },
}

export default nextConfig
