"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useT } from "@/components/lang-provider"
import { cn } from "@/lib/utils"

const THEMES = [
  { value: "system", icon: MonitorIcon, key: "th_system" },
  { value: "light", icon: SunIcon, key: "th_light" },
  { value: "dark", icon: MoonIcon, key: "th_dark" },
] as const

type ThemeName = (typeof THEMES)[number]["value"]

/**
 * System / light / dark as three icon buttons (§8.2), matching the
 * prototype. A single cycling button hides which mode is active.
 */
export function ThemeToggle({
  className,
  compact,
}: {
  className?: string
  /** One cycling button instead of three, for the mobile top bar (§8.2). */
  compact?: boolean
}) {
  const t = useT()
  const { theme, setTheme } = useTheme()

  // next-themes only knows the resolved theme on the client, so nothing may
  // be marked active until after hydration. useSyncExternalStore is the
  // idiomatic "am I on the client yet" read; setting state in an effect
  // would cause a cascading render.
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const current: ThemeName =
    mounted && THEMES.some((x) => x.value === theme)
      ? (theme as ThemeName)
      : "system"

  if (compact) {
    const index = THEMES.findIndex((x) => x.value === current)
    const next = THEMES[(index + 1) % THEMES.length]
    const Icon = THEMES[index].icon
    return (
      <Button
        variant="ghost"
        size="icon"
        className={className}
        aria-label={`${t("theme")}: ${t(THEMES[index].key)}`}
        title={t(THEMES[index].key)}
        onClick={() => setTheme(next.value)}
      >
        <Icon />
      </Button>
    )
  }

  return (
    <div
      role="group"
      aria-label={t("theme")}
      className={cn(
        "flex items-center gap-0.5 rounded-full border p-0.5",
        className
      )}
    >
      {THEMES.map(({ value, icon: Icon, key }) => {
        const active = mounted && current === value
        return (
          <Button
            key={value}
            variant="ghost"
            size="icon-xs"
            aria-pressed={active}
            aria-label={t(key)}
            title={t(key)}
            onClick={() => setTheme(value)}
            className={cn(
              "rounded-full",
              active && "bg-accent text-accent-foreground"
            )}
          >
            <Icon />
          </Button>
        )
      })}
    </div>
  )
}
