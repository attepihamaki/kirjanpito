/**
 * The one place a tax or bookkeeping condition is written as data. A rule says
 * what it is called, where it comes from and how serious a breach is, and its
 * `check` returns one value per breach: nothing when the rule holds. The
 * callers decide what a breach means for them: the ledger filters by it, a
 * checklist counts it, a test asserts there is none.
 */

/** A blocker stops an action, a warning asks for a look, info is for the record. */
export type RuleSeverity = "blocker" | "warn" | "info"

export interface Rule<C, D = undefined> {
  /** Unique within its set, and stable: callers and tests refer to it. */
  readonly id: string
  readonly severity: RuleSeverity
  /**
   * The statute section or check number the rule implements, such as
   * "KPL 2:4" or "Form 5 spec 2026 #1411". A rule with no source is one the
   * app made up, and says so.
   */
  readonly source: string
  /** One value per breach, with whatever the caller needs to describe it. */
  readonly check: (ctx: C) => readonly D[]
}

export interface Finding<D = undefined> {
  ruleId: string
  severity: RuleSeverity
  source: string
  data: D
}

/** A set of rules with unique ids. */
export interface RuleSet<C, D = undefined> {
  readonly rules: readonly Rule<C, D>[]
  get(id: string): Rule<C, D>
}

export function defineRules<C, D = undefined>(
  rules: readonly Rule<C, D>[]
): RuleSet<C, D> {
  const byId = new Map<string, Rule<C, D>>()
  for (const rule of rules) {
    if (byId.has(rule.id)) throw new Error(`Duplicate rule id ${rule.id}`)
    byId.set(rule.id, rule)
  }
  return {
    rules,
    get(id) {
      const rule = byId.get(id)
      if (!rule) throw new Error(`Unknown rule ${id}`)
      return rule
    },
  }
}

/** Every breach of the rules, in the order the rules are listed. */
export function evaluate<C, D>(
  set: RuleSet<C, D>,
  ctx: C,
  only?: readonly string[]
): Finding<D>[] {
  const out: Finding<D>[] = []
  for (const rule of set.rules) {
    if (only && !only.includes(rule.id)) continue
    for (const data of rule.check(ctx)) {
      out.push({
        ruleId: rule.id,
        severity: rule.severity,
        source: rule.source,
        data,
      })
    }
  }
  return out
}
