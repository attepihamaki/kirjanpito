# SEO, routes, hosting and persistence

Part of the project specification. `CLAUDE.md` is the index and holds the conventions; section numbers are the same in every file, and code comments cite them as §N.

## 11b. SEO and the route structure

The landing page is the public document; the bookkeeping app is not.

> **Indexing is currently switched off entirely.** `INDEXABLE` in `lib/site.ts`
> is `false` while the site is served from its github.io working URL: a search
> result pointing there would outlive the move to the real domain and compete
> with it as a duplicate. The flag drives three things — the robots meta on
> every document (`app/layout.tsx`), `robots.txt` and the sitemap — and
> `test/seo.test.tsx` asserts all three against it, in whichever position it
> is in, so flipping it cannot leave one behind. The Open Graph card is
> deliberately **not** gated: noindex keeps a page out of search results, not
> out of a chat app's link preview. Turn it on in the same change that sets
> `BASE_PATH` back to `""` and `SITE_URL` to the custom domain. Everything
> below describes how the site behaves with it on.

**Only Finnish is indexed.** English remains a first-class UI language (§9), but
it is a stored preference, not a URL. That single decision is what keeps the
route tree flat — see "One root layout" below for what the alternative cost.

```
app/
  robots.ts                      → /robots.txt      (disallows /app/)
  sitemap.ts                     → /sitemap.xml     (/ and /privacy, no alternates)
  not-found.tsx                  → /404.html        noindex, title only
  layout.tsx                     ROOT LAYOUT — <html lang="fi">
  page.tsx                       /                  landing, indexed
  privacy/page.tsx               /privacy           privacy statement, indexed (§8.3)
  og/[file]/route.tsx            /og/opengraph-image.png  1200×630 via next/og
  app/
    layout.tsx                   AppShell + metadata.robots = noindex, nofollow
    page.tsx                     /app → /app/overview
    overview/  summary/  calendar/
    ledger/                      page.tsx = Tositteet
      journal/  accounts/  chart/  Päiväkirja, Pääkirja, Tililuettelo (§8.4)
    vat/                         layout.tsx = VatShell; page.tsx = Laskelma
      ec/                        Yhteenvetoilmoitus (§8.7)
    statement/                   layout.tsx = StatementShell; page.tsx = Laskelma
      balance/  assets/  deductions/  Varat ja velat, Poistot, Vähennykset (§8.8)
    settings/                    layout.tsx = SettingsShell; page.tsx = Yleiset
      categories/  recurring/    /app/settings/… (§8.10)
```

- **The app routes are English** (`/app/overview`, `/app/ledger`, `/app/vat`, `/app/statement`,
  `/app/summary`, `/app/settings`), in both UI languages. Each segment is the key
  it has in `APP_ROUTES`, so a route and the code linking to it cannot drift.
  Nothing under `/app` is indexed, so there is no SEO reason to localise the
  paths, and a single set of URLs keeps language switching a pure state change
  rather than a navigation.
- **`/app` itself redirects to `/app/overview`** (`components/app/app-index-redirect.tsx`).
  It is a guessable, bookmarkable URL, and without a page here the export has no
  `out/app/index.html` and it would 404. Static export rules out a server-side
  redirect, which costs nothing: the app is client-only and AppShell already
  holds every route back until the store has rehydrated. Only the open case is
  handled — AppShell already sends a closed bookkeeping to the landing (§8.1).
- **One root layout.** An earlier version had two, inside `(fi)` and `(en)` route
  groups, because only a root layout renders `<html lang>` and each indexed
  document must ship the right one in its static HTML. Dropping the indexed `/en`
  removed that requirement and with it the route groups, the `hreflang`
  alternates, the sitemap alternates, the first-visit language seeding, and the
  full page load that a landing-language switch used to be. **Do not reintroduce
  a per-language URL without reinstating all of it.**
- **The 404 is the ordinary `app/not-found.tsx`**, wrapped by the root layout
  like any other page; `experimental.globalNotFound` is gone from
  `next.config.ts` along with the second root layout that forced it. Next already
  adds the `noindex` meta, so the file only sets a title. (With `INDEXABLE` off
  the 404 carries two robots tags, Next's and the root layout's; they agree, and
  a crawler takes the most restrictive of several anyway.) The page is plain text
  and buttons — no receipt motif: it is a dead end, not a document.
