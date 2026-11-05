"use client"

import { KeyRoundIcon } from "lucide-react"
import * as React from "react"

import { BusyButton } from "@/components/common/busy-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  registerPasswordHandler,
  type PasswordPromptOptions,
} from "@/lib/ui/password-prompt"

interface Pending {
  options: PasswordPromptOptions
  resolve: (value: string | null) => void
}

type Failure = { field: "password" | "repeat"; message: string } | null

/**
 * Backs `askPassword()` with a Dialog (§7.8). Mounted once per root layout,
 * like the confirmation host, since a file can be opened from the landing page.
 */
export function PasswordDialogHost() {
  const [pending, setPending] = React.useState<Pending | null>(null)
  const pendingRef = React.useRef<Pending | null>(null)
  const [password, setPassword] = React.useState("")
  const [repeat, setRepeat] = React.useState("")
  const [failure, setFailure] = React.useState<Failure>(null)
  const [checking, setChecking] = React.useState(false)

  React.useLayoutEffect(() => {
    registerPasswordHandler((options) => {
      // A second ask while one is open would stack focus traps.
      if (pendingRef.current) return Promise.resolve(null)
      return new Promise<string | null>((resolve) => {
        const next = { options, resolve }
        pendingRef.current = next
        setPassword("")
        setRepeat("")
        setFailure(null)
        setChecking(false)
        setPending(next)
      })
    })
    return () => registerPasswordHandler(null)
  }, [])

  const settle = React.useCallback((value: string | null) => {
    const current = pendingRef.current
    pendingRef.current = null
    setPending(null)
    setPassword("")
    setRepeat("")
    current?.resolve(value)
  }, [])

  const options = pending?.options

  const submit = async () => {
    if (!options || checking) return
    if (!password) return
    if (options.repeat && password !== repeat) {
      setFailure({ field: "repeat", message: options.repeat.mismatch })
      return
    }
    if (options.verify) {
      setChecking(true)
      const message = await options.verify(password)
      setChecking(false)
      if (message) {
        setFailure({ field: "password", message })
        return
      }
    }
    settle(password)
  }

  return (
    <Dialog
      open={pending !== null}
      onOpenChange={(open) => {
        // Covers Escape and the close button as well as the cancel button.
        if (!open && !checking) settle(null)
      }}
    >
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <DialogHeader>
            <DialogTitle>{options?.title ?? ""}</DialogTitle>
            {options?.message ? (
              <DialogDescription className="whitespace-pre-line">
                {options.message}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="book-password">
              {options?.fieldLabel}
            </FieldLabel>
            <Input
              id="book-password"
              type="password"
              autoComplete="off"
              autoFocus
              value={password}
              aria-invalid={failure?.field === "password" || undefined}
              onChange={(event) => {
                setPassword(event.target.value)
                setFailure(null)
              }}
            />
            {failure?.field === "password" ? (
              <FieldError>{failure.message}</FieldError>
            ) : null}
          </Field>
          {options?.repeat ? (
            <Field>
              <FieldLabel htmlFor="book-password-repeat">
                {options.repeat.label}
              </FieldLabel>
              <Input
                id="book-password-repeat"
                type="password"
                autoComplete="off"
                value={repeat}
                aria-invalid={failure?.field === "repeat" || undefined}
                onChange={(event) => {
                  setRepeat(event.target.value)
                  setFailure(null)
                }}
              />
              {failure?.field === "repeat" ? (
                <FieldError>{failure.message}</FieldError>
              ) : null}
            </Field>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={checking}
              onClick={() => settle(null)}
            >
              {options?.cancelLabel}
            </Button>
            <BusyButton
              type="submit"
              icon={KeyRoundIcon}
              busy={checking}
              disabled={!password}
            >
              {options?.confirmLabel}
            </BusyButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
