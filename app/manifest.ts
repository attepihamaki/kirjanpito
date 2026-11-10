import type { MetadataRoute } from "next"

import { APP_ICONS, APP_SCOPE, APP_START_URL, appIconUrl } from "@/lib/pwa"

/*
 * Required by output: "export". This is a Route Handler, and a static export
 * has no request to serve it from.
 */
export const dynamic = "force-static"

/**
 * The web app manifest (§11b), which lets a browser install the site as an
 * app. One manifest, in Finnish: like the indexed document, it has no
 * per-language URL.
 *
 * `launch_handler` sends a second launch to the window that is already open,
 * because one tab at a time holds the bookkeeping (§12).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: APP_START_URL,
    name: "Kirjanpito",
    short_name: "Kirjanpito",
    description:
      "Selaimessa toimiva yhdenkertainen kirjanpito toiminimelle. Tiedot pysyvät omalla koneellasi.",
    lang: "fi",
    start_url: APP_START_URL,
    scope: APP_SCOPE,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    launch_handler: { client_mode: "focus-existing" },
    icons: APP_ICONS.filter((icon) => icon.purpose !== "apple").map((icon) => ({
      src: appIconUrl(icon.file),
      sizes: `${icon.size}x${icon.size}`,
      type: "image/png",
      purpose: icon.purpose as "any" | "maskable",
    })),
  }
}
