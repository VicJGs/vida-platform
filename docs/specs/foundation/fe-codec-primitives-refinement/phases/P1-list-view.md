# P1 · list-view — refine + alive-hooks (forward spec)

> **Phase 1** of fe-codec-primitives-refinement (LIF-230). Profile: change-frontend-component · Entity Delivery Flow ②.
> §XXVI gate artifact (the PLAN). Acceptance oracle = `../mockups/views-refinement.html` (List plate) +
> `../mockups/views-alive-concept.html` (List "the one thing" + ambient rows). Status: **DRAFT → gate 1 (critique → Approval 1).**

## 0. Source model

Code-first (frontend-source-of-truth.md). Tokens/variants only; no hard-coded palette (brand values = M4/Figma).

## 1. Baseline (ground truth — `packages/ui/src/components/list-view.tsx`)

`ListView<T>` is the **UI-2 · V1 data-view spine**, purely **presentational + layout-only**:
`items · renderItem · getKey · state · empty? · error? · loadingCount · density · dividers · aria`. It owns the
`role="list"` container, `role="listitem"` **row wrappers**, density (between-row gap), optional hairline dividers,
skeleton rows, the 4 terminal states, the accessible name + LV-7 dev-warns. **It does NOT own row CONTENT** — the
consumer's `renderItem` renders each row (LV-5: an interactive row composes a Card inside renderItem).

## 2. The crux (the /contract boundary — resolve before building)

The mockups show refined ROWS (eyebrow group headers, accent tick, tabular meta, "the one thing" emphasis, ambient
signals). **Most of that is row CONTENT = the consumer's `renderItem`, NOT list-view's.** If we bake row styling into
list-view we break its generic spine. So the contract splits cleanly:

**list-view OWNS (this phase builds):**

- **L1 chrome polish** (internal, no API change): divider = a true hairline `$colorBorderDefault`; density rhythm
  confirmed against tokens; skeleton row treatment; empty/error via the existing `empty?`/`Message` (EmptyState composes
  through the slot — unchanged).
- **L2 §2a `sections?`** (NEW, optional, XOR with `items`): `sections?: { label: string; items: readonly T[] }[]` →
  renders an **eyebrow section header** (`$caption`, uppercase, tracked, `$colorTextMuted`) above each group's listitems.
  Mirrors board-view's pre-grouped model (consumer groups upstream; renderer never groups). Flat `items` stays the default.
- **L2 §2b `primaryKey?`** (NEW, optional): a **generic "featured row" emphasis affordance** — marks ONE listitem to
  wrap in an emphasis container (accent tint + accent left-tick) with an optional `primaryLabel?` eyebrow. **The
  "one thing" is the CONSUMER's semantic** (an agenda/Tasks surface decides what's featured); the primitive only ships a
  neutral "emphasize this row" affordance (also serves pinned/selected/featured). CONTENT stays renderItem's. [critique g1 fix: don't bake the "one-thing" semantic into a generic spine]
- **L2 §2c `activeKey?`** (NEW, optional): marks the active row → the **accent left-tick** treatment (the mockup's active row).

**CONSUMER OWNS (NOT this phase — composed in renderItem; documented as the pattern):**

- Row typography, the **ambient signal** (streak/drift/purpose dot/due), tabular trailing meta, the done-state — all are
  what `renderItem` returns. list-view exposes the structure; the row is the consumer's. _(This is why "List alive" is
  mostly a consumer pattern — honest scope, smaller primitive surface than the mockup implies.)_

## 3. Contract (the exact diff to `ListViewProps<T>`) — PREFLIGHT-GROUNDED

```
+ export interface ListSection<T> { id: string; title: ReactNode; items: readonly T[] }  // MIRRORS board's
+                                   // BoardGroup<T> [FACT: board-view.tsx:26-33] — one grouped shape across renderers
+ sections?: readonly ListSection<T>[]  // XOR `items`; grouped render + eyebrow headers (provider groups upstream, ADR-007 §3.3)
+ primaryKey?: string      // getKey of the FEATURED row → emphasis = accent left-tick + fontWeight (NO bg tint — no
+                          //   accent-surface token exists; stay token-pure/no palette churn). "one-thing" = consumer semantic.
+ primaryLabel?: string    // optional eyebrow above the featured row
+ activeKey?: string       // getKey of the active row → accent left-tick (Toast 3px-bar precedent [FACT: CLAUDE.md Toast])
```

