// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Money } from "@/components/common/money"
import { LangProvider } from "@/components/lang-provider"

const shown = (cents: number, signed?: boolean) =>
  render(
    <LangProvider lang="fi">
      <Money cents={cents} signed={signed} />
    </LangProvider>
  ).container.textContent?.replace(/\s/g, " ")

describe("Money", () => {
  it("shows an expense as negative", () => {
    expect(shown(12_400, true)).toBe("−124,00 €")
  })

  it("shows a refund on the expense side as positive", () => {
    expect(shown(-12_400, true)).toBe("124,00 €")
  })

  it("shows a negative amount as negative", () => {
    expect(shown(-12_400)).toBe("−124,00 €")
  })

  it("puts no sign on zero", () => {
    expect(shown(0, true)).toBe("0,00 €")
  })
})
