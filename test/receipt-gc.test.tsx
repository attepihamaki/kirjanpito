// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { useReceiptGc } from "@/hooks/use-receipt-gc"
import { getReceipt, putReceipt } from "@/lib/browser/receipt-store"
import { useBookStore } from "@/stores/book-store"

/* The receipt sweep (§7.4) against receipts that no entry holds yet. */

const SWEEP_MS = 400
const orphan = "fixture" as unknown as Blob

const settle = () => new Promise((resolve) => setTimeout(resolve, SWEEP_MS))

describe("useReceiptGc", () => {
  beforeEach(() => {
    useBookStore.setState({
      hydrated: true,
      importing: false,
      entries: [],
      draftAttachmentIds: [],
      undoAttachmentIds: [],
    })
  })

  it("removes a receipt nothing refers to", async () => {
    await putReceipt("a-orphan", orphan)
    renderHook(() => useReceiptGc(true))

    await waitFor(async () =>
      expect(await getReceipt("a-orphan")).toBeUndefined()
    )
  })

  it("waits out an import, and sweeps once it is over", async () => {
    useBookStore.setState({ importing: true })
    await putReceipt("a-importing", orphan)
    renderHook(() => useReceiptGc(true))

    useBookStore.getState().requestGc()
    await settle()
    expect(await getReceipt("a-importing")).toBeDefined()

    useBookStore.setState({ importing: false })
    await waitFor(async () =>
      expect(await getReceipt("a-importing")).toBeUndefined()
    )
  })

  it("keeps a receipt registered for the open dialog", async () => {
    await putReceipt("a-draft", orphan)
    useBookStore.setState({ draftAttachmentIds: ["a-draft"] })
    renderHook(() => useReceiptGc(true))

    await settle()
    expect(await getReceipt("a-draft")).toBeDefined()
  })
})
