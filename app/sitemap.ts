import type { MetadataRoute } from "next"

import { INDEXABLE, SITE_URL } from "@/lib/site"

/*
 * Required by output: "export" — this is a Route Handler, and a static
 * export has no request to serve it from.
 */
export const dynamic = "force-static"

/**
 * Only the landing page is indexable; everything under /app is the
 * bookkeeping app itself and carries `noindex`. The app is also offered in
 * English, but that is a stored preference rather than a URL, so there is
 * nothing to declare here beyond the one document.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  /*
   * SEO is off (§11b): nothing is offered for indexing. The file is still
   * emitted, empty, so turning indexing back on needs no change here.
   */
  if (!INDEXABLE) return []

  return [
    {
      url: `${SITE_URL}/`,
      changeFrequency: "monthly",
      priority: 1,
    },
  ]
}
