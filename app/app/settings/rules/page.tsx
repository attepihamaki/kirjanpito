import { BankLayoutSettings } from "@/components/settings/bank-layout-settings"
import { RuleSettings } from "@/components/settings/rule-settings"

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <RuleSettings />
      <BankLayoutSettings />
    </div>
  )
}
