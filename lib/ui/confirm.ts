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
  /** Omitted for a dialog that only tells the user something (`alert`). */
  cancelLabel?: string
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

/**
 * Tell the user something they have to read, with one button to close it.
 *
 * A toast is easy to miss and carries two sentences badly, so this is for the
 * cases where nothing happened and the reason is the whole message — a file
 * the app could not open (§8). Never `window.alert` (§2).
 */
export function alertDialog(options: {
  title: string
  message?: string
  closeLabel: string
}): Promise<void> {
  if (!handler) return Promise.resolve()
  return handler({
    title: options.title,
    message: options.message,
    confirmLabel: options.closeLabel,
    destructive: false,
  }).then(() => undefined)
}
