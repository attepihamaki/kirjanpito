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
      {/* 15rem is --sidebar-width, so nothing shifts on rehydrate. */}
      <div className="hidden w-60 shrink-0 flex-col gap-4 border-r bg-sidebar p-2 min-[900px]:flex">
        <div className="flex items-center gap-2.5 p-2">
          <BrandMark />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex flex-col gap-1.5 px-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-2 px-4 lg:px-6">
          <Skeleton className="size-9" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="size-9" />
            <Skeleton className="size-9" />
          </div>
        </div>
        <div className="flex flex-col gap-4 px-4 py-5 lg:px-6 lg:py-6">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  )
}
