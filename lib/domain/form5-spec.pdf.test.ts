// @vitest-environment node
import fs from "node:fs"
import path from "node:path"

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"
import { describe, expect, it } from "vitest"

import { FORM5_FIELDS } from "@/lib/domain/form5-spec"

const PDF = path.join(
  process.cwd(),
  "docs/specs/verohallinto_tietuekuvaus_2026_5.pdf"
)

/* Letters and digits only, so line breaks and hyphenation do not matter. */
const squash = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}%]/gu, "")

async function specRows() {
  const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(PDF)) })
    .promise
  const rows: { code: string; text: string }[] = []
  for (let p = 4; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent()
    let current: { code: string; text: string } | null = null
    const items = content.items
      .filter(
        (i): i is typeof i & { str: string; transform: number[] } =>
          "str" in i && i.str.trim() !== ""
      )
      .sort(
        (a, b) =>
          b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]
      )
    for (const item of items) {
      const x = Math.round(item.transform[4])
      if (x === 62 && /^\d{3}$/.test(item.str.trim())) {
        current = { code: item.str.trim(), text: "" }
        rows.push(current)
      } else if (x === 62) {
        current = null
      } else if (current && x >= 182 && x < 436) {
        current.text += item.str
      }
    }
  }
  return rows
}

describe("FORM5_FIELDS against the specification PDF", () => {
  it("has every field of the PDF's table, with the PDF's label", async () => {
    const rows = await specRows()
    const byCode = new Map(rows.map((r) => [Number(r.code), squash(r.text)]))
    for (const field of FORM5_FIELDS) {
      const pdf = byCode.get(field.code)
      expect(pdf, `code ${field.code} is in the PDF`).toBeDefined()
      expect(pdf!.startsWith(squash(field.fi).slice(0, 20))).toBe(true)
    }
  })
})
