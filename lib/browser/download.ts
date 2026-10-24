/**
 * Saving a file. The prototype used claude.ai's `window.claude.use("downloads")`
 * capability; outside that sandbox a Blob plus an `<a download>` is all it
 * needs (CLAUDE.md §2).
 */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function saveText(text: string, filename: string, type: string): void {
  saveBlob(new Blob([text], { type }), filename)
}

export async function fileToUint8Array(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer())
}

export function readFileAsText(file: Blob): Promise<string> {
  return file.text()
}
