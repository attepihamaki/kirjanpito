/**
 * The one confirmation primitive (CLAUDE.md §8.11). No `window.confirm`
 * anywhere in this app.
 *
 * A module-level handler rather than React context, so commands and store
 * orchestration can `await confirm(...)` without being components. Strings
 * arrive already translated, which keeps this file free of the dictionary.
 */

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel: string
  cancelLabel: string
  /** Renders the confirm button as destructive. Defaults to true. */
  destructive?: boolean
}

type Handler = (options: ConfirmOptions) => Promise<boolean>

let handler: Handler | null = null

export function registerConfirmHandler(next: Handler | null): void {
  handler = next
}

/**
 * Ask the user to confirm. Resolves false when no host is mounted — failing
 * closed means a destructive path can never fire silently during prerender,
 * in a test, or after the host unmounts.
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  if (!handler) return Promise.resolve(false)
  return handler(options)
}
