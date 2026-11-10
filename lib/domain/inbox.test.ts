import { describe, expect, it } from "vitest"

import {
  inboxFileItems,
  inboxKey,
  inboxPaths,
  parseInboxFileItem,
  type InboxItem,
} from "@/lib/domain/inbox"
import { parseSettings } from "@/lib/domain/settings-file"

const item = (over: Partial<InboxItem>): InboxItem => ({
  id: "a-1",
  name: "kuitti.jpg",
  type: "image/jpeg",
  size: 10,
  added: "2026-11-10",
  ...over,
})

describe("inboxPaths", () => {
  it("puts each file in the language's folder with a unique name", () => {
    const items = [
      item({ id: "a-1", name: "Kuitti.JPG" }),
      item({ id: "a-2", name: "kuitti.jpg" }),
      item({ id: "a-3", name: "lasku", type: "application/pdf" }),
    ]
    expect([...inboxPaths(items, "fi")]).toEqual([
      [inboxKey("a-1"), "saapuneet/Kuitti.jpg"],
      [inboxKey("a-2"), "saapuneet/kuitti-2.jpg"],
      [inboxKey("a-3"), "saapuneet/lasku.pdf"],
    ])
    expect(inboxPaths(items, "en").get(inboxKey("a-3"))).toBe("inbox/lasku.pdf")
  })

  it("gives a file that is not a receipt no path", () => {
    const items = [item({ name: "notes.txt", type: "text/plain" })]
    expect(inboxPaths(items, "fi").size).toBe(0)
    expect(inboxFileItems(items, inboxPaths(items, "fi"))).toEqual([])
  })
})

describe("parseInboxFileItem", () => {
  it("reads a listed item and keeps what was read from it", () => {
    expect(
      parseInboxFileItem({
        path: "saapuneet/lasku.pdf",
        name: "lasku.pdf",
        type: "application/pdf",
        size: 1200,
        added: "2026-11-01",
        guess: { date: "2026-10-30", amount: 12550, vendor: "Nurmi" },
      })
    ).toEqual({
      path: "saapuneet/lasku.pdf",
      name: "lasku.pdf",
      type: "application/pdf",
      size: 1200,
      added: "2026-11-01",
      guess: { date: "2026-10-30", amount: 12550, vendor: "Nurmi" },
    })
  })

  it("refuses a path outside the archive or not a receipt", () => {
    expect(parseInboxFileItem({ path: "../x.pdf" })).toBeNull()
    expect(parseInboxFileItem({ path: "saapuneet/x.exe" })).toBeNull()
    expect(parseInboxFileItem("x")).toBeNull()
  })

  it("fills what is missing or wrong leniently", () => {
    expect(
      parseInboxFileItem({
        path: "saapuneet/kuva.jpg",
        size: -1,
        added: "eilen",
        guess: { date: "x", amount: 1.5, vendor: " " },
      })
    ).toEqual({
      path: "saapuneet/kuva.jpg",
      name: "kuva.jpg",
      type: "",
      size: 0,
      added: "",
    })
  })
})

describe("settings.json", () => {
  it("drops unusable inbox items and keeps the rest", () => {
    const parsed = parseSettings(
      JSON.stringify({
        version: 1,
        inbox: [{ path: "saapuneet/a.pdf" }, { path: "/etc/passwd" }, 3],
      })
    )
    expect(parsed.inbox?.map((i) => i.path)).toEqual(["saapuneet/a.pdf"])
  })
})
