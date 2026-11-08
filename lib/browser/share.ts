/** What came of offering a file to the device's share sheet. */
export type ShareResult = "shared" | "cancelled" | "unsupported"

/**
 * Hand a file to the share sheet where the browser can share files, so a phone
 * can pass the PDF to its mail app with the text filled in. "unsupported" says
 * the browser has no share sheet for files, or it failed, and the caller falls
 * back to a download and a `mailto:` link.
 */
export async function shareFile(
  file: File,
  message: { title: string; text: string }
): Promise<ShareResult> {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.share !== "function" ||
    typeof navigator.canShare !== "function" ||
    !navigator.canShare({ files: [file] })
  ) {
    return "unsupported"
  }
  try {
    await navigator.share({ files: [file], ...message })
    return "shared"
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "cancelled"
    }
    return "unsupported"
  }
}

/** Open the user's mail program on a `mailto:` link without leaving the page. */
export function openMailto(url: string): void {
  const link = document.createElement("a")
  link.href = url
  link.click()
}
