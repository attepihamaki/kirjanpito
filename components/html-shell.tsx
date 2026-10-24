import { Geist, Geist_Mono } from "next/font/google"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toast"
import { ConfirmDialogHost } from "@/components/confirm-dialog-host"
import { cn } from "@/lib/utils"
import type { Lang } from "@/lib/domain/types"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

/**
 * The `<html>` and `<body>` shell, shared by both root layouts.
 *
 * `lang` is fixed per root layout and baked at build time: it is a property of
 * the URL, not of the visitor. Inside the app the language is a stored
 * preference, and `LangHtmlAttr` updates the attribute imperatively — exactly
 * how next-themes manages `class` on the same element.
 */
export function HtmlShell({
  lang,
  children,
}: {
  lang: Lang
  children: React.ReactNode
}) {
  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={cn("antialiased", geist.variable, geistMono.variable)}
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
