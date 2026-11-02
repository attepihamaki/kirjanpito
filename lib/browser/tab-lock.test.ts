import { afterEach, describe, expect, it, vi } from "vitest"

import { claimTab, heldByAnotherTab } from "@/lib/browser/tab-lock"

/*
 * A Web Locks stand-in shared by two "tabs": one exclusive lock, granted in
 * request order, released when the callback's promise settles.
 */
function fakeLocks() {
  let holder: symbol | null = null
  const queue: (() => void)[] = []
  return {
    request: vi.fn(
      (
        _name: string,
        options: { signal?: AbortSignal },
        callback: () => Promise<void>
      ) =>
        new Promise<void>((resolve, reject) => {
          const grant = () => {
            const me = Symbol()
            holder = me
            void callback().then(() => {
              holder = null
              queue.shift()?.()
              resolve()
            })
          }
          if (!holder) grant()
          else {
            queue.push(grant)
            options.signal?.addEventListener("abort", () => {
              queue.splice(queue.indexOf(grant), 1)
              reject(new DOMException("aborted", "AbortError"))
            })
          }
        })
    ),
    query: vi.fn(async () => ({
      held: holder ? [{ name: "bookkeeping-app" }] : [],
    })),
  }
}

describe("one tab at a time (§12)", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("claims at once where there are no Web Locks", () => {
    vi.stubGlobal("navigator", {})
    const claimed = vi.fn()
    claimTab(claimed)
    expect(claimed).toHaveBeenCalledOnce()
  })

  it("makes a second claim wait until the first is given up", async () => {
    vi.stubGlobal("navigator", { locks: fakeLocks() })
    const first = vi.fn()
    const second = vi.fn()

    const releaseFirst = claimTab(first)
    const releaseSecond = claimTab(second)
    await Promise.resolve()
    expect(first).toHaveBeenCalledOnce()
    expect(second).not.toHaveBeenCalled()

    releaseFirst()
    await vi.waitFor(() => expect(second).toHaveBeenCalledOnce())
    releaseSecond()
  })

  it("tells a tab without the lock that another tab has it", async () => {
    const locks = fakeLocks()
    vi.stubGlobal("navigator", { locks })
    // Another tab: a request this module did not make.
    void locks.request("bookkeeping-app", {}, () => new Promise(() => {}))

    expect(await heldByAnotherTab()).toBe(true)
  })

  it("does not count its own lock as another tab's", async () => {
    vi.stubGlobal("navigator", { locks: fakeLocks() })
    const release = claimTab(() => {})
    await Promise.resolve()

    expect(await heldByAnotherTab()).toBe(false)
    release()
  })
})
