import { describe, expect, it } from "vitest"

import {
  MAX_EDGE,
  jpegName,
  scaleFor,
  shouldKeepOriginal,
} from "@/lib/domain/image-policy"

describe("shouldKeepOriginal", () => {
  it("keeps a small JPEG", () => {
    expect(shouldKeepOriginal(1600, 1200, 900_000, "image/jpeg")).toBe(true)
  })

  it("keeps PNG and WebP too", () => {
    expect(shouldKeepOriginal(800, 600, 100_000, "image/png")).toBe(true)
    expect(shouldKeepOriginal(800, 600, 100_000, "image/webp")).toBe(true)
  })

  it("redraws anything past 2000 px on its long edge", () => {
    expect(shouldKeepOriginal(3000, 1000, 100_000, "image/jpeg")).toBe(false)
    expect(shouldKeepOriginal(1000, 3000, 100_000, "image/jpeg")).toBe(false)
  })

  it("redraws anything over 1,5 MB", () => {
    expect(shouldKeepOriginal(800, 600, 2_000_000, "image/jpeg")).toBe(false)
  })

  it("redraws formats it cannot keep, whatever the size", () => {
    expect(shouldKeepOriginal(100, 100, 1000, "image/heic")).toBe(false)
    expect(shouldKeepOriginal(100, 100, 1000, "image/gif")).toBe(false)
  })

  it("accepts the exact limits", () => {
    expect(shouldKeepOriginal(2000, 2000, 1_500_000, "image/jpeg")).toBe(true)
  })
})

describe("scaleFor", () => {
  it("never upscales", () => {
    expect(scaleFor(800, 600)).toBe(1)
    expect(scaleFor(MAX_EDGE, 100)).toBe(1)
  })

  it("scales the long edge down to 2000 px", () => {
    expect(scaleFor(4000, 2000)).toBe(0.5)
    expect(scaleFor(1000, 4000)).toBe(0.5)
  })
})

describe("jpegName", () => {
  it("swaps a known extension", () => {
    expect(jpegName("a.heic")).toBe("a.jpg")
    expect(jpegName("kuitti.PNG")).toBe("kuitti.jpg")
  })

  it("appends when there is no extension", () => {
    expect(jpegName("no-extension")).toBe("no-extension.jpg")
  })

  it("falls back for an empty name", () => {
    expect(jpegName("")).toBe("tosite.jpg")
  })
})
