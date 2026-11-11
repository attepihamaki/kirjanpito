import { describe, expect, it } from "vitest"

import {
  clearToastHistory,
  markToastsSeen,
  recordToast,
  unreadToastCount,
} from "@/stores/toast-history"

describe("toast history unread count", () => {
  it("counts messages recorded after the dialog last showed them", () => {
    clearToastHistory()
    markToastsSeen()
    expect(unreadToastCount()).toBe(0)
    recordToast({ title: "one" })
    recordToast({ title: "two" })
    expect(unreadToastCount()).toBe(2)
    markToastsSeen()
    expect(unreadToastCount()).toBe(0)
    recordToast({ title: "three" })
    expect(unreadToastCount()).toBe(1)
  })

  it("skips a toast with no text", () => {
    markToastsSeen()
    recordToast({})
    expect(unreadToastCount()).toBe(0)
  })

  it("has nothing unread once cleared", () => {
    recordToast({ title: "four" })
    clearToastHistory()
    expect(unreadToastCount()).toBe(0)
  })
})
