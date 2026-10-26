import { describe, expect, it, vi } from "vitest"

/*
 * next/font only resolves inside the Next build, and app/layout.tsx loads
 * Geist at module scope. The metadata below is what this file is about.
 */
vi.mock("next/font/google", () => {
  const font = () => ({ variable: "", className: "", style: {} })
  return { Geist: font, Geist_Mono: font }
})

import { metadata } from "@/app/layout"
import robots from "@/app/robots"
import sitemap from "@/app/sitemap"
import { BASE_PATH, INDEXABLE, SITE_URL } from "@/lib/site"

/**
 * INDEXABLE (§11b) drives three files — the robots meta on every document,
 * robots.txt and the sitemap — that a reader of any one of them cannot see
 * the other two from.
 *
 * These assertions are written against the flag rather than against a fixed
 * expectation, so they pass whichever way it is set and fail when the three
 * stop agreeing with it.
 */
describe("SEO switch", () => {
  it("sets the robots meta on every document from the flag", () => {
    expect(metadata.robots).toMatchObject({
      index: INDEXABLE,
      follow: INDEXABLE,
    })
  })

  it("writes a robots.txt that agrees with it", () => {
    const { rules, sitemap: sitemapUrl } = robots()
    // One rule object, not an array — narrowing for the assertions below.
    expect(Array.isArray(rules)).toBe(false)
    const rule = rules as Exclude<typeof rules, unknown[]>

    if (INDEXABLE) {
      expect(rule.disallow).toBe(`${BASE_PATH}/app/`)
      expect(sitemapUrl).toBe(`${SITE_URL}/sitemap.xml`)
    } else {
      // The whole host, and no sitemap to contradict it.
      expect(rule.disallow).toBe("/")
      expect(rule.allow).toBeUndefined()
      expect(sitemapUrl).toBeUndefined()
    }
  })

  it("offers the landing page in the sitemap only when indexable", () => {
    const urls = sitemap().map((entry) => entry.url)
    expect(urls).toEqual(INDEXABLE ? [`${SITE_URL}/`] : [])
  })

  it("keeps the Open Graph card regardless, so links still preview", () => {
    // noindex keeps a page out of search results, not out of a chat app.
    expect(metadata.metadataBase?.toString()).toContain(SITE_URL)
  })
})
