/**
 * Asks for a password (§7.8). Like `confirm`, a module-level handler rather
 * than React context, so a command can `await askPassword(...)` without being
 * a component. Strings arrive already translated.
 */

export interface PasswordPromptOptions {
  title: string
  message?: string
  fieldLabel: string
  confirmLabel: string
  cancelLabel: string
  /** Asks twice, for choosing a new password rather than entering one. */
  repeat?: {
    label: string
    /** Shown when the two entries differ. */
    mismatch: string
  }
  /**
   * Checks the password before the dialog closes. Returns the message to show
   * and keep the dialog open, or null to accept it. This is how a wrong
   * password is reported without losing the dialog.
   */
  verify?: (password: string) => Promise<string | null>
}

type Handler = (options: PasswordPromptOptions) => Promise<string | null>

let handler: Handler | null = null

export function registerPasswordHandler(next: Handler | null): void {
  handler = next
}

/**
 * The password the user typed, or null when they cancelled. Resolves null when
 * no host is mounted, so an encrypted file never opens by accident.
 */
export function askPassword(
  options: PasswordPromptOptions
): Promise<string | null> {
  return handler ? handler(options) : Promise.resolve(null)
}
