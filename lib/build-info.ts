/**
 * The build that is running: the package version and the short commit it was
 * built from, such as "0.0.1+bff1bcc". `next.config.ts` sets it at build time,
 * and a run without it, such as the tests, reads "dev". `settings.json`
 * records it as `writtenBy`, so a bug report can name the build that wrote a
 * file (§7.6).
 */
export const APP_BUILD = process.env.NEXT_PUBLIC_APP_BUILD || "dev"
