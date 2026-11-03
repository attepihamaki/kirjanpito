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
          description="Osto"
          onAdd={() => {}}
          onOpen={() => {}}
          onRemove={() => {}}
          onRename={() => {}}
        />
      </LangProvider>
    )
    const image = await screen.findByRole("img")
    fireEvent.error(image)

    await waitFor(() => expect(screen.getByText("kuitti.heic")).toBeVisible())
    expect(screen.queryByRole("img")).toBeNull()
  })
})

describe("the name a receipt was given (§8.5)", () => {
  const named: Attachment = { ...heic, label: "K-Rauta kuitti" }

  it("titles the viewer with it, and the file name without one", () => {
    const view = (att: Attachment) => (
      <LangProvider lang="fi">
        <AttachmentViewer
          attachments={[att]}
          index={0}
          onIndexChange={() => {}}
          onClose={() => {}}
        />
      </LangProvider>
    )

    const { unmount } = render(view(named))
    expect(screen.getByRole("heading")).toHaveTextContent("K-Rauta kuitti")
    unmount()

    render(view(heic))
    expect(screen.getByRole("heading")).toHaveTextContent("kuitti.heic")
  })

  /*
   * The placeholder is the name the file really gets when the box is left
   * empty, so the suggestion is on screen rather than implied (§7.2).
   */
  it("suggests the name the file would get, and reports what is typed", () => {
    const onRename = vi.fn()
    render(
      <LangProvider lang="fi">
        <AttachmentGrid
          attachments={[heic]}
          description="Osto – K-Rauta"
          onAdd={() => {}}
          onOpen={() => {}}
          onRemove={() => {}}
          onRename={onRename}
        />
      </LangProvider>
    )

    const box = screen.getByRole("textbox", { name: "Tositteen nimi" })
    expect(box).toHaveAttribute("placeholder", "osto-k-rauta")
    expect(box).toHaveValue("")

    fireEvent.change(box, { target: { value: "Kuitti" } })
    expect(onRename).toHaveBeenCalledWith(0, "Kuitti")
  })

  it("offers no name box on a locked entry", () => {
    render(
      <LangProvider lang="fi">
        <AttachmentGrid
          attachments={[named]}
          description="Osto"
          readOnly
          onAdd={() => {}}
          onOpen={() => {}}
          onRemove={() => {}}
          onRename={() => {}}
        />
      </LangProvider>
    )
    expect(screen.queryByRole("textbox")).toBeNull()
  })
})
