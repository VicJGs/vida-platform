<!-- PLAN — fe-gamification S5 · Activity mode · Entity Delivery Flow ② per-slice gate (§XXVI g1) -->
<!-- Forward spec. Decomposition (slice-map.md S5) already approved; this PLAN persists the ONE new S5
     decision (the ledger-read grounding) + the ActivityEntry type shape + acceptance. No chat-sketch build. -->

# PLAN-S5 — Activity mode (fe-gamification ②, LIF-181)

**Slice:** S5 — the LAST mode; completes the 5-mode System surface → unit done → PR.
**Pinned EC:** **EC-8** — "the **consequence-ledger** history; **paginated**" `[FACT: envision.md:30]`.
**Slice-map:** "the Activity mode over `CollectionView` (paginated) — the consequence-ledger history (earn/lock/
spend/distribute across modules, timestamped). Gate: paginated ledger, both presets." `[FACT: slice-map.md:59-62]`

---

## §1 Context (code as-is — baseline, §XXVI.1a)

- The surface renders Activity today as an honest `EmptyState` placeholder; "**S5 replaces Activity**"
  `[FACT: apps/web/src/gamification/CLAUDE.md:30]`.
- **The ledger-read grounding (the one real S5 question — DOC-RESOLVED, not a new decision):** the shipped ①
  `GamificationService` exposes **no activity/ledger-history read op**. The seam-contract surface lists only
  `getBalance`/`getBalances`, which read `consequence_ledger` _privately_ inside `computeBalance`
  `[FACT: seam-contract.md:27; services/gamification/service.ts:126-130]`. Confirmed three times in-repo:
  - seam-contract surface has no such op `[FACT: seam-contract.md:19-64]`;
  - "no per-currency ledger op in the seam — **S5 Activity owns the ledger**" `[FACT: currencies-mode.tsx:26-27]`;
  - "S5 owns the ledger" `[FACT: apps/web/src/gamification/CLAUDE.md:50]`.
- **Resolution (IR-G1 data-plane rule + the fe-notes first-consumer-pull precedent, NOT invention):** S5 builds
  the ②-side hook **type+shape-correct against the INTENDED read, data STUBBED**; the enriched history read is an
  **unbuilt ①-tier first-consumer-pull seam → filed as F-S5-1** (the F-S8-1 precedent `[FACT: TASKS.md fe-notes
S8]`). **No `@vida/core`/`@vida/types` change this unit** (IR-G3; the whole unit is ② `[FACT: CLAUDE.md:4-5]`).
- **Row shape backing the stub** (`consequence_ledger`, SYNCABLE + baseColumns): `id`, `created_at` (ms
  timestamp), `currency_id` (→ `currencies.code`, no FK), `amount` (positive magnitude; **sign implied by kind**),
  `kind` ∈ `['earn','lock','spend','distribute']`, `target_ref` (the source dimension), `effect_event_id`
  `[FACT: db/schema/foundation/economy.ts:36-52; packages/types/src/economy.ts:8]`.
- **Env:** Node 24 `[FACT]`. S5 is **apps/web-only** (reuses the shipped `CollectionView`/`ListView`/`Pager` idiom
  - the already-built `game` preset); **no `@vida/ui` edit** ⇒ the symlink-repoint/rebuild is NOT needed
    (`[[worktree-apps-web-ui-symlink-resolves-to-main]]` applies only when @vida/ui changes). Verified at implement.

## §2 Business rules / invariants (S5)

