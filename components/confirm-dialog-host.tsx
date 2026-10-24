"use client"

import * as React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { registerConfirmHandler, type ConfirmOptions } from "@/lib/ui/confirm"

interface Pending {
  options: ConfirmOptions
  resolve: (value: boolean) => void
}

/**
 * Backs `confirm()` with a shadcn AlertDialog. Mounted once per root layout —
 * including the landing one, since "Aloita uusi kirjanpito" and "Kokeile
 * esimerkillä" can both hit the unexported-changes confirm from there.
 */
export function ConfirmDialogHost() {
  const [pending, setPending] = React.useState<Pending | null>(null)
  const pendingRef = React.useRef<Pending | null>(null)

  // useLayoutEffect so the handler is registered before any child's effect
  // can call confirm().
  React.useLayoutEffect(() => {
    registerConfirmHandler((options) => {
      // Stacking AlertDialogs is a focus-trap hazard and there is no
      // legitimate case for one, so a second ask while one is open declines.
      if (pendingRef.current) return Promise.resolve(false)
      return new Promise<boolean>((resolve) => {
        const next = { options, resolve }
        pendingRef.current = next
        setPending(next)
      })
    })
    return () => registerConfirmHandler(null)
  }, [])

  const settle = React.useCallback((value: boolean) => {
    const current = pendingRef.current
    pendingRef.current = null
    setPending(null)
    current?.resolve(value)
  }, [])

  const options = pending?.options
  const destructive = options?.destructive ?? true

  return (
    <AlertDialog
      open={pending !== null}
      onOpenChange={(open) => {
        // Covers Escape and a backdrop click as well as the cancel button.
        if (!open) settle(false)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options?.title ?? ""}</AlertDialogTitle>
          {options?.message ? (
            <AlertDialogDescription>{options.message}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* §8.11: cancel is focused by default. */}
          <AlertDialogCancel autoFocus onClick={() => settle(false)}>
            {options?.cancelLabel ?? ""}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            onClick={() => settle(true)}
          >
            {options?.confirmLabel ?? ""}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
