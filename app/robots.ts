import type { MetadataRoute } from "next"

import { BASE_PATH, SITE_URL } from "@/lib/site"

// Required by output: "export" — this is a Route Handler, and a static
// export has no request to serve it from.
export const dynamic = "force-static"

/**
 * The paths here are host-absolute, so they carry BASE_PATH: a crawler reads
 * robots.txt against the origin and knows nothing of Next's basePath.
 *
 * While the site is served from attepihamaki.github.io/kirjanpito this file
 * is published at /kirjanpito/robots.txt, which crawlers do not read — only
 * the host root counts, and that belongs to the user Pages site. It is still
 * written correctly so that pointing a domain at the root starts working
 * without a code change; until then the noindex metadata on the app layout
 * is what actually keeps /app out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: `${BASE_PATH}/`,
      // Belt and braces alongside the noindex metadata on the app layout.
      disallow: `${BASE_PATH}/app/`,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: new URL(SITE_URL).host,
  }
}
