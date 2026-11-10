import { ImageResponse } from "next/og"

import { AppIcon } from "@/components/app-icon"
import { APP_ICONS } from "@/lib/pwa"

/*
 * The app icons, generated at build time. A route handler with a literal file
 * name per icon makes the export write real `.png` files, which GitHub Pages
 * serves as image/png (§11b). The manifest and the apple-touch-icon link point
 * at them through the same list.
 */

/*
 * Required by output: "export". A static export has no request to serve a
 * route handler from.
 */
export const dynamic = "force-static"

export function generateStaticParams() {
  return APP_ICONS.map(({ file }) => ({ file }))
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params
  const icon = APP_ICONS.find((i) => i.file === file)
  if (!icon) return new Response(null, { status: 404 })

  return new ImageResponse(
    <AppIcon size={icon.size} purpose={icon.purpose} />,
    {
      width: icon.size,
      height: icon.size,
    }
  )
}
