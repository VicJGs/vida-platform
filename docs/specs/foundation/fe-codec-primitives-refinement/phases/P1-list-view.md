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
  what `renderItem` returns. list-view exposes the structure; the row is the consumer's. *(This is why "List alive" is
  mostly a consumer pattern — honest scope, smaller primitive surface than the mockup implies.)*

## 3. Contract (the exact diff to `ListViewProps<T>`)
```
+ sections?: readonly { label: string; items: readonly T[] }[]  // XOR items; grouped render + eyebrow headers
+ primaryKey?: string            // getKey value of the lifted "one thing"; emphasis affordance
+ primaryLabel?: string          // optional eyebrow above the primary row (e.g. "The one thing")
+ activeKey?: string             // getKey value of the active row; accent left-tick
```
Rules: `items` XOR `sections` (dev-warn if both); `primaryKey`/`activeKey` that match no row = no-op (dev-warn);
grouping preserves the state-dependent role + LV-7 warns per the spine; all new treatment via **variants + DIRECT
semantic tokens** (no injected CSS, DEF-U8-h for dimensions). React-19 ref-prop unchanged. `ViewState` union unchanged.

## 4. Acceptance
- **Visual Gate (blocking):** Brave, full matrix **3 presets × light/dark × 3 densities** — list renders; eyebrow
  section headers; primary emphasis (accent tint + tick + eyebrow); active tick; hairline dividers; skeleton; empty via
  slot. **Full-matrix AA** on every text pair incl. warm-dark (muted ≥ 4.5). 375 no-overflow. Matches the mockup oracle.
- **a11y:** axe 0; **grouped-list pattern finalized at /preflight** (candidate: `role=list` of `role=group`s, each
  `aria-labelledby` its eyebrow header — vs separate labelled lists; pick the axe-clean one); primary/active are
  visual-only (no false ARIA — not aria-selected unless the consumer owns a selection semantic); accessible name
  preserved; LV-7 warns intact. [critique g1: nail the grouped a11y at preflight]
- **Tests:** sections render + header text; primaryKey/activeKey apply to the right row + no-op+warn on miss; items⊕sections
  XOR warn; existing list-view tests green. `@vida/ui` suite green; tsc 0; eslint 0.
- **§XXIX currency:** `packages/ui/src/CLAUDE.md` (list-view paragraph: +sections/primary/active) + the v1-list-view spec.

## 5. Implementation prompt
Types-first: extend `ListViewProps<T>` (§3) in `list-view.tsx`. Add a `SectionHeader` styled host (eyebrow) + a
`primary`/`active` variant on `ListRow` (accent tint + 3px accent left-tick via a variant, NOT injected CSS). Branch the
body: `sections` → map groups (header + listitems) else `items` (flat, current). Thread `primaryKey`/`activeKey` into the
row map (compare `getKey(item,i)`), apply the variant + optional primary eyebrow. Keep the terminal-state switch + spine
intact. Update `.stories.tsx` with: grouped, primary, active, + the full-matrix Visual-Gate cells. Update tests + currency.
Consumer-row patterns (ambient signal etc.) documented in the CLAUDE.md note as "composed in renderItem", not built here.
