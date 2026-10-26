import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/site"

// Required by output: "export" — this is a Route Handler, and a static
// export has no request to serve it from.
export const dynamic = "force-static"

/**
 * Only the landing page is indexable; everything under /app is the
 * bookkeeping app itself and carries `noindex`. The app is also offered in
 * English, but that is a stored preference rather than a URL, so there is
 * nothing to declare here beyond the one document.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      changeFrequency: "monthly",
      priority: 1,
    },
  ]
}
