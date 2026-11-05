"use client"

import { PlusIcon } from "lucide-react"
import { usePathname } from "next/navigation"

import { PageHeader } from "@/components/common/page-header"
import { SubPageTabs } from "@/components/common/sub-page-tabs"
import { useT } from "@/components/lang-provider"
import { GeneralActions } from "@/components/settings/general-actions"
import { Button } from "@/components/ui/button"
import { SETTINGS_ROUTES } from "@/lib/site"
import { useBookStore } from "@/stores/book-store"

/** "Lisää luokka", the categories page's counterpart of "Uusi tosite" (§8.10). */
function NewCategoryButton() {
  const t = useT()
  const openDialog = useBookStore((s) => s.openDialog)

  return (
    <Button onClick={() => openDialog({ kind: "category-add" })}>
      <PlusIcon data-icon="inline-start" />
      {t("settings.newCategory")}
    </Button>
  )
}

/**
 * The title and sub-page tabs shared by every settings page (§8.10). It is
 * the settings layout, so switching tabs keeps the header in place and only
 * the panels below it change.
 */
export function SettingsShell({ children }: { children: React.ReactNode }) {
  const t = useT()
  const trim = (path: string) => path.replace(/\/$/, "")
  const path = trim(usePathname())
  const general = path === trim(SETTINGS_ROUTES.general)
  const categories = path === trim(SETTINGS_ROUTES.categories)

  return (
    <>
      <PageHeader
        title={t("nav.settings")}
        subtitle={t("settings.subtitle")}
        actions={
          general ? (
            <GeneralActions />
          ) : categories ? (
            <NewCategoryButton />
          ) : undefined
        }
      />
      <SubPageTabs
        label={t("settings.sections")}
        tabs={[
          { href: SETTINGS_ROUTES.general, label: t("settings.general") },
          { href: SETTINGS_ROUTES.categories, label: t("settings.categories") },
          { href: SETTINGS_ROUTES.recurring, label: t("recurring.tab") },
        ]}
      />
      {children}
    </>
  )
}
