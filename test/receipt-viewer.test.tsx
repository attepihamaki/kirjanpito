// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AttachmentGrid } from "@/components/entry/attachment-grid"
import { LangProvider } from "@/components/lang-provider"
import { AttachmentViewer } from "@/components/receipt/receipt-viewer"
import type { Attachment } from "@/lib/domain/types"

/* A receipt the browser stores but cannot draw, as a HEIC outside Safari (§8.6). */

vi.mock("@/lib/browser/receipt-store", () => ({
  getReceipt: vi.fn(async () => new Blob(["x"], { type: "image/heic" })),
}))

const heic: Attachment = {
  id: "a-heic",
  name: "kuitti.heic",
  type: "image/heic",
  size: 1,
}

describe("an undecodable receipt", () => {
  beforeEach(() => {
    vi.stubGlobal("createImageBitmap", async () => {
      throw new Error("cannot decode")
    })
    URL.createObjectURL = vi.fn(() => "blob:x")
    URL.revokeObjectURL = vi.fn()
  })

  it("can still be saved from the viewer", async () => {
    render(
      <LangProvider lang="fi">
        <AttachmentViewer
          attachments={[heic]}
          index={0}
          onIndexChange={() => {}}
          onClose={() => {}}
        />
      </LangProvider>
    )
    expect(
      await screen.findByRole("button", { name: "Tallenna alkuperäinen" })
    ).toBeVisible()
  })

  it("shows its name in the grid when the image fails to load", async () => {
    render(
      <LangProvider lang="fi">
        <AttachmentGrid
          attachments={[heic]}
          onAdd={() => {}}
          onOpen={() => {}}
          onRemove={() => {}}
        />
      </LangProvider>
    )
    const image = await screen.findByRole("img")
    fireEvent.error(image)

    await waitFor(() => expect(screen.getByText("kuitti.heic")).toBeVisible())
    expect(screen.queryByRole("img")).toBeNull()
  })
})