- **BR-S5-1 (EC-8):** Activity renders the consequence-ledger history, **reverse-chronological** (newest first),
  **paginated** at `PAGE_SIZE = 50` (reuse S2's constant `[FACT: use-currencies.ts PAGE_SIZE]`).
- **BR-S5-2 (IR-G1):** data STUBBED, type-correct; honest M1 default = **empty** (a fresh System has no ledger
  rows) → the `EmptyState`/`empty` terminal, a teaching line, **no dead affordances** `[FACT: CLAUDE.md:57-58]`.
  `?sample` renders a populated, deterministic ledger for the Visual Gate; `?force=loading|error` reaches the two
  terminal states the honest-empty seam can't (the S1–S4 dev-gate idiom `[FACT: use-gamification.ts header]`).
- **BR-S5-3 (IR-G3):** no business logic, no math — kind semantics ride as DATA; the UI renders. Each row shows the
  amount as a **positive magnitude**; **direction is carried by the kind LABEL + glyph**, not an asserted ± number
  — because the balance engine is not a flat two-way sign: `current = earned − locked − spent` and **`distribute`
  does not affect `current`** (it draws the `toDistribute` ceiling) `[FACT: foundation/economy/balance.ts:22-25;
economy.ts:41 "sign implied by kind"]`. So labels are **Earned · Locked · Spent · Distributed**; a ± prefix would
  misrepresent `lock` (a hold) and `distribute`. **Every amount uses tabular figures** (the S2 `TABULAR` style
  `{ fontVariantNumeric: 'tabular-nums' }` `[FACT: currencies-mode.tsx:18,37]`) so ledger columns align.
- **BR-S5-4 (EC-11):** icons are **Lucide/SVG, never emoji** `[FACT: slice-map.md:69; CLAUDE.md:44]`. The kind
  glyph is **`aria-hidden`**; the kind **label** is the screen-reader text (color/glyph never the sole signal —
  BR-S5-6 made concrete).
- **BR-S5-8 (EC-8 "timestamped"):** each row shows an **absolute** concise date-time formatted with native
  **`Intl.DateTimeFormat`** — the established apps/web convention `[FACT: home-surface.tsx:36]`; **date-fns is used
  nowhere in apps/web** and is not in its dep graph, so the original date-fns mandate was drift (§XXVIII deviation,
  doc-resolved 2026-10-14). `Intl` is deterministic for a fixed `at`, so `?sample` stays Gate-stable. The underlying
  `at` (Unix ms) is the machine-readable value (SR-legible via the label). The **year is shown only for entries
  outside `now`'s year** (multi-year ledgers stay unambiguous; g2 #3). A relative hint ("2h ago", the in-unit
  `agoLabel` pattern `[FACT: gamification-overview.tsx:23]`) is OPTIONAL and at most secondary — not required.
- **BR-S5-5 (shell discipline):** the mode is the **mandated `CollectionView`** shell (title/count/8-state via
  `renderView`) + a `ListView` body + the pager in the body (NOT `onNewView` — that is SavedView-semantic), exactly
  mirroring S2 `[FACT: currencies-mode.tsx:129-157]`. No shell swap (the Victor-corrected ×3 discipline).
- **BR-S5-6 (presets):** correct under all presets incl. `game` light+dark; AA floor on every text pair; tier/kind
  color never the sole signal (kind also carries a label + a Lucide glyph).
- **BR-S5-7 (F-finding):** `F-S5-1` filed — ①-tier `listConsequences`/activity-ledger read is unbuilt
  (first-consumer-pull), outside ②; the live swap is one binding at the composition root (zero signature change).

## §3 Contract — the `ActivityEntry` type (grounded in the row; §4 of the per-slice contract)

```ts
// use-activity.ts — type-correct against the INTENDED ① read; data stubbed (IR-G1).
export interface ActivityEntry {
  id: string // consequence_ledger.id
  at: number // consequence_ledger.created_at (Unix ms) — the "timestamped" of EC-8
  kind: ConsequenceKind // 'earn' | 'lock' | 'spend' | 'distribute'  (@vida/types)
  amount: number // positive magnitude; sign implied by kind (BR-S5-3)
  currencyCode: string // consequence_ledger.currency_id (→ currencies.code)
  currencyName?: string // display, resolved via listCurrencies × the row (honest-absent ⇒ fall back to code)
  source: string // consequence_ledger.target_ref — the "across modules" origin, shown as a quiet chip
}

export interface ActivityData {
  entries: readonly ActivityEntry[] // the CURRENT page (page-sliced), newest first
  total: number
  page: { index: number; count: number }
  setPage: (i: number) => void
  state: InteractionState // 8-state → collapseToTerminal at the shell (S2 precedent)
  now: number // reference instant (sample = fixed, Gate-stable); CONSUMED to show the year
  // only for entries outside now's year (g2 #2/#3), and any future relative hint
}
export function useActivity(): ActivityData
```

Live swap (documented in-file, deferred): `useQuery(['gamification','activity', pageIndex], () =>
svc.listConsequences({ offset, limit: PAGE_SIZE }))` once F-S5-1 lands + a composition root exists.

## §4 Acceptance (the per-slice blocking gate — done-when)

