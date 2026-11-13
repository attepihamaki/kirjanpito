// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"

import { isHeic, jpegName, storableImage } from "@/lib/browser/heic"

/* HEIC photos turned into JPEG on attach (§7.4). */

afterEach(() => vi.unstubAllGlobals())

describe("isHeic and jpegName", () => {
  it("knows a HEIC or HEIF photo by its type or its name", () => {
    expect(isHeic({ name: "IMG_1.HEIC", type: "" })).toBe(true)
    expect(isHeic({ name: "x", type: "image/heif" })).toBe(true)
    expect(isHeic({ name: "kuitti.jpg", type: "image/jpeg" })).toBe(false)
  })

  it("swaps the extension for .jpg", () => {
    expect(jpegName("IMG_0042.HEIC")).toBe("IMG_0042.jpg")
    expect(jpegName("kuitti")).toBe("kuitti.jpg")
    expect(jpegName(" ")).toBe("kuva.jpg")
  })
})

describe("storableImage", () => {
  const heic = new File([new Uint8Array([1, 2, 3])], "IMG_1.HEIC", {
    type: "image/heic",
  })

  it("leaves a file that is not HEIC alone", async () => {
    const jpeg = new File(["x"], "a.jpg", { type: "image/jpeg" })
    expect(await storableImage(jpeg)).toBe(jpeg)
  })

  it("keeps the original where the browser cannot decode it", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => {
        throw new DOMException("unsupported", "InvalidStateError")
      })
    )
    expect(await storableImage(heic)).toBe(heic)
  })

  it("writes a JPEG under the photo's own name where it can", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 4, height: 3, close: vi.fn() }))
    )
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      function (callback) {
        callback(new Blob(["jpeg-bytes"], { type: "image/jpeg" }))
      }
    )
    const out = await storableImage(heic)
    expect(out.name).toBe("IMG_1.jpg")
    expect(out.type).toBe("image/jpeg")
    expect(out.size).toBe(10)
  })
})
