import { ImageResponse } from "next/og"

import { OG_FILE, OG_SIZE, OgImage } from "@/components/landing/og-image"

/**
 * The Open Graph card, generated at build time.
 *
 * This is a route handler rather than Next's `app/opengraph-image.tsx` file
 * convention, for one reason: the convention emits the PNG to
 * `out/opengraph-image`, with no extension, and tags it as
 * `/opengraph-image`. The content type travels in the route's `contentType`
 * export, which a host that serves the route can honour — but the site is a
 * static export on GitHub Pages, which serves plain files and types each
 * response from its extension. The extensionless file would go out as
 * `application/octet-stream` and link-preview crawlers would reject it.
 * See https://github.com/vercel/next.js/issues/82177.
 *
 * A dynamic segment whose only value is a literal file name sidesteps that:
 * `generateStaticParams` makes the export write a real
 * `out/og/opengraph-image.png`, and the metadata in app/page.tsx points at it
 * by the same constant. Nothing here is dynamic at runtime — the export is
 * fully static, as everything else is.
 */

// Required by output: "export" — a static export has no request to serve a
// route handler from.
export const dynamic = "force-static"

export function generateStaticParams() {
  return [{ file: OG_FILE }]
}

export function GET() {
  return new ImageResponse(<OgImage lang="fi" />, OG_SIZE)
}
