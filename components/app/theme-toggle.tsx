"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { MoonIcon, SunIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useT } from "@/components/lang-provider"
import { cn } from "@/lib/utils"

/**
 * One ghost button that flips light ↔ dark (§8.2).
 *
 * "System" stays the default — next-themes is configured with
 * `defaultTheme="system"`, so an untouched browser follows the OS — it just
 * has no control of its own, which is how FormBox's header does it.
 *
 * Both icons are always in the markup and CSS picks one off the `.dark` class
 * that next-themes sets before first paint. That keeps the icon right in the
 * prerendered HTML, where `resolvedTheme` is still unknown.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useT()
  const { resolvedTheme, setTheme } = useTheme()

  /*
   * The label, unlike the icon, cannot come from CSS, and the server does not
   * know the theme. useSyncExternalStore is the idiomatic "am I on the client
   * yet" read; setting state in an effect would cascade a render.
   */
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const dark = resolvedTheme === "dark"
  const label = mounted
    ? t(dark ? "app.themeLight" : "app.themeDark")
    : t("app.theme")

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("relative", className)}
      aria-label={label}
      title={label}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      <SunIcon className="scale-100 dark:scale-0" />
      <MoonIcon className="absolute scale-0 dark:scale-100" />
    </Button>
  )
}
