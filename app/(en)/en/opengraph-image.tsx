import { ImageResponse } from "next/og"

import { OG_SIZE, OgImage } from "@/components/landing/og-image"

export const alt =
  "Bookkeeping – single-entry books for Finnish sole traders, VAT return for October 2026"
export const size = OG_SIZE
export const contentType = "image/png"

// ImageResponse is a Route Handler; a static export needs it pinned.
export const dynamic = "force-static"

export default function Image() {
  return new ImageResponse(<OgImage lang="en" />, size)
}
