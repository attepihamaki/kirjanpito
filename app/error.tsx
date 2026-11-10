"use client"

import { ErrorRecovery } from "@/components/app/error-recovery"
import { LangRoot } from "@/components/lang-provider"

/**
 * A document that failed to render below the root layout (§8.1): the landing
 * page, or the app shell itself.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <LangRoot>
      <ErrorRecovery error={error} reset={reset} />
    </LangRoot>
  )
}
