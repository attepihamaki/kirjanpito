import type { Lang } from "@/lib/domain/types"

export type Params = Record<string, string | number>

export type PluralFn = (p: Params) => string

/** One message: the Finnish value first, the English one second. */
export type Message = readonly [fi: string | PluralFn, en: string | PluralFn]

export type Dict = Readonly<Record<string, Message>>

/** Build a plural message: `pl("1 kirjaus", "{n} kirjausta")`. */
export function pl(one: string, many: string): PluralFn {
  return (p) => (Number(p.n) === 1 ? one : many)
}

const INDEX: Readonly<Record<Lang, 0 | 1>> = { fi: 0, en: 1 }

/**
 * Look up a message and interpolate `{param}` placeholders. An unknown key
 * returns the key itself, so a missing string is visible but never crashes.
 */
export function translate<D extends Dict>(
  dict: D,
  key: keyof D & string,
  lang: Lang,
  params?: Params
): string {
  const message = dict[key]
  if (!message) return key
  const raw = message[INDEX[lang]]
  const value = typeof raw === "function" ? raw(params ?? {}) : raw
  if (!params) return value
  return value.replace(/\{(\w+)\}/g, (match, name: string) =>
    params[name] === undefined ? match : String(params[name])
  )
}

export type T<D extends Dict> = (
  key: keyof D & string,
  params?: Params
) => string

/** Bind a dictionary and a language into a `t()` function. */
export function createT<D extends Dict>(dict: D, lang: Lang): T<D> {
  return (key, params) => translate(dict, key, lang, params)
}
