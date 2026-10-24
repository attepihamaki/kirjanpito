import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/site"

// Required by output: "export" — this is a Route Handler, and a static
// export has no request to serve it from.
export const dynamic = "force-static"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Belt and braces alongside the noindex metadata on the app layout.
      disallow: "/app/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
