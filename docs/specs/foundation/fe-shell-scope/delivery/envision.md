# fe-shell-scope — ENVISION GATE (Entity Delivery Flow · Step 1.5)

> **Trigger test (§3.75): FIRED** — the `Spaces:` scope selector is a *novel switcher* whose UI answer isn't obvious
> from any shipped surface. The 6 re-homed surfaces alone would SKIP; the selector + the Bar-1 placement decision
> fire it.
> **Direction (AskUserQuestion, Step 1.5):** *Both — responsive split* (persistent condensed Bar 1 in the top strip
> + expanded form in the System panel). ADR-006 amendment → **homed forward** (tracked follow-up).
> **Greybox:** `apps/web/src/__envision__/shell-scope.tsx` + route `/__envision/shell-scope` — THROWAWAY, deleted
> after this gate. Evidence: `/tmp/vg-shell-scope/*.png` (light 1440/768/375 · scope open/loading/empty/error · dark).

---

## Anchored checkpoints (EC-n)

Each is tagged `structural` (greybox-provable → MUST map to ≥1 slice at Decomposition + is a Visual-Gate MUST) or
`feel` (deferred to the live per-slice Visual Gate). Screens: **A** = condensed top strip (mobile), **B** = full top
strip (tablet+), **C** = expanded System panel body.

| EC | Type | Checkpoint | Anchor |
|----|------|-----------|--------|
| **EC-1** | structural | **Scope selector = a persistent control** in the top strip showing the active scope (`Spaces: <name>`, or **All** = global/NULL), opening a list of spaces **+ All**. | A·B · `scope-open` |
| **EC-2** | structural | **Scope read degrades, never crashes:** empty space-list → disabled `Spaces: All` (global-only); loading → busy trigger; error → calm `offline` + global fallback (`role=status`, no throw). | `loading`·`empty`·`error` |
| **EC-3** | structural | **6 global surfaces in the strip:** FULL (≥768) = all as icon-nav; CONDENSED (≤375) = Search + overflow. **Search is the ⌘K action, never a link.** `aria-current` marks the active surface. | A·B |
| **EC-4** | structural | **System panel expanded body** = scope (prominent) + the 6 surfaces as a **labeled nav list** (icon + label; ⌘K hint on Search) + an **account** affordance. | C |
| **EC-5** | structural | **Bar 1 lives in BOTH homes** (the responsive-split decision): persistent condensed chrome in the top strip (`bar1Slot`) + the expanded form in the System panel body. | A·B·C |
| **EC-6** | structural | **Active-surface distinction:** brand-tinted icon in the strip; brand icon + `$colorSurfaceSecondary` row in the panel. | B·C (`active:*`) |
| **EC-7** | feel | Reads as a scope **switcher** (not a filter/tag); CODEC voice — serif wordmark, token tints, scope trigger as a calm secondary control. | live gate |
| **EC-8** | feel | **Full-matrix AA incl. warm-dark** on the scope trigger + the tinted active-surface row (the known warm-dark tight constraint). | live gate |

## Non-checkpoint notes (carried to Decomposition)
- **N-a (IR3):** scope state is **emit-to-seam** — selecting a scope SETS global state but drives no live view in
  M1.0 (ViewProviderRegistry ships empty). The selector is honest: it switches scope, it does not fake a filtered view.
- **N-b (D7/IR2):** the space-list source is a `ProviderRead` **stub** (no `listSpaces` yet); the System-panel body
  injection needs a new seam (prop or map) — both resolved in `seam-contract.md`.
- **N-c (D9):** the ADR-006 amendment (formalize the global-scope selector surface) is a tracked follow-up, not built
  here.
- **Out of scope:** space **create/edit/CRUD** → `fe-spaces-page` #20 (IR7). The Modules panel body (module nav) is a
  separate re-home, not #15.

## Gate
**APPROVED by Victor (2026-10-10)** — greybox + EC-1…EC-8 ratified as-is. Greybox + throwaway route DELETED.
Proceed to Decomposition (Step 2): every `structural` EC (EC-1…EC-6) maps to ≥1 slice; `feel` EC-7/EC-8 defer to
the live per-slice Visual Gate.

### Re-pin (Victor, 2026-10-26 — notes-rescope Re-scope Gate)
- **EC-4** → System panel expanded body = scope + the 6 surfaces **+ Trash** (the OS-wide Trash, notes-rescope EC-27) as a labeled nav list (icon + label; ⌘K hint on Search) + account. **EC-3 unchanged:** the strip keeps its 6 icons at ≥768; at ≤375 Trash is reached via the overflow / System panel. Source: `docs/features/notes-and-pages/delivery/slice-map.md` §Approval.
