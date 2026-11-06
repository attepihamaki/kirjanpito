# Design system

Part of the project specification. `CLAUDE.md` is the index and holds the conventions; section numbers are the same in every file, and code comments cite them as §N.

## 11. Design system

The aim is a calm, Nordic, functional tool. The one bold element is the **paper receipt motif**: the live preview in the entry dialog and the landing hero. Everything around it stays quiet. Avoid generic SaaS-card layouts, gradients, all-caps labels and decorative motion.

> **`app/globals.css` is the source of truth for colours.** The surfaces are
> shadcn's own "neutral" base, unchanged: white cards on a white page with a
> `#FAFAFA` sidebar in light, `#171717` cards on `#0A0A0A` in dark, and
> borders at 10 % white. The one colour of the app's own is `--primary`, the
> forest green "Metsä" (`#145A3C` light, `#7FCBA2` dark), which also drives
> `--ring`, `--sidebar-primary` and the green `--chart-*` ramp. Every value is
> oklch with its hex in a comment beside it. Green also means income here, so
> a primary button never stands beside an income amount without its label.
> The prototype's variable names still map onto the theme's as:
>
> | prototype     | theme                                |
> | ------------- | ------------------------------------ |
> | `bg`          | `background`                         |
> | `surface`     | `card`, `popover`, `sidebar`         |
> | `sunken`      | `muted`, `secondary`, `accent`       |
> | `ink`         | `foreground`                         |
> | `muted`       | `muted-foreground`                   |
> | `rule`        | `border`                             |
> | `rule-strong` | `input`                              |
> | `accent`      | `primary`, `ring`, `sidebar-primary` |
> | `accent-ink`  | `primary-foreground`                 |
> | `out`         | `destructive`                        |
>
> The rest of the shadcn theme still holds: style `base-nova` on Base UI,
> `--radius: 0.625rem`, Geist via `next/font/google`. Use the semantic
> variables and the standard component variants. **Never hard-code a hex value
> and never write a manual `dark:` override.** `Surface` adds shadcn's
> `shadow-xs`: in light mode a white card on a white page is held apart only
> by its border and that shadow.
>
> `--accent-soft` has no theme equivalent — shadcn's `--accent` is the neutral
> hover grey, not a tint of the brand colour. The landing hero panel uses
> `bg-primary/10` instead, which gives both themes what the prototype spells
> out as two hex values.
>
> **Ten variables were added** on `:root` and `.dark`, because the theme has no
> equivalent and its nearest colours already mean something else — `--primary` is
> the call-to-action fill and `--destructive` means "error", not "expense":
>
> | variable                                          | use                                                              |
> | ------------------------------------------------- | ---------------------------------------------------------------- |
> | `--income` / `--income-subtle`                    | income amounts, the Tulo segment, row edge, income bars          |
> | `--expense` / `--expense-subtle`                  | expense amounts, the Kulu segment, row edge, expense bars        |
> | `--paper` / `--paper-foreground` / `--paper-edge` | the receipt motif: the entry dialog preview and the landing hero |
> | `--sheet` / `--sheet-edge`                        | the income statement and the landing's CSV sample                |
> | `--warning`                                       | the amber "Tallentamattomia muutoksia" status dot             |
>
> They are exposed through `@theme inline` as `--color-income`, `--color-expense`
> and so on, so they work as `bg-income`, `text-expense`, `bg-paper`.
> A `.tabular` utility, `.paper-surface` and the `@media print` rules also live
> in `globals.css`.

### Paper and sheet are two different surfaces

The prototype split them, and the app follows:

- **`--paper`** is the receipt motif — a printed slip, so it stays warm paper
  with dark ink **in both themes**. `.dark` deliberately does not override it.
  Because of that, whatever is printed on it has to stay light too: the
  `.paper-surface` class on `ReceiptPaper` pins `--income` / `--expense` and
  their subtle fills back to their light values, exactly as the prototype's
  `.receipt` redeclares the same variables. Dark mode's pale mint badge on warm
  paper is unreadable and its near-black fills read as ink blots.
- **`--sheet`** is the income statement (§8.8) and the landing's CSV sample — a
  document on screen rather than an object, so it follows the theme, goes dark
  with it, and carries the ordinary `foreground` / `muted-foreground` text.
  Only in light mode is it the same warm tone as `--paper`.

