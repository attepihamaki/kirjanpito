"use client"

import { PageHeader } from "@/components/common/page-header"
import { SubPageTabs } from "@/components/common/sub-page-tabs"
import { useT } from "@/components/lang-provider"
import { SETTINGS_ROUTES } from "@/lib/site"

/**
 * The title and sub-page tabs shared by every settings page (§8.10). It is
 * the settings layout, so switching tabs keeps the header in place and only
 * the panels below it change.
 */
export function SettingsShell({ children }: { children: React.ReactNode }) {
  const t = useT()

  return (
    <>
      <PageHeader title={t("nav.settings")} subtitle={t("settings.subtitle")} />
      <SubPageTabs
        label={t("settings.sections")}
        tabs={[
          { href: SETTINGS_ROUTES.general, label: t("settings.general") },
          { href: SETTINGS_ROUTES.categories, label: t("settings.categories") },
        ]}
      />
      {children}
    </>
  )
}
