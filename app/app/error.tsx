"use client"

import { ErrorRecovery } from "@/components/app/error-recovery"

/**
 * A page of the app that failed to render (§8.1). The shell around it stays,
 * so the sidebar and the file menu still work.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorRecovery error={error} reset={reset} />
}