- **Type:** **Geist is the app's only face** (400–700), with tabular figures for numbers. `HtmlShell` loads it and defines `--font-sans`; there is no `--font-mono`, and no monospace is loaded or wanted. One consequence worth knowing: Tailwind's preflight puts `code`, `kbd`, `samp` and `pre` in a mono stack of the browser's own, so **any such element needs `font-sans`** — the save shortcut's `<kbd>` carries it. Adding a monospace back means a `next/font` call, a `--font-mono` line in `globals.css`'s `@theme inline` block beside `--font-sans`, and dropping that override; without the theme line Tailwind keeps its generic stack and the loaded face goes unused. Page titles are 26 px / 600 / −0.02 em. The landing headline is `clamp(38px, 5.4vw, 64px)` with tight leading (1.03) and −0.035 em tracking.
- **Radii:** 6 px for inputs and buttons, 10 px for panels, 14 px for dialogs and large cards. Segmented controls and the month chips take the button radius — they are buttons, and a pill among them would be the one control shaped unlike the rest. Only `Pill` itself and the status dot are fully round.
- **Control heights:** **36 px** is the default for a button, an input, a `Select` trigger and a segmented control, 32 px one step down (`size="sm"` / `icon-sm`) and 40 px one step up (`lg`). Each is a unit taller than the shadcn default, which was too tight for a form that is mostly amounts and dates. The scale is spelled out in five files — `button.tsx`, `input.tsx`, `select.tsx`, `toggle.tsx` and `sidebar.tsx` — because each owns its own variants; **they are changed together or not at all**, or a row of mixed controls stops lining up. `sidebar.tsx` carries the scale as a `size="md"` on `SidebarMenuButton` (shadcn's own sizes are 28 / 32 / 48), which the navigation rows use; the brand button stays `lg`. Collapsed, every row is pinned back to 32 px so the icons sit on one grid in the 3 rem rail — `app-skeleton.tsx` draws the expanded height, so nothing shifts on rehydrate.
- **Theme:** light ↔ dark from the top bar, defaulting to the system theme (§8.2).
- **Responsive breakpoints:** 900 px (the sidebar becomes a sheet; dialogs stack) and 560 px (compact table and totals). 900 is also `MOBILE_BREAKPOINT` in `hooks/use-mobile.ts`, and the `min-[900px]:` that replaced shadcn's hard-coded `md:` inside `components/ui/sidebar.tsx` — the CSS and the JS have to flip on the same pixel.
- **Accessibility:** visible focus rings, `aria-sort` on sortable headers, `aria-pressed` on toggles, `aria-label` on icon buttons, `prefers-reduced-motion` respected. The only motion is a short pop-in on dialogs.

### Suggested shadcn/ui mapping

Sidebar → shadcn's `Sidebar` (with `Sheet`, `Tooltip` and `hooks/use-mobile.ts`), in `components/app/app-sidebar.tsx`. It was hand-written and the shadcn one deleted while the sidebar was a static panel; §8.2's collapse-to-icons and mobile sheet are exactly the machinery it provides, so it came back — the local edits are the 900 px breakpoint, the `md` row size and the 15 rem width. Language picker → `DropdownMenu`. File menu → `Popover`, not `DropdownMenu`: it holds a year `Select`, and a select inside a menu fights the menu's own keyboard handling. Buttons → `Button` (variants default, outline, ghost, destructive). Segmented controls → `ToggleGroup`. Selects → `Select`. Entry, export and viewer dialogs → `Dialog`. Confirmations → `AlertDialog`. Tables → `Table`, hand-composed (see §2). Pagination → `components/common/table-pagination.tsx` ("Rows per page", "Page 1 of 2", «‹›»). Field errors → `FieldError` from `components/ui/field.tsx` — never a hand-rolled `<p className="text-sm text-destructive">`, and never without `aria-invalid` on the field the message is about. Toasts → `components/ui/toast.tsx` (see §2). FAQ → `Accordion`. Checkboxes → `Checkbox`. Inputs → `Input`. Chart → Recharts, used directly in `income-expense-chart.tsx` and `result-widget.tsx`; shadcn's `Chart` wrapper was removed. Use the shadcn/ui skill for component usage.

### One source of truth per element

Anything that appears in two views is a component in `components/common/`, taking attributes rather than being rebuilt. A second hand-written copy of a class string is how one view ends up a shade off every other, so when a shape is needed twice, the second use extends the first instead of restating it.

| element                      | component                                                                                                                                                                                                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| every bordered box           | `surface.tsx` — `radius` (lg / xl) and `tone`. shadcn's `Card` is not used; it was deleted (§11)                                                                                                                                                                               |
| a box with a ruled heading   | `panel.tsx`, built on `Surface`. `title`, `description` and `actions` are all optional — with none of them it is a bare box, which is what the totals cards and the VAT banner are. `footer` is a tinted strip for buttons acting on its contents; `variant="destructive"` is for an action that cannot be undone |
| tables                       | `ui/table.tsx`. Row padding is the `density` prop — `"comfortable"` for the ledger, the default elsewhere — never a `[&_td]:` override at the call site. `Table` is already the horizontal scroller, so never wrap it in another `overflow-x-auto`. The header row is **56 px**, the height of the `TablePagination` strip under the table (a 32 px control row inside `py-3`): they are the table's two chrome rows and are changed together |
| money                        | `money.tsx` — `Money` with `tone` / `signed`, `ZeroDash` for an absent amount. Only a string context (an interpolated message, a chart tick, `ReceiptRow`) calls `f.money` directly, and writes a minus with `MINUS`, never a literal |
| a control that can be busy   | `busy-button.tsx` — `BusyButton` swaps the icon for a spinner and, with `busyLabel`, the label too; `BusyIcon` is the swap alone, for controls that are not `Button`s |
| a link that looks like a button | `button-link.tsx` — a `next/link` wearing `buttonVariants`. `Button` enforces button semantics, so a link must never go through its `render` prop: it would announce `role="button"` on something that navigates |
| small labels                 | `pill.tsx` — `tone` (neutral / income / expense) and `size`. shadcn's `Badge` is not used: `--destructive` means "error", not "expense" |
| income or expense            | `filter-controls.tsx` — `EntryTypeToggle` (income first, coloured, a form field) and `TypeFilterSelect` (all / income / expense, a toolbar filter) |
| a full-screen scrim          | `overlay.tsx` — `blocking` is the whole difference between the import overlay and the drop hint |
| a dashed "put a file here"   | `drop-tile.tsx` — owns the outline, hover, focus and disabled state; the caller gives it its shape |
| the receipt motif            | `receipt-paper.tsx` — `ReceiptPaper` and its `Head` / `Rule` / `Row` / `Total` parts, shared by the entry preview and the landing hero |
| landing and 404 type         | `typography.tsx` — `DisplayHeading` (`size` lg / md), `Lead`, `SectionHeading` |
| the root of a document       | `LangRoot` in `lang-provider.tsx` — the app shell, the landing page and the 404 all start with it |
| a form for copying into OmaVero | `tax-form.tsx`: `TaxForm` and `TaxFormStep`, for Form 5 (§8.8) and the VAT return (§8.7) |
| sortable column headers      | `sortable-header.tsx` |
| tabs between sub-pages       | `sub-page-tabs.tsx`, used by Kirjanpito, Asetukset, Tuloslaskelma and ALV-laskelma |
| a figure that opens its vouchers | `figure-link.tsx` (`FigureLink`) in a view, `tax-form.tsx`'s own list button in a form; both open `figure-dialog.tsx` (§8.18) |
| the income and expense chart | `income-expense-chart.tsx`: `IncomeExpenseChart` and `IncomeExpenseLegend`, on the overview and Yhteenveto |
| single-choice selects        | `option-select.tsx` |
| a sentence explaining a control | `info-popover.tsx`: an info icon, or `trigger` for a button of its own. It opens on hover, tap or Enter. Not `Tooltip`, which touch cannot open and which opens by itself when a dialog focuses its first control |
| a key cap on a button or row | `keys.tsx` |
| the "Uusi tosite" button     | `new-entry-button.tsx` |
| page titles inside the app   | `page-header.tsx` |
| the header and footer outside the app shell | `site-chrome.tsx` |

`components/landing/og-image.tsx` is the one deliberate duplicate: Satori supports no CSS variables and no Tailwind, so the card restates the receipt in literal hex and inline flex. It cannot share anything above.

**Only the components actually in use are kept.** `components/ui/` holds 23 files; `avatar`, `badge`, `breadcrumb`, `card`, `chart`, `drawer`, `scroll-area`, `sonner` and `tabs` were generated by the shadcn CLI, never imported, and deleted. (`dropdown-menu`, `sheet`, `sidebar` and `tooltip` were deleted too, then re-added for §8.2's shell, which also brought in `popover`.) Re-add any of them with `npx shadcn add <name>` if a use appears — do not keep unused ones around on spec. `card` and `badge` are the exceptions that stay out: `Surface` and `Pill` cover them with the variants this app actually needs, and the table above says why.