Rules: `items` XOR `sections` (dev-warn if both, LV-7 style); `primaryKey`/`activeKey` matching no row = no-op + dev-warn;
all new treatment via **Tamagui variants + DIRECT semantic tokens** (NOT injected CSS — [FACT: CLAUDE.md Rules "prop-driven
state = variant"]; Menu `active` variant + card `interactive` variant precedent); dimensions via the token scale (DEF-U8-h).
React-19 ref-prop + `ViewState` union unchanged.

## 4. Acceptance

- **Visual Gate (blocking):** Brave, full matrix **3 presets × light/dark × 3 densities** — list renders; eyebrow
  section headers; primary emphasis (accent tint + tick + eyebrow); active tick; hairline dividers; skeleton; empty via
  slot. **Full-matrix AA** on every text pair incl. warm-dark (muted ≥ 4.5). 375 no-overflow. Matches the mockup oracle.
- **a11y (grouped pattern RESOLVED at preflight — the board model, rotated vertical):** flat `items` = the current
  single `role="list"` [FACT: list-view.tsx:130], unchanged. `sections` mode = an outer **`role="group"`** (named by the
  list's aria-label/labelledby) containing, per section: an **eyebrow header `Text` with a `useId`-prefixed `id`** + a
  **`role="list"` `aria-labelledby`=that id**, each section's role via **`resolveDataViewState`** (per-section empty →
  `role="status"`). This is exactly board-view's column model [FACT: board-view.tsx:137,193,199,204-221] — reuse, don't
  re-solve. axe 0. primary/active = visual-only (no false `aria-selected`). accessible name + LV-7 warns intact.
- **Tests:** sections render + header text; primaryKey/activeKey apply to the right row + no-op+warn on miss; items⊕sections
  XOR warn; existing list-view tests green. `@vida/ui` suite green; tsc 0; eslint 0.
- **§XXIX currency:** `packages/ui/src/CLAUDE.md` (list-view paragraph: +sections/primary/active) + the v1-list-view spec.

## 4a. Preflight + gate-2 critique (grounded in code; 2026-10-05)

Every spec claim verified against the repo — SOUND, no blockers. Resolutions folded above:

- **F1** `sections` shape → `ListSection<T> = {id, title, items}`, mirrors `BoardGroup<T>` [FACT: board-view.tsx:26-33] (one grouped shape across renderers; not the earlier `{label}`).
- **F2** grouped a11y = the board model (outer `role="group"` + per-section eyebrow-`id`'d `role="list"` + `resolveDataViewState`) [FACT: board-view.tsx:193-221] — reuse, don't invent.
- **F3** primary/active emphasis = **accent left-tick** (Toast 3px-bar precedent [FACT: CLAUDE.md Toast]) + fontWeight/eyebrow — **NO bg tint** (no accent-surface token exists → no palette churn; the mockup's `color-mix` tint was a mock-only shortcut).
- **F4** all emphasis via Tamagui **variant**, not injected CSS [FACT: CLAUDE.md Rules; Menu/card variant precedent].
- **F5** per-section empty reuses `resolveDataViewState` (the board per-column-empty precedent [FACT: board-view.tsx:203-209]).
- Preserved: LV-6 no-motion, LV-7 warns, density scale `$8/$12/$24` [FACT: list-view.tsx:59-62], state-as-prop (BR-2).
  Gate-2 /critique: SHIP (the mock→spec delta — tint dropped, shape aligned to board — is the only correction; scope is bounded + consistent with the 7-renderer family).

## 5. Implementation prompt

Types-first: extend `ListViewProps<T>` (§3) in `list-view.tsx`. Add a `SectionHeader` styled host (eyebrow) + a
`primary`/`active` variant on `ListRow` (accent tint + 3px accent left-tick via a variant, NOT injected CSS). Branch the
body: `sections` → map groups (header + listitems) else `items` (flat, current). Thread `primaryKey`/`activeKey` into the
row map (compare `getKey(item,i)`), apply the variant + optional primary eyebrow. Keep the terminal-state switch + spine
intact. Update `.stories.tsx` with: grouped, primary, active, + the full-matrix Visual-Gate cells. Update tests + currency.
Consumer-row patterns (ambient signal etc.) documented in the CLAUDE.md note as "composed in renderItem", not built here.
