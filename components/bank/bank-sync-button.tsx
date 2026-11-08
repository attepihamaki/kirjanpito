"use client"

import * as React from "react"
import { RefreshCwIcon } from "lucide-react"

import { useFormatters } from "@/components/lang-provider"
import { toast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  BANK_PROXY_URL,
  fetchStatement,
  finishLink,
  listBanks,
  loadLink,
  saveLink,
  startLink,
  type BankLink,
} from "@/lib/browser/bank-sync"
import { addDays, todayIso } from "@/lib/domain/dates"
import { useBookStore } from "@/stores/book-store"

/**
 * "Hae pankista": fetch recent transactions from the linked account feed and
 * open them in the statement review (§8.16). Renders nothing unless the build
 * names a proxy.
 */
export function BankSyncButton() {
  if (!BANK_PROXY_URL) return null
  return <SyncButton />
}

function SyncButton() {
  const f = useFormatters()
  const openDialog = useBookStore((s) => s.openDialog)
  const [open, setOpen] = React.useState(false)
  const [link, setLink] = React.useState<BankLink>(loadLink)
  const [banks, setBanks] = React.useState<string[]>([])
  const [bank, setBank] = React.useState("")
  const [personal, setPersonal] = React.useState(false)
  const [from, setFrom] = React.useState(() => addDays(todayIso(), -90))
  const [busy, setBusy] = React.useState(false)

  const fail = (e: unknown) =>
    toast.add({
      title: f.t("bank.syncError", { msg: String((e as Error).message) }),
    })

  // The bank returns the browser here with ?code&state.
  React.useEffect(() => {
    const saved = loadLink()
    if (!saved.token || !location.search.includes("code=")) return
    void finishLink(saved.token)
      .then((done) => {
        if (!done) return
        saveLink(done)
        setLink(done)
        setOpen(true)
      })
      .catch(fail)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const linked = link.accounts.length > 0

  const connect = async () => {
    setBusy(true)
    try {
      saveLink({ ...link, accounts: [] })
      await startLink(link.token, bank, personal)
    } catch (e) {
      fail(e)
      setBusy(false)
    }
  }

  const loadBanks = async () => {
    setBusy(true)
    try {
      saveLink(link)
      const list = await listBanks(link.token)
      setBanks(list)
      setBank((b) => b || list[0] || "")
    } catch (e) {
      fail(e)
    }
    setBusy(false)
  }

  const fetchNow = async () => {
    setBusy(true)
    try {
      const { text, count } = await fetchStatement(
        link.token,
        link.accounts[0].uid,
        from
      )
      setOpen(false)
      openDialog({
        kind: "bank-import",
        text,
        fileName: f.t("bank.syncFileName", { n: count }),
      })
    } catch (e) {
      fail(e)
    }
    setBusy(false)
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <RefreshCwIcon data-icon="inline-start" />
        {f.t("bank.syncButton")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{f.t("bank.syncButton")}</DialogTitle>
            <DialogDescription>
              {linked
                ? link.accounts.map((a) => a.iban || a.name).join(", ")
                : f.t("bank.syncHint")}
            </DialogDescription>
          </DialogHeader>

          {linked ? (
            <label className="grid gap-1 text-sm">
              {f.t("bank.syncFrom")}
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
          ) : (
            <div className="grid gap-3 text-sm">
              <label className="grid gap-1">
                {f.t("bank.syncToken")}
                <Input
                  type="password"
                  value={link.token}
                  onChange={(e) => setLink({ ...link, token: e.target.value })}
                />
              </label>
              {banks.length > 0 && (
                <>
                  <select
                    className="h-9 rounded-md border bg-transparent px-2"
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                  >
                    {banks.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={personal}
                      onChange={(e) => setPersonal(e.target.checked)}
                    />
                    {f.t("bank.syncPersonal")}
                  </label>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            {linked ? (
              <Button disabled={busy} onClick={() => void fetchNow()}>
                {f.t("bank.syncFetch")}
              </Button>
            ) : banks.length === 0 ? (
              <Button
                disabled={busy || !link.token}
                onClick={() => void loadBanks()}
              >
                {f.t("bank.syncNext")}
              </Button>
            ) : (
              <Button disabled={busy || !bank} onClick={() => void connect()}>
                {f.t("bank.syncConnect")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
