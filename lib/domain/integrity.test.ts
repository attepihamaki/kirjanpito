import { describe, expect, it } from "vitest"

import { checkIntegrity, sealSettings } from "@/lib/domain/integrity"

const CSV = "﻿voucher;date\r\n1;2026-01-08\r\n"
const SETTINGS = `${JSON.stringify({ version: 1, vatPeriod: "month" }, null, 2)}\n`

describe("integrity seal", () => {
  it("passes a file it has just sealed", async () => {
    const sealed = await sealSettings(SETTINGS, CSV)
    expect(await checkIntegrity(CSV, sealed)).toEqual({ status: "ok" })
  })

  it("seals a file again without nesting the old seal", async () => {
    const once = await sealSettings(SETTINGS, CSV)
    const twice = await sealSettings(once, CSV)
    expect(twice).toBe(once)
  })

  it("reports an edited CSV", async () => {
    const sealed = await sealSettings(SETTINGS, CSV)
    expect(await checkIntegrity(CSV.replace("1;", "2;"), sealed)).toEqual({
      status: "edited",
      csv: true,
      settings: false,
    })
  })

  it("reports edited settings", async () => {
    const sealed = await sealSettings(SETTINGS, CSV)
    const edited = sealed.replace('"month"', '"year"')
    expect(await checkIntegrity(CSV, edited)).toEqual({
      status: "edited",
      csv: false,
      settings: true,
    })
  })

  it("ignores white space in settings.json", async () => {
    const sealed = await sealSettings(SETTINGS, CSV)
    const compact = JSON.stringify(JSON.parse(sealed))
    expect(await checkIntegrity(CSV, compact)).toEqual({ status: "ok" })
  })

  it("reports both parts when both changed", async () => {
    const sealed = await sealSettings(SETTINGS, CSV)
    const result = await checkIntegrity(
      "x",
      sealed.replace('"month"', '"year"')
    )
    expect(result).toEqual({ status: "edited", csv: true, settings: true })
  })

  it("has nothing to compare without a readable seal", async () => {
    const none = { status: "none" }
    expect(await checkIntegrity(CSV, null)).toEqual(none)
    expect(await checkIntegrity(CSV, "not json")).toEqual(none)
    expect(await checkIntegrity(CSV, SETTINGS)).toEqual(none)
    expect(
      await checkIntegrity(CSV, JSON.stringify({ integrity: { csv: 1 } }))
    ).toEqual(none)
  })
})

describe("the invoice files", () => {
  const INVOICES = '{"invoices":[]}\n'
  const CUSTOMERS = '{"customers":[]}\n'

  it("seals them and finds them unchanged", async () => {
    const sealed = await sealSettings(SETTINGS, CSV, {
      invoices: INVOICES,
      customers: CUSTOMERS,
    })
    expect(
      await checkIntegrity(CSV, sealed, {
        invoices: INVOICES,
        customers: CUSTOMERS,
      })
    ).toEqual({ status: "ok" })
  })

  it("names the file that was edited", async () => {
    const sealed = await sealSettings(SETTINGS, CSV, {
      invoices: INVOICES,
      customers: CUSTOMERS,
    })
    expect(
      await checkIntegrity(CSV, sealed, {
        invoices: '{"invoices":[1]}',
        customers: CUSTOMERS,
      })
    ).toEqual({ status: "edited", csv: false, settings: false, invoices: true })
  })

  it("reports a sealed file that has gone missing", async () => {
    const sealed = await sealSettings(SETTINGS, CSV, { customers: CUSTOMERS })
    expect(await checkIntegrity(CSV, sealed, {})).toEqual({
      status: "edited",
      csv: false,
      settings: false,
      customers: true,
    })
  })

  it("does not check a file the seal never covered", async () => {
    const sealed = await sealSettings(SETTINGS, CSV)
    expect(await checkIntegrity(CSV, sealed, { invoices: INVOICES })).toEqual({
      status: "ok",
    })
  })
})