1. `pnpm --filter @vida/web typecheck` = 0; `eslint` = 0.
2. Unit (`activity.test.tsx`): renders empty/loading/error/populated; reverse-chron order; pagination bounds
   (prev/next disabled at ends, page slice correct); signed-by-kind presentation; Lucide glyph per kind
   (`aria-hidden`); each row shows an **absolute date** (BR-S5-8) and the kind **label** as text; a11y names
   present. Full `@vida/web` suite stays green (was 540/540).
3. **Blocking real-browser Visual Gate** (Brave, the `?sample` surface, Activity tab): **both relevant presets ×
   light/dark × {desktop, 375}** — AA ≥ 4.5 on every text pair (incl. warm `game`-dark), kind glyph/label ≥ 3:1,
   **no horizontal overflow**, pager reachable, 8-state rendered. (EC-12 matrix.)
4. §XXIX currency: `apps/web/src/gamification/CLAUDE.md` + slice-map S5 ledger refreshed; committed WITH the code.
5. F-S5-1 recorded (delivery F-findings + the session log).

## §5 Implementation plan (files; strictly this order)

1. **`use-activity.ts`** — `ActivityEntry`/`ActivityData` (§3) + `useActivity()`: honest-empty default; `?sample`
   = a deterministic multi-page ledger (> 50 rows, mixed kinds/currencies/sources, descending `at`) for the Gate;
   `?force=loading|error`; reuse `PAGE_SIZE`/`collapseToTerminal`/`InteractionState` from the S2 conventions.
   In-file live-swap comment (the F-S5-1 seam).
2. **`activity-mode.tsx`** — `ActivityMode` default export: `CollectionView` (layout `'list'`, `layouts=['list']`,
   `onLayoutChange={()=>{}}`, `state=collapseToTerminal(data.state)`) → `renderView` a `ListView<ActivityEntry>`
   (flat, reverse-chron) → `ActivityRow` + the body `Pager` (S2's component shape) shown when `total > 0`. No
   `+ New` (Activity is read-only — history has no create affordance; honest, no dead buttons).
   **`ActivityRow` hierarchy** (§I — type carries the weight):
   - **Primary (`$body`):** the kind **label** + the **magnitude + currency** (e.g. "Earned · 120 XP"), amount in
     `TABULAR`; kind `aria-hidden` Lucide glyph leads (BR-S5-3/4). No asserted ± prefix.
   - **Secondary (`$caption` `$colorTextMuted`):** the **absolute date-time** (`Intl.DateTimeFormat`, BR-S5-8,
     `TABULAR`) + the `source` as a quiet chip ("across modules").
   - Amount color: **`$colorTextPrimary` for ALL amounts** (always-AA on every preset incl. `game`-dark, by
     construction — no risky accent token). Direction is carried by the kind **label** + the glyph — never by color
     or an asserted sign (BR-S5-3/6). `ListView` takes a **flat** `items={entries}` list
     `[FACT: list-view.stories.tsx:88]` (no `sections` — the approved flat reverse-chron default).
3. **`activity.test.tsx`** — the §4.2 cases.
4. **Wire** `gamification-surface.tsx` — replace the Activity `EmptyState` placeholder with `<ActivityMode/>`
   (the S2/S3/S4 wiring precedent); only the active panel mounts.
5. **Currency + F-finding + gate** per §4; then PR.

**Kind → presentation map (BR-S5-3, pure):** `earn` → `Plus`/additive · `distribute` → `Share2`/additive ·
`lock` → `Lock`/held · `spend` → `Minus`/subtractive. (Lucide; final glyph choice confirmable at implement — all
are shipped Lucide icons already used in the unit, e.g. `Lock`/`Plus` in S2.)

## §6 Open interpretations (for Approval 1)

- **[INTERP-A] Grouping.** EC-8 pins only "history; paginated" `[FACT: envision.md:30]` — no grouping mandated.
  **Proposed default: a flat reverse-chronological list** (literal EC-8, simplest, honest). Day-section headers
  (Today / Yesterday / date, via `ListView sections`) are a defensible scannability enhancement but are NOT
  required by any doc — I will NOT add them unless you want them (avoiding manufactured scope).
- **[INTERP-B] F-S5-1 shape.** The intended ①-read named `listConsequences({offset,limit})` → `ActivityEntry[]`
  - total. Named for the plan only; the actual ① signature lands when F-S5-1 is built (first-consumer-pull).
