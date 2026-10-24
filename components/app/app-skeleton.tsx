import { BrandMark } from "@/components/common/brand-mark"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * What the app renders until the store has rehydrated.
 *
 * Deliberately contains no `t()` call, no data and no dates: the server HTML
 * and the first client render have to be byte-identical, and anything
 * language- or state-dependent would break that. This is the single
 * mechanism that makes both the i18n and the hydration story work.
 */
export function AppSkeleton() {
  return (
    <div className="flex min-h-svh">
      <div className="hidden w-72 shrink-0 flex-col gap-6 border-r p-4 min-[900px]:flex">
        <div className="flex items-center gap-2">
          <BrandMark />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-8 w-full" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-2">
          <Skeleton className="h-24 w-full" />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center gap-2 min-[900px]:hidden">
          <BrandMark />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}