- **A Content Security Policy goes out as a meta tag** (`CONTENT_SECURITY_POLICY` in `lib/site.ts`, rendered by `HtmlShell` and hoisted into `<head>` by React), because GitHub Pages cannot set headers. `connect-src 'self'` and `form-action 'none'` hold the app to keeping the bookkeeping in the browser (§1) even if a script gets in. It is production only, since the dev server needs eval and a websocket, and `scripts/verify-export.mjs` fails the build if any document lacks it. Scripts keep `'unsafe-inline'`, because a static export has no per-request nonce for Next's inline bootstrap. A meta tag cannot carry `frame-ancestors`, so framing stays unguarded until the site moves to a host that sets headers. The site's origin, `attepihamaki.github.io`, is shared with every Pages site on that account, and each of them can read this one's localStorage and IndexedDB: moving to a custom domain (below) is what closes that.
- **`output: "export"`** with `trailingSlash: true` and `images.unoptimized`.
  `robots.ts`, `sitemap.ts` and `og/[file]/route.tsx` are Route Handlers and
  need `export const dynamic = "force-static"` — without it the build fails.
  `ImageResponse` does emit PNGs under static export; `verify-export.mjs`
  checks the file is there and really is a PNG.
- **The OG card is a route handler, not the `opengraph-image.tsx` convention.**
  The convention emits an extensionless `out/opengraph-image` and tags it as
  `/opengraph-image`, relying on the route's `contentType` export — which only
  a host that serves the route can honour. GitHub Pages serves plain files and
  types each response from its extension, so that file would go out as
  `application/octet-stream` and link-preview crawlers would reject it
  (vercel/next.js#82177). A dynamic segment with one literal value makes the
  export write a real `out/og/opengraph-image.png` instead. `OG_FILE` /
  `OG_PATH` in `components/landing/og-image.tsx` are the single source of that
  name, and `app/page.tsx` declares `openGraph.images` and `twitter.images`
  from them by hand — the file convention silently overrides explicit metadata,
  so the two cannot coexist.
- **Language**: `HtmlShell` bakes `lang="fi"` into every document. It is the
  store's default, so the prerendered HTML and the first client render match
  byte for byte; `LangHtmlAttr` then follows the stored preference, the way
  next-themes manages `class` on the same element. The landing, the 404 and the
  app all work this way — the landing switches to English in place once
  rehydration lands. A crawler only ever receives the Finnish document, and
  there is no alternate URL to redirect to, so nothing here is
  cloaking-adjacent. This is §9's "no locale routing is needed", now true
  without qualification.
  **Known cost, accepted:** a first-time English-speaking visitor lands on
  Finnish and has to find the FI|EN toggle in the header. Seeding from
  `navigator.language` on a first visit would fix it and is safe now that no
  alternate URL exists — deliberately not done, to keep first paint predictable.
- **The landing bundle must not contain `pdfjs-dist`, `@zip.js/zip.js`, `papaparse`,
  `recharts` or `pdf-lib`.** Commands are split into `lib/commands/book-commands.ts` (safe to
  import statically) and `lib/commands/io-commands.ts` (pulled in with
  `await import()` from the landing's file handler). `lib/browser/pdf.ts` is the
  only module importing pdfjs and is always dynamically imported.
  **`scripts/verify-export.mjs` enforces this on every build** (`postbuild`, so
  a failure fails `npm run build` and the deploy never uploads an artifact). It
  reads the chunks `out/index.html` references and looks for several string
  markers per library, because minification keeps string literals and mangles
  identifiers — the package name itself is usually gone. It also **self-tests**:
  each library's markers must still match somewhere in the export, or the check
  fails as a no-op rather than passing vacuously. That rule exists because the
  hand-run version of this check grepped for `"papaparse"`, a string that does
  not survive minification, and so had never once tested that library.
- `SITE_URL` comes from `NEXT_PUBLIC_SITE_URL` in `lib/site.ts`, which also holds
  `BASE_PATH` and the route constants. `SITE_URL` **includes `BASE_PATH`**: the
  site's root document is `https://attepihamaki.github.io/kirjanpito/`, and Next
  joins that pathname onto the relative URLs in the metadata, so `OG_PATH`
  resolves to `…/kirjanpito/og/opengraph-image.png` rather than losing the
  prefix.

### Hosting: GitHub Pages

The export is published to **GitHub Pages** by `.github/workflows/deploy.yml`
on every push to `main` — `npm run check`, then `npm run build`, then the `out/`
directory as a Pages artifact. Nothing about the app is host-specific: it is
static files, so any static host would do.

- **The site is served under the repository's path**, `https://attepihamaki.github.io/kirjanpito/`,
  because this is a project repo and no custom domain is set. `BASE_PATH` in
  `lib/site.ts` is that prefix, and `next.config.ts` imports it as `basePath`.
  **`assetPrefix` is not needed and must not be added**: `basePath` already
  prefixes the routes, every `next/link` and every `_next/` asset — verified in
  `out/`. The two differ only when assets come from another origin.
- **`lib/browser/pdf.ts` is the one place that spells the prefix out.** It hands
  pdf.js `` `${BASE_PATH}/pdf.worker.min.mjs` ``, a URL that never passes through
  Next, so nothing prefixes it automatically. Everything else routes through
  `next/navigation` or `next/link`, which are `basePath`-aware. A missed prefix
  there would break the receipt viewer in production only.
- **`robots.txt` and `sitemap.xml` are published under the prefix too**, at
  `/kirjanpito/robots.txt` — and a crawler only reads the one at the host root,
  which belongs to a different repository. So robots is inert here whatever it
  says, which is the second reason `INDEXABLE` puts the real instruction in a
  meta tag on each document: that one travels with the page. Both files are
  still generated with correct host-absolute paths, so moving to a host root
  needs no code change in them.
- **To move to a custom domain:** in `lib/site.ts` set `BASE_PATH` to `""`,
  `SITE_URL` to that origin and `INDEXABLE` to `true`; add `public/CNAME`
  containing the domain (that file is what carries it into the export — without
  it a deploy clears the repository's custom-domain setting); and set the domain
  in Settings → Pages. Nothing else in the codebase mentions the prefix or the
  indexing state.
- **The deploy workflow grants each job only what it needs.** The build runs `npm ci` and the tests, so it holds `contents: read` alone; `pages: write` and `id-token: write` belong to the deploy job. Every action is pinned to a commit SHA, with its tag in a comment beside it.
- **Jekyll never runs**, because Pages is deployed from the Actions artifact
  rather than from a branch. That is what makes `_next/` serve; a branch-based
  deploy would need a `.nojekyll` file.
- **The 404 needs no configuration.** The export emits `out/404.html` and Pages
  serves it for unmatched paths, which is also why `trailingSlash: true` matters:
  every route is a real `index.html` and no rewrite rules are involved.

### Installing and working offline

The site is a progressive web app: a manifest lets a browser install it, and a service worker keeps it usable with no connection. The file is the database (§1), so nothing else is needed for the app to work offline.

- **The manifest is `app/manifest.ts`**, a Route Handler with `dynamic = "force-static"` that the export writes as `manifest.webmanifest`. It is in Finnish, with no per-language variant, like the indexed document. `start_url` is `/app/`, which sends an open bookkeeping to the overview and a closed one to the landing page. `scope` is the whole site, because the landing page is where a file is opened. `launch_handler` is `focus-existing`, since one tab at a time holds the bookkeeping (§12).
- **Neither the manifest's URLs nor the icon links pass through `basePath`.** `lib/pwa.ts` holds the scope, the start URL, the worker's URL and the icon list, each with `BASE_PATH` spelled out. Moving to a host root needs no change there.
- **The icons are route handlers** (`app/icons/[file]/route.tsx`), for the reason the OG card is one: the export writes real `.png` files that Pages types from the extension. `APP_ICONS` lists them: 192 and 512 as a rounded square, a 512 `maskable` and a 180 `apple-touch-icon` that fill the square. `components/app-icon.tsx` draws the mark, the letter K on `--primary`.
- **The service worker is generated, not written to `public/`.** `scripts/build-sw.mjs` runs on `postbuild` before the export check. It lists the files in `out/`, hashes them into a version and writes `out/sw.js`. The worker's code is the two functions in `scripts/sw/`, printed into the file with `toString()`, so each must stand alone, with no imports. That is also what lets `test/pwa.test.tsx` run the worker against a fake global scope.
- **Hashed files are answered from the cache, everything else from the network first.** Files under `_next/static/` carry a content hash in their name. Documents, their RSC payloads (`*.txt`) and `pdf.worker.min.mjs` keep one URL across builds, so the cached copy is used only when the network fails or takes more than four seconds. Online, a user gets a new build on the next page load, as without the worker, and no "update available" prompt exists. A request that is not a GET, or is outside the scope (the bank proxy), is left alone.
- **The cache holds exactly one build.** Install stores every listed file or fails as a whole. A network answer is never written into the cache, because a newer document would point at chunks the cache lacks. A new worker takes over at once (`skipWaiting`, `clients.claim`) and deletes the older cache.
- **Cache Storage is per origin, and the origin is shared** with the account's other Pages sites. The cache is named `kirjanpito-<version>`, and the worker deletes only names with that prefix.
- **Only an open bookkeeping registers the worker.** `useServiceWorker` is mounted in `AppShell`, in production only. A visitor who only reads the landing page gets no worker and no cache, as they get no stored bookkeeping (§12). The cache holds the app's own files and none of the user's data, so closing the file leaves it in place.
- **A redirect passes through the worker**, which is what lets a browser with the worker installed follow the site to a custom domain. An app installed from the old origin stays there with that origin's storage. The user installs again from the new address and opens their file.
- **The CSP needs nothing for this.** `worker-src 'self'` covers the registration, and the manifest falls under `default-src 'self'`.
- **`verify-export.mjs` checks all of it**: the manifest exists and is linked, its URLs carry the base path and have a file behind them, the icons are PNGs, and every path `sw.js` precaches exists, since one missing file fails the worker's install.

### Release notes

`scripts/release-notes.mjs` turns Conventional Commit subjects into notes. `node scripts/release-notes.mjs` lists what changed since the newest tag, or since the first commit while there is none.

- **Only what a user can notice is listed**: `feat`, `fix` and `perf`, and any commit marked breaking with `!`. `--all` adds docs, tests, CI and refactors, which are written for developers. `--json` prints the entries for something that renders them itself, and `--from`, `--to` and `--title` pick the range and the heading.
- **The scope is the grouping**: "**vat:** Partial deduction…". A subject without the `type(scope): text` shape is skipped, so a merge or a loose message never reaches the notes.
- **A release is a tag.** Pushing a `v*` tag runs `.github/workflows/release.yml`, which writes the notes for the range since the previous tag and creates the GitHub release. The site is deployed on every push to main either way, so a tag records what changed and publishes nothing.
- **The subjects are the source text**, in English and for developers. An in-app "what changed" would need user-facing wording in both languages, which the subjects do not give, so none exists.

### Local checks (git hooks)

`npm install` sets up two hooks through Husky (`prepare`), so the failures CI reports stop before the push.

- **`pre-commit`** runs lint-staged on the staged `.ts` and `.tsx` files: Prettier writes the formatting back, then ESLint runs with `--max-warnings 0`. It takes seconds, because it never looks at the files that are not staged.
- **`pre-push`** runs `npm run typecheck`, which has to see the whole project.
- **`npm run docs:check`** (`scripts/check-docs.mjs`, part of `npm run check`) fails when the documentation points at something gone: a file path in backticks in `CLAUDE.md` or `spec/` that does not exist, a `§` reference to a section with no heading, or a "CLAUDE.md §N" comment in the sources that names one. Paths under `docs/` are local-only and are not checked. It does not check function or field names, which the prose uses too freely to match reliably.
- **`npm run unused`** (knip, configured in `knip.json`, part of `npm run check`) fails on a file, a dependency or an exported value that nothing imports. Tests count as users, so an export that only a test reads passes. Exported types are not reported, since a type exported to document a shape costs nothing, and the exports of `components/ui/` are left alone because that folder holds shadcn's component sets whole. An export used only inside its own file loses its `export`; one used nowhere is deleted.
- **CI is the backstop.** `npm run check` runs the same checks plus the tests on every push, so `--no-verify` skips a convenience and not the gate.

## 12. Persistence keys

**Storage names and the field names inside them are English**, so what a
browser holds is legible without Finnish, whatever language the book is written
out in. The file's own vocabulary — the CSV's columns and words, the receipt
folder — belongs to `exportLang` (§7.1, §7.2) and meets this one only in
`lib/domain/csv.ts` and `lib/domain/csv-header.ts`.

**The two app-level preferences each own a key**, outside the bookkeeping
blob, and each holds a bare value rather than JSON. They belong to the
browser, not to a bookkeeping: the landing page and the 404 need the language
before any file is open, and must not read or write `bookkeeping` to get it.

- localStorage `bookkeeping` — exported as `BOOK_STORAGE_KEY` from
  `stores/book-store.ts`, so nothing hard-codes the string twice:
  `{ entries, cats, year, dirty, fileName, savedAt, lastMode, lastType, open, ledgerSize, ledgerHidden, ctSize, sidebarOpen, exportLang, businessId, businessName, businessPhone, vatPeriod, traderType, bookStart, vatFiled, yearsArchived, archives, archiveYear, overviewLayout, autosave, encrypted, recurring, categoryRules, assetOpening, bankBalance, payMonths }`.
  The book's settings are kept twice: here, as the working buffer, and in the
  file's `settings.json` (§7.6), as the record. A reload restores them from
  here; opening a file replaces them from there.
  **The key carries no version suffix.** Zustand's `persist` already writes its
  `version` into the stored value and owns the `migrate` hook, which can
  transform old data; a version in the key could only orphan it, and two version
  numbers would eventually disagree. A future break not worth migrating renames
  the key to `bookkeeping.v2` at that point.
  **Only a bookkeeping creates the key.** `bookStorage`, the store's own
  `PersistStorage`, skips the write while there is no bookkeeping (`open` false
  and no entries) and the key does not already exist. Rehydration is itself a
  state change, so without that rule a visitor who only ever read the landing
  page came away with the whole default blob — every category — stored under
  their name. Once the key exists it is kept up to date as usual, closed file
  included, so `ledgerSize`, `ctSize` and `sidebarOpen` survive a close.
- localStorage `lang` — `fi` | `en`, owned by `stores/lang-store.ts`
  (`LANG_STORAGE_KEY`). A plain Zustand store, not `persist`: the value is the
  string itself, as next-themes writes `theme`, and `StoreHydrator` reads it
  after mount so the prerendered Finnish HTML and the first client render still
  match (§11b). Reading never creates the key — only the picker writes it.
- localStorage `theme` — owned by next-themes: `system` | `light` | `dark`.
  Its pre-paint inline script reads that key before any of our JS runs, so a
  second source of truth would drift.
- Both preferences used to live in the `bookkeeping` blob. `persist.migrate`
  (`version: 3`; the store is now at 11, §4, §5, §6.6, §6.7, §6.9) moves each into its own key and drops the field,
  seeding only a key that is still empty — the separate key is the newer truth.
- IndexedDB `bookkeeping-receipts`, store `files`: receipt Blobs keyed by
  attachment id.
- IndexedDB `bookkeeping-receipt-hash`, store `hash`: the SHA-256 of each
  receipt, keyed by attachment id (§8.4). A cache derived from the blobs and
  never written to the file; it is rebuilt by reading the receipts again.
- IndexedDB `bookkeeping-file`, store `handle`, key `book`: the
  `FileSystemFileHandle` of the opened file (§7.5). Its own database, because
  adding a second object store to the one above would mean a version upgrade.
  It is **not** in the localStorage blob — a handle is not JSON — so
  `AppShell` restores it by hand once the book has rehydrated, and both ways
  of leaving a bookkeeping delete it.
- Cache Storage `kirjanpito-<version>`: the app's own files for offline use,
  written by the service worker (§11b). It holds no bookkeeping, and only an
  open bookkeeping creates it.
- **sessionStorage is not used.**
- **Persistent storage is requested** with `navigator.storage.persist()` at the first unsaved change of a page load (`hooks/use-persistent-storage.ts`), so a browser that prompts does so when there is work to protect. Without it the browser may evict storage under disk pressure, and until a save this is the only copy. A refusal changes nothing and is not shown.
- **One tab at a time holds the bookkeeping.** localStorage and IndexedDB are
  shared between tabs while the store is per tab, so a second tab would
  overwrite the first one's entries and its receipt sweep would delete the
  first one's receipts. `AppShell` holds the Web Lock `bookkeeping-app`
  (`lib/browser/tab-lock.ts`) for as long as it is mounted. A second app tab
  shows a notice, runs no sweep and no autosave, and takes over by itself when
  the lock frees, reloading what the first tab stored. The landing page holds
  no lock, so it stays readable, but it refuses to open or start a bookkeeping
  while another tab holds one. Where the browser has no Web Locks the guard is
  simply absent.

`stores/storage.test.ts` covers all of this: the landing-page visit that
stores nothing, the close that keeps the page sizes, and both migrations.

**No migration from the prototype-era names** (`kirjanpito.v1`,
`kirjanpito-tositteet`). A browser still holding them starts empty and the old
data is orphaned; the user re-opens their exported CSV or ZIP. This was a
deliberate choice over writing a one-shot copy step — the exported file is the
real copy of the bookkeeping, and the browser is only a working buffer (§1).

### Storage migrations

`persist.version` in `stores/book-store.ts` is the version of the stored blob's shape. It is separate from `SETTINGS_VERSION` (§7.6), which versions the file.

- **`migrate` ignores the version it is given.** Zustand calls it only when the stored version differs from the current one, and it then runs every step, whatever the stored version was. So **each step must be idempotent**: running it on a blob that is already current changes nothing. A step guards on the data (`Array.isArray`, `typeof`), never on a version number.
- **A step reads its input as untyped.** The blob may come from any earlier version, so `migrate` casts it to `Record<string, unknown>`, checks each field it touches and leaves the rest alone. A missing field is not an error; the store's defaults fill it.
- **Bump `version` when a stored value would otherwise be wrong**, not when a field is added. A new optional field needs no bump, since `merge` fills in the default. The counterparty register is made whole there too (`withPartyFields`, §8.29), so a party stored before roles reads as a customer. A renamed field, a changed meaning, a new invariant on stored entries (voucher numbers, EU categories) or a moved key does.
- **Do the work in a pure function from `lib/domain`** and call it from `migrate`, so the step has a unit test without a browser. `assignVouchers`, `mergeCategories` and `moveEuPurchasesToCategories` are the pattern. The same function usually runs again when a file opens, so a file and a stored book end up in the same shape.
- **Test each bump in `stores/storage.test.ts`** with a blob written at the previous version: the step does what it should, and a blob already current passes through unchanged.
- **Migration only moves what the browser holds.** The file on disk is never rewritten by it; the next save writes the new shape. A file's own compatibility is `parseSettings` and the lenient CSV import (§7.1, §7.6).
- **A break not worth migrating renames the key** (`bookkeeping.v2`) and orphans the old blob, as the prototype-era names were. The exported file is the real copy (§1), so this is acceptable, but say so in the commit message.
- **A downgrade is not supported.** An older build that reads a newer blob runs its own `migrate` over it, which knows nothing of newer fields and may misread them. The file on disk is the way back.

Wrap all storage access in try/catch, and render correctly when storage is empty or unavailable. **A failed write is shown, not swallowed.** Private browsing, blocked site data or a full quota leave the book in memory only, so `useStorageWarning` raises a toast that stays until a write succeeds again, the file menu adds a line under the save status (`StorageNote`), and closing the tab asks even when the book is saved to its file, because a reload would bring back the older book that storage still holds. `test/storage-warning.test.tsx` covers it.
