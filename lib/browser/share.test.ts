// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"

import { openMailto, shareFile } from "@/lib/browser/share"

const file = new File(["%PDF"], "lasku.pdf", { type: "application/pdf" })
const message = { title: "Lasku", text: "Hei" }

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function stubNavigator(nav: Partial<Navigator>) {
  vi.stubGlobal("navigator", nav)
}

describe("shareFile", () => {
  it("is unsupported where there is no share sheet", async () => {
    stubNavigator({})
    expect(await shareFile(file, message)).toBe("unsupported")
  })

  it("is unsupported where the share sheet takes no files", async () => {
    stubNavigator({ share: vi.fn(), canShare: () => false })
    expect(await shareFile(file, message)).toBe("unsupported")
  })

  it("hands the file and the text to the share sheet", async () => {
    const share = vi.fn(async () => {})
    stubNavigator({ share, canShare: () => true })
    expect(await shareFile(file, message)).toBe("shared")
    expect(share).toHaveBeenCalledWith({ files: [file], ...message })
  })

  it("reports a cancelled share, which needs no fallback", async () => {
    stubNavigator({
      share: vi.fn(async () => {
        throw new DOMException("cancelled", "AbortError")
      }),
      canShare: () => true,
    })
    expect(await shareFile(file, message)).toBe("cancelled")
  })

  it("falls back when the share fails for another reason", async () => {
    stubNavigator({
      share: vi.fn(async () => {
        throw new DOMException("denied", "NotAllowedError")
      }),
      canShare: () => true,
    })
    expect(await shareFile(file, message)).toBe("unsupported")
  })
})

describe("openMailto", () => {
  it("clicks a link to the address without leaving the page", () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {})
    openMailto("mailto:a@b.fi?subject=A")
    expect(click).toHaveBeenCalledOnce()
    const link = click.mock.contexts[0] as HTMLAnchorElement
    expect(link.href).toBe("mailto:a@b.fi?subject=A")
  })
})
