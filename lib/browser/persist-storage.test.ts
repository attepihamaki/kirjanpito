// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  requestPersistentStorage,
  resetPersistRequest,
} from "@/lib/browser/persist-storage"

function stubStorage(storage: unknown) {
  Object.defineProperty(navigator, "storage", {
    value: storage,
    configurable: true,
  })
}

describe("requestPersistentStorage", () => {
  beforeEach(() => resetPersistRequest())

  it("asks once per page load", async () => {
    const persist = vi.fn().mockResolvedValue(true)
    stubStorage({ persist, persisted: vi.fn().mockResolvedValue(false) })
    await requestPersistentStorage()
    await requestPersistentStorage()
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it("does not ask when storage is already persistent", async () => {
    const persist = vi.fn()
    stubStorage({ persist, persisted: vi.fn().mockResolvedValue(true) })
    await requestPersistentStorage()
    expect(persist).not.toHaveBeenCalled()
  })

  it("survives a browser without the API and a refusal", async () => {
    stubStorage(undefined)
    await expect(requestPersistentStorage()).resolves.toBeUndefined()
    resetPersistRequest()
    stubStorage({ persist: vi.fn().mockRejectedValue(new Error("no")) })
    await expect(requestPersistentStorage()).resolves.toBeUndefined()
  })
})
