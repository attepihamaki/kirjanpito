"use client"

import * as React from "react"

import { todayIso } from "@/lib/domain/dates"

/**
 * Today's ISO date. It changes by itself at local midnight, so a tab left open
 * overnight moves its due-date countdowns on without a reload.
 */
export function useToday(): string {
  const [today, setToday] = React.useState(() => todayIso())

  React.useEffect(() => {
    const now = new Date()
    const midnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    )
    const timer = setTimeout(
      () => setToday(todayIso()),
      midnight.getTime() - now.getTime() + 1000
    )
    return () => clearTimeout(timer)
  }, [today])

  return today
}
