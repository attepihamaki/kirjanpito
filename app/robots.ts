import type { MetadataRoute } from "next"

import { BASE_PATH, INDEXABLE, SITE_URL } from "@/lib/site"

/*
 * Required by output: "export" — this is a Route Handler, and a static
 * export has no request to serve it from.
 */
export const dynamic = "force-static"

/**
 * The paths here are host-absolute, so they carry BASE_PATH: a crawler reads
 * robots.txt against the origin and knows nothing of Next's basePath.
 *
 * While the site is served under BASE_PATH this file is published at
 * /kirjanpito/robots.txt, which crawlers do not read — only the host root
 * counts. It is still written correctly, so pointing a domain at the root
 * starts working without a code change; until then the noindex metadata on
 * each document is what keeps /app out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  /*
   * SEO is off (§11b). Disallow everything and point at no sitemap, so the
   * file never contradicts the noindex the documents carry.
   */
  if (!INDEXABLE) {
    return { rules: { userAgent: "*", disallow: "/" } }
  }

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
