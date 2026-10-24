import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/site"

// Required by output: "export" — this is a Route Handler, and a static
// export has no request to serve it from.
export const dynamic = "force-static"

/**
 * Only the two landing pages are indexable; everything under /app is the
 * bookkeeping app itself and carries `noindex`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = {
    fi: `${SITE_URL}/`,
    en: `${SITE_URL}/en/`,
  }

  return [
    {
      url: `${SITE_URL}/`,
      changeFrequency: "monthly",
      priority: 1,
      alternates: { languages },
    },
    {
      url: `${SITE_URL}/en/`,
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: { languages },
    },
  ]
}
