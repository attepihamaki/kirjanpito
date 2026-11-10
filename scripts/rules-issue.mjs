/*
 * Prints the body of the yearly "update the rule tables" issue: the year to
 * add, then every table in data/rules.json with the source of its newest row.
 * The workflow in .github/workflows/rules-reminder.yml pipes it into `gh`.
 */
import { readFileSync } from "node:fs"

const rules = JSON.parse(
  readFileSync(new URL("../data/rules.json", import.meta.url), "utf8")
)
const next = new Date().getUTCFullYear() + 1

const newest = (rows) => rows[rows.length - 1]
const line = (label, row, where) =>
  `- [ ] ${label}: newest row is ${where(row)}. Source: ${row.source}`

const lines = [
  `Add the figures for ${next} to \`data/rules.json\`, check the others against their sources, and set \`checkedOn\` to the day you did it.`,
  "",
  "The overview shows a notice from 1 January while a table has nothing for the new year.",
  "",
  line("Travel allowances", newest(rules.travel), (r) => r.year),
  line("Home office deduction", newest(rules.homeOffice), (r) => r.year),
  line("Income tax and YEL figures", newest(rules.incomeTax), (r) => r.year),
  line(
    `Form 5 due date for ${next - 1}`,
    newest(rules.form5Due),
    (r) => `tax year ${r.taxYear}`
  ),
  line("VAT rate changes", newest(rules.vatRateChanges), (r) => r.from),
]

for (const [key, values] of Object.entries(rules.limits)) {
  lines.push(
    line(`Limit \`${key}\``, newest(values), (r) => `${r.value} from ${r.from ?? "always"}`)
  )
}

lines.push(
  "",
  "Also check the new Form 5 data file specification in `docs/specs/` and replace the PDF; `form5-spec.pdf.test.ts` lists what moved."
)

console.log(lines.join("\n"))
