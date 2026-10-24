import { ImageResponse } from "next/og"

import { OG_SIZE, OgImage } from "@/components/landing/og-image"

export const alt =
  "Kirjanpito – toiminimen yhdenkertainen kirjanpito, ALV-laskelma lokakuulta 2026"
export const size = OG_SIZE
export const contentType = "image/png"

// ImageResponse is a Route Handler; a static export needs it pinned.
export const dynamic = "force-static"

export default function Image() {
  return new ImageResponse(<OgImage lang="fi" />, size)
}
