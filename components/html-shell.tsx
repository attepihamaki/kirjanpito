import { Geist } from "next/font/google"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toast"
import { ConfirmDialogHost } from "@/components/confirm-dialog-host"
import { cn } from "@/lib/utils"

/* Geist is the app's only face (§11), so only `--font-sans` is defined. */
const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

/**
 * The `<html>` and `<body>` shell.
 *
 * `lang` is baked as Finnish: only Finnish is indexed, and it is the store's
 * default, so the prerendered HTML and the first client render match byte for
 * byte. For a visitor whose stored preference is English, `LangHtmlAttr`
 * updates the attribute imperatively after rehydration — exactly how
 * next-themes manages `class` on the same element.
 */
export function HtmlShell({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fi"
      suppressHydrationWarning
      className={cn("antialiased", geist.variable)}
    >
      <body className="font-sans">
        <ThemeProvider>
          {/* Toaster is a provider: it must wrap the tree, not sit beside it. */}
          <Toaster>
            {children}
            <ConfirmDialogHost />
          </Toaster>
        </ThemeProvider>
      </body>
    </html>
  )
}
