"use client"

import * as React from "react"
import { XIcon } from "lucide-react"

import { Pill } from "@/components/common/pill"
import { Input } from "@/components/ui/input"
import { hasTag, normalizeTags, TAGS_MAX } from "@/lib/domain/tags"

/**
 * The tags of a voucher or an invoice (§8.37): each tag a pill with a remove
 * button, and a field that adds one on `Enter`, a comma or leaving it. The
 * book's own tags are offered through a `datalist`, so the browser filters
 * them as the user types. `Backspace` in an empty field takes the last tag.
 */
export function TagsInput({
  id,
  value,
  suggestions,
  placeholder,
  removeLabel,
  disabled = false,
  onChange,
}: {
  id: string
  value: readonly string[]
  /** Tags in use elsewhere in the book, most used first. */
  suggestions: readonly string[]
  placeholder: string
  /** The remove button's accessible name for a tag. */
  removeLabel: (tag: string) => string
  /** Shows the tags only, with nothing to add or remove. */
  disabled?: boolean
  onChange: (tags: string[]) => void
}) {
  const listId = React.useId()
  const [text, setText] = React.useState("")
  const full = value.length >= TAGS_MAX

  const commit = (raw: string) => {
    const next = normalizeTags([...value, ...raw.split(",")])
    setText("")
    if (next.length !== value.length) onChange(next)
  }

  const offered = suggestions.filter((t) => !hasTag({ tags: [...value] }, t))

  return (
    <div className="flex flex-col gap-2">
      {value.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <li key={tag}>
              <Pill className={disabled ? undefined : "gap-1 pr-1"}>
                {tag}
                {disabled ? null : (
                  <button
                    type="button"
                    className="rounded-full p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={removeLabel(tag)}
                    onClick={() => onChange(value.filter((t) => t !== tag))}
                  >
                    <XIcon className="size-3" aria-hidden />
                  </button>
                )}
              </Pill>
            </li>
          ))}
        </ul>
      ) : null}
      {disabled ? null : (
        <>
          <Input
            id={id}
            value={text}
            disabled={full}
            placeholder={placeholder}
            list={listId}
            autoComplete="off"
            onChange={(e) => {
              const next = e.target.value
              // A comma ends the tag; a value picked from the list arrives whole.
              if (next.includes(",")) commit(next)
              else setText(next)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && text.trim()) {
                e.preventDefault()
                commit(text)
              } else if (e.key === "Backspace" && !text && value.length) {
                onChange(value.slice(0, -1))
              }
            }}
            onBlur={() => {
              if (text.trim()) commit(text)
            }}
          />
          <datalist id={listId}>
            {offered.slice(0, 50).map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </>
      )}
    </div>
  )
}
