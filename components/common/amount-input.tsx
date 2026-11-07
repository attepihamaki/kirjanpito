"use client"

import * as React from "react"

import { useFormatters } from "@/components/lang-provider"
import { Button } from "@/components/ui/button"
import { FieldDescription } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { evalAmount, isExpression } from "@/lib/domain/amount-expr"
import { ambiguousAmount, formatMoneyPlain } from "@/lib/domain/money"
import { cn } from "@/lib/utils"

type Props = Omit<React.ComponentProps<typeof Input>, "type"> & {
  /** Show a trailing euro sign inside the field. */
  euro?: boolean
}

/**
 * An amount field with a calculator (§8.4). A sum such as `12,50*3+4` shows
 * its result under the field and is replaced by it on blur or Enter. A pasted
 * `1,234` is ambiguous (1,23 € or 1 234 €), so the field offers both readings
 * and never picks one.
 *
 * It works controlled (`value`, `onChange`) and uncontrolled (`defaultValue`).
 * A replacement is written to the element and announced with a bubbling
 * `input` event, so the caller's `onChange` sees it like a keystroke. The text
 * stays a string; callers read it with `evalAmount`.
 */
export function AmountInput({
  euro,
  className,
  onChange,
  onBlur,
  onKeyDown,
  ref,
  ...props
}: Props) {
  const f = useFormatters()
  const inner = React.useRef<HTMLInputElement | null>(null)
  const [typed, setTyped] = React.useState(
    String(props.value ?? props.defaultValue ?? "")
  )
  const text = props.value !== undefined ? String(props.value) : typed
  const sum = isExpression(text)
  const result = sum ? evalAmount(text) : null
  const ambiguous = ambiguousAmount(text)

  const write = (value: string) => {
    const el = inner.current
    if (!el) return
    const set = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set
    set?.call(el, value)
    el.dispatchEvent(new Event("input", { bubbles: true }))
  }

  const commit = () => {
    if (sum && result != null) write(formatMoneyPlain(result))
  }

  const input = (
    <Input
      inputMode="decimal"
      autoComplete="off"
      {...props}
      ref={(el) => {
        inner.current = el
        if (typeof ref === "function") ref(el)
        else if (ref) ref.current = el
      }}
      className={cn("tabular text-right", euro && "pr-8", className)}
      onChange={(e) => {
        setTyped(e.target.value)
        onChange?.(e)
      }}
      onBlur={(e) => {
        commit()
        onBlur?.(e)
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (
          e.key === "Enter" &&
          !e.defaultPrevented &&
          !e.ctrlKey &&
          !e.metaKey &&
          sum &&
          result != null
        ) {
          e.preventDefault()
          commit()
        }
      }}
    />
  )

  return (
    <>
      {euro ? (
        <div className="relative">
          {input}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
          >
            €
          </span>
        </div>
      ) : (
        input
      )}
      {sum && result != null ? (
        <FieldDescription className="tabular text-right">
          = {f.money(result)}
        </FieldDescription>
      ) : null}
      {ambiguous ? (
        <FieldDescription className="flex flex-wrap items-center justify-end gap-1">
          {f.t("common.amountAmbiguous")}
          {[ambiguous.decimal, ambiguous.thousands].map((cents) => (
            <Button
              key={cents}
              type="button"
              variant="outline"
              size="xs"
              className="tabular"
              onClick={() => write(formatMoneyPlain(cents))}
            >
              {f.money(cents)}
            </Button>
          ))}
        </FieldDescription>
      ) : null}
    </>
  )
}
