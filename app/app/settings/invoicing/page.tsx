import { InvoiceLookForm } from "@/components/invoices/invoice-look"
import { InvoiceSettingsForm } from "@/components/invoices/invoice-settings"

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <InvoiceSettingsForm />
      <InvoiceLookForm />
    </div>
  )
}
