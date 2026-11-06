import { toast } from "@/components/ui/toast"

import { holdPassword } from "@/lib/commands/book-password"
import type { Ctx } from "@/lib/commands/ctx"
import { confirm } from "@/lib/ui/confirm"
import { askPassword } from "@/lib/ui/password-prompt"
import { useBookStore } from "@/stores/book-store"

/**
 * Turning encryption on and off (§7.8). The password is asked here and held in
 * memory by `book-password.ts`; the file itself changes at the next save.
 */

/**
 * A password shorter than this is refused. It is a floor, not a policy: the
 * archive's key derivation is PBKDF2 with a fixed 1 000 rounds, so a short
 * password is the weak point of the file.
 */
const MIN_PASSWORD_LENGTH = 10

/**
 * Ask for a new password, twice. Resolves null when the user cancels. Used when
 * encryption is switched on and when a book with no file to check against has
 * to be saved.
 */
export function askNewPassword(ctx: Ctx): Promise<string | null> {
  return askPassword({
    title: ctx.t("settings.encryptSetTitle"),
    message: ctx.t("settings.encryptSetMessage"),
    fieldLabel: ctx.t("io.passwordLabel"),
    confirmLabel: ctx.t("settings.encryptSetConfirm"),
    cancelLabel: ctx.t("common.cancel"),
    repeat: {
      label: ctx.t("settings.encryptRepeatLabel"),
      mismatch: ctx.t("settings.encryptMismatch"),
    },
    verify: async (candidate) =>
      candidate.length < MIN_PASSWORD_LENGTH
        ? ctx.t("settings.encryptTooShort", { n: MIN_PASSWORD_LENGTH })
        : null,
  })
}

/** Switch encryption on, or change the password of an encrypted book. */
export async function setBookPassword(ctx: Ctx): Promise<void> {
  const password = await askNewPassword(ctx)
  if (!password) return
  holdPassword(password)
  // The file no longer matches either way, so this marks the book dirty.
  useBookStore.getState().setEncrypted(true)
  toast.add({ title: ctx.t("settings.encryptEnabled") })
}

/**
 * Switch encryption off. The password stays in memory until the book is
 * replaced, because the file on disk is still encrypted until the next save
 * and its receipts have to be read from it.
 */
export async function removeBookEncryption(ctx: Ctx): Promise<void> {
  const goAhead = await confirm({
    title: ctx.t("settings.encryptOffTitle"),
    message: ctx.t("settings.encryptOffMessage"),
    confirmLabel: ctx.t("settings.encryptOffConfirm"),
    cancelLabel: ctx.t("common.cancel"),
  })
  if (!goAhead) return
  useBookStore.getState().setEncrypted(false)
  toast.add({ title: ctx.t("settings.encryptDisabled") })
}
