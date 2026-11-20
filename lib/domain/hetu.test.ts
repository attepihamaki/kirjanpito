import { describe, expect, it } from "vitest"

import { parseHetu } from "@/lib/domain/hetu"

describe("parseHetu", () => {
  it.each([
    ["131052-308T", "131052-308T"],
    [" 131052-308t ", "131052-308T"],
    ["131052 - 308 t", "131052-308T"],
    ["131052+308T", "131052+308T"],
    ["131052A308T", "131052A308T"],
    ["131052a308t", "131052A308T"],
    ["131052Y308T", "131052Y308T"],
  ])("reads %s", (value, expected) => {
    expect(parseHetu(value)).toBe(expected)
  })

  it.each([
    "",
    "131052-308S",
    "001052-308D",
    "321052-3082",
    "130052-308R",
    "131352-3087",
    "131052-30T",
    "131052-3088T",
    "131052Z308T",
    "131052*308T",
  ])("refuses %s", (value) => {
    expect(parseHetu(value)).toBeNull()
  })
})
