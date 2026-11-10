"use client"

import * as React from "react"
import { LandmarkIcon } from "lucide-react"

import { useFormatters } from "@/components/lang-provider"
import { toast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { decodeCsv } from "@/lib/domain/csv"
import { useBookStore } from "@/stores/book-store"

/** "Tuo tiliote": pick a bank CSV or camt.053 XML and open the review dialog (§8.16). */
export function BankImportButton() {
  const f = useFormatters()
  const openDialog = useBookStore((s) => s.openDialog)
  const input = React.useRef<HTMLInputElement>(null)

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    try {
      const text = decodeCsv(new Uint8Array(await file.arrayBuffer()))
      openDialog({ kind: "bank-import", text, fileName: file.name })
    } catch {
      toast.add({ title: f.t("bank.readError") })
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => input.current?.click()}>
        <LandmarkIcon data-icon="inline-start" />
        {f.t("bank.import")}
      </Button>
      <input
        ref={input}
        type="file"
        accept=".csv,.txt,.xml,text/csv,text/plain,application/xml,text/xml"
        className="hidden"
        onChange={(e) => void onPick(e)}
      />
    </>
  )
}
