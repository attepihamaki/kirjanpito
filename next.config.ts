import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // The whole app is client-side and ships as static files. See CLAUDE.md §2.
  output: "export",
  // Emits out/app/vat/index.html rather than out/app/vat.html, which serves
  // correctly on any static host without rewrite rules.
  trailingSlash: true,
  images: { unoptimized: true },
  experimental: {
    // app/global-not-found.tsx. The plain `not-found.tsx` convention assumes a
    // single root layout to wrap it in; here both root layouts live inside the
    // (fi) and (en) route groups, so Next wraps the 404 in a bare default
    // layout and the export ends up with two <html> elements. The global
    // convention lets the 404 render its own document, like a root layout.
    globalNotFound: true,
  },
}

export default nextConfig
