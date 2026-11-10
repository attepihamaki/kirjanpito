import { BASE_PATH } from "@/lib/site"

/**
 * What the installed app covers (§11b). The landing page is inside it, because
 * that is where a file is opened, so an installed app can start offline with
 * no bookkeeping open.
 */
export const APP_SCOPE = `${BASE_PATH}/`

/**
 * Where an installed app starts. `/app` sends an open bookkeeping to the
 * overview and a closed one to the landing page (§8.1).
 */
export const APP_START_URL = `${BASE_PATH}/app/`

/** The service worker, written into the export by `scripts/build-sw.mjs`. */
export const SERVICE_WORKER_URL = `${BASE_PATH}/sw.js`

/**
 * The app icons, each a real `.png` written by the route handler at
 * app/icons/[file]. GitHub Pages types a response from its extension, so the
 * file names carry it.
 *
 * `any` icons are a rounded square on a transparent ground. `maskable` and
 * `apple` fill the whole square, because the platform cuts its own shape out
 * of them.
 */
export const APP_ICONS = [
  { file: "icon-192.png", size: 192, purpose: "any" },
  { file: "icon-512.png", size: 512, purpose: "any" },
  { file: "icon-maskable-512.png", size: 512, purpose: "maskable" },
  { file: "apple-touch-icon.png", size: 180, purpose: "apple" },
] as const

export type AppIconSpec = (typeof APP_ICONS)[number]

/**
 * An icon's URL. Neither the manifest nor an icon link passes through Next's
 * `basePath`, so the prefix is spelled out here.
 */
export function appIconUrl(file: AppIconSpec["file"]): string {
  return `${BASE_PATH}/icons/${file}`
}
