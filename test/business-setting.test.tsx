// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { LangProvider } from "@/components/lang-provider"
import { BusinessSetting } from "@/components/settings/business-setting"
import { useBookStore } from "@/stores/book-store"

function renderSetting() {
  const view = render(
    <LangProvider lang="fi">
      <BusinessSetting />
    </LangProvider>
  )
  fireEvent.click(screen.getByRole("button", { name: /^Muuta/ }))
  return view
}

const idField = () => screen.getByRole("textbox", { name: "Y-tunnus" })
const nameField = () => screen.getByRole("textbox", { name: "Yrityksen nimi" })

function enter(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}

describe("the business setting", () => {
  beforeEach(() => {
    useBookStore.setState({
      businessId: null,
      businessName: null,
      dirty: false,
    })
  })

  it("stores a valid ID in its written form and marks the book dirty", () => {
    renderSetting()
    enter(idField(), "FI01120389")
    expect(useBookStore.getState().businessId).toBe("0112038-9")
    expect(useBookStore.getState().dirty).toBe(true)
    expect(idField()).toHaveProperty("value", "0112038-9")
  })

  it("keeps an invalid ID out of the store and says so until it is edited", () => {
    renderSetting()
    enter(idField(), "0112038-8")
    expect(useBookStore.getState().businessId).toBeNull()
    expect(useBookStore.getState().dirty).toBe(false)
    expect(idField().getAttribute("aria-invalid")).toBe("true")
    expect(screen.getByText(/Tarkista Y-tunnus/)).toBeTruthy()

    fireEvent.change(idField(), { target: { value: "0112038-" } })
    expect(idField().getAttribute("aria-invalid")).toBeNull()
    expect(screen.queryByText(/Tarkista Y-tunnus/)).toBeNull()
  })

  it("removes the values when the fields are emptied", () => {
    useBookStore.setState({ businessId: "0112038-9", businessName: "Oma Oy" })
    renderSetting()
    enter(idField(), "")
    enter(nameField(), "  ")
    expect(useBookStore.getState().businessId).toBeNull()
    expect(useBookStore.getState().businessName).toBeNull()
  })

  it("does not mark the book dirty when nothing changed", () => {
    useBookStore.setState({ businessId: "0112038-9", businessName: "Oma Oy" })
    renderSetting()
    fireEvent.blur(idField())
    fireEvent.blur(nameField())
    expect(useBookStore.getState().dirty).toBe(false)
  })

  it("stores a typed name without the spaces around it", () => {
    renderSetting()
    enter(nameField(), "  Oma Tmi ")
    expect(useBookStore.getState().businessName).toBe("Oma Tmi")
    expect(nameField()).toHaveProperty("value", "Oma Tmi")
  })
})
