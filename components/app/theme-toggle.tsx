"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useT } from "@/components/lang-provider"

const ORDER = ["system", "light", "dark"] as const
type ThemeName = (typeof ORDER)[number]

const ICONS = {
  system: MonitorIcon,
  light: SunIcon,
  dark: MoonIcon,
} as const

/** Cycles system → light → dark (§8.2). */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useT()
  const { theme, setTheme } = useTheme()
  // next-themes only knows the resolved theme on the client, so the icon
  // cannot be rendered until after hydration. useSyncExternalStore is the
  // idiomatic "am I on the client yet" read; setting state in an effect
  // would cause a cascading render.
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const current: ThemeName =
    mounted && ORDER.includes(theme as ThemeName)
      ? (theme as ThemeName)
      : "system"
  const Icon = ICONS[current]

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={`${t("theme")}: ${t(`th_${current}`)}`}
      title={t(`th_${current}`)}
      onClick={() =>
        setTheme(ORDER[(ORDER.indexOf(current) + 1) % ORDER.length])
      }
    >
      <Icon />
    </Button>
  )
}
