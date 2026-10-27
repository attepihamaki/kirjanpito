"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"

import { useT } from "@/components/lang-provider"
import type { Ctx } from "@/lib/commands/ctx"

/**
 * The command context, bound to the current language and router.
 *
 * Commands own the confirm -> mutate -> GC -> toast -> navigate sequence so
 * the store stays a set of pure transitions and remains testable without
 * stubbing dialogs.
 */
export function useCommandCtx(): Ctx {
  const t = useT()
  const router = useRouter()
  const { setTheme } = useTheme()

  return React.useMemo(
    () => ({
      t,
      navigate: (href: string) => router.push(href),
      setTheme,
    }),
    [t, router, setTheme]
  )
}
