"use client"

import "@/app/globals.css"
import { downloadStoredBook } from "@/lib/browser/stored-book"

/**
 * The last resort, when the root layout itself fails (§8.1). It replaces the
 * whole document, so it reads no state and needs no provider, and says
 * everything in both languages side by side. The browser's data is still
 * there, and can be downloaded as it is stored.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="fi">
      <body className="font-sans">
        <main
          role="alert"
          className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-10"
        >
          <h1 className="text-2xl font-semibold">
            Jokin meni vikaan · Something went wrong
          </h1>
          <p>
            Kirjanpitosi on tallessa selaimessa. Lataa sivu uudelleen tai lataa
            selaimen tallentama data talteen.
          </p>
          <p lang="en">
            Your bookkeeping is safe in the browser. Reload the page, or
            download the data the browser has stored.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
              onClick={reset}
            >
              Yritä uudelleen · Try again
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm"
              onClick={() => window.location.reload()}
            >
              Lataa sivu uudelleen · Reload
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm"
              onClick={() => downloadStoredBook()}
            >
              Lataa data (JSON) · Download data (JSON)
            </button>
          </div>
          <pre className="overflow-x-auto text-xs whitespace-pre-wrap">
            {error.message}
            {error.digest ? `\n${error.digest}` : ""}
          </pre>
        </main>
      </body>
    </html>
  )
}
