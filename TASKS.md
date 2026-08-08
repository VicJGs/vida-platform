# TASKS.md — Active Work in vida-platform
# Claude: read this at EVERY session start.
# Updated by: /task-new, /task-switch, /task-complete, /session-log

## ⚡ In Progress

| Task | Profile | Created | Updated | Status |
|------|---------|---------|---------|--------|
| ui-1-vida-ui-primitives (LIF-86) | Design System | 2026-08-06 | 2026-08-08 | 🔨 IN PROGRESS — M1.0 `#27`, per-component gate. **U0 (harness) + U1 (Button) + U2 (Input) + U3 (Checkbox) + U4 (Select) + U5 (Card) + U6 (Tabs) + U7 (Menu) DONE + Visual-Gate PASS** (7/10); branch `ui-1-vida-ui-primitives` (NOT merged). Next = **U8 Dialog** (first overlay/organism), then U9 Popover · U10 Toast + UF final gate/PR. |
| db-10-seed-and-fixtures (LIF-62) | Add Backend Component | 2026-07-31 | 2026-08-01 | ⏸ PARKED — now correctly homed at **M1 / M1.4** with its REAL dependency (← all 26 modules) encoded in Linear (DF-1 fixed). Un-parks when its milestone (M1.4) is reached in the build order. |
| delivery-structure-reconstruction | Project Foundation | 2026-07-31 | 2026-08-01 | ✅ DONE (2026-08-01) — reconstructed to ADR-016 (Initiative→Project→Milestone→Issue); LIVE Linear project-first M1–M4, 91 issues, 0 deferred edges, db-10 ← all 26 modules. Output: `reconstructed-structure.md`. |

## 🧭 Delivery Routing — READ THIS FIRST (this repo's routing rule)

> **The authoritative next-head selector for this repo is the `#` GLOBAL BUILD ORDER in
> `docs/specs/foundation/delivery-structure-reconstruction/reconstructed-structure.md` — NOT `tracker_sync --next`.**

This repo has a hand-authored, cross-milestone topological order (the `#` column, DF-10). It was created
*because* `--next` had no global order and kept mis-picking heads. So, at **every `/begin`**, for THIS repo:

1. **Compute the head from `#` order.** Walk `reconstructed-structure.md`'s `#` column ascending; the next head
   is the **lowest-`#`** issue that is (a) NOT done, (b) NOT a `〰` stream row, (c) has **all blockers done**.
2. **`tracker_sync --next` is ADVISORY only.** Its `order_nodes` tie-breaks the ready set by *direct-dependent
   count* (`tracker_sync.py:1108`) — a different (also-valid) topo tie-break, so it routinely names a
   higher-`#` issue (e.g. UX-3 #23 over AR-8 #14). **When `--next` and the `#` order disagree, the `#` order
   wins.** Use `--next` only to (a) get the *ready set* and (b) flag divergence. See
   [[doc-order-authoritative-over-next-heuristic]].
3. **DF-3 invariant — audit before trusting `--next`:** every task-file `blocked by` edge MUST point to a
   LOWER `#`. A higher-`#` edge is a bug — it silently drops the true head from `--next`'s ready set (this is
   exactly what a stale `AR-8 ← db-8-fts5-search` [#14 ← #60] edge did, hiding AR-8 and surfacing AR-9 wrongly).
   Fix the edge; don't route around it.
4. **The "Next session" note below is a convenience, not the source.** If it ever disagrees with the computed
   `#`-order head, the `#` order wins.

**🎯 Computed head now (2026-08-05 · AR-8 #14 DONE): `AR-9` `#15` (LIF-80) — Sync scaffolding (no-flush).**
Lowest-`#` ready non-stream issue: ← DB-6 ✅. `--next` says UX-3 (#23) by dependent-count — overridden by the `#`
rule. Profile: **Add Backend Component**. (AR-8 closed with the backlink resolver; its other named pieces —
graph→AR-6 Views+UI-2, export→UI-3, search→DB-8 — are homed elsewhere in the plan, not AR-8 builds.) *(Toolkit follow-up filed: generalize a declared global-order tie-break into
`tracker_sync` so `--next` can be correct in any repo — see `~/dev-toolkit/.claude/tasks/`.)*
> NB: the tracker reads task-file `blocked by` edges, **not** Linear blocker relations (it syncs status/identity
> only) — so reconciling an edge never needs a Linear change.

---

## 🧭 Next session

**▶ CURRENT (2026-08-08) — UI-1: …U6 Tabs + U7 Menu shipped, Visual-Gate PASS (7/10).**
U7 Menu (4th/last molecular — 2nd FLOATING primitive) built to `menu.md`: reuses U4 Select's portal + single-`top`
positioning + dismiss handlers, but the WAI-ARIA **menu-button** model — trigger `role=button`+`aria-haspopup=menu`+
`aria-expanded`; `role="menu"` panel portalled to body under `<Theme name="Menu">`; items `role="menuitem"` with
**ROVING DOM FOCUS** (only the active item `tabIndex=0`, real `.focus()`; NOT Select's `aria-activedescendant`), Esc
returns focus to the trigger. `trigger` is a consumer SLOT wired via **`cloneElement`** (aria + composed handlers +
merged ref — React 19 `props.ref`). 4 placements (start/end align + vertical flip), wrapping arrow nav, type-ahead.
Danger = an `intent` variant on the **label** `<Text>` (not the row); highlight = an `active`-state variant (NOT
`:focus-visible`, racy for programmatic focus); empty = a disabled "No actions" `menuitem`. §XXVI double-gate: **Gate 1**
independent critique REVISE (**1 blocker** [danger colour on the wrong element] + **4 material** [`:focus-visible`
highlight racy → active-state variant; click-open didn't seed activeIndex; empty-row aria-hidden axe risk; row-layout
omitted] + 3 minor) → all fixed (Rev 3) → Approval 1; preflight PASSED (1 fold: trigger Enter/Space `preventDefault` vs
native-button double-fire) + gate-2 SHIP → Approval 2. **Visual Gate PASS measured in real Brave** (flip/colour
unverifiable in jsdom): B12 `transition: opacity+transform 0.15s out` ONLY; danger `rgb(239,68,68)` distinct; roving
highlight on the active item; disabled skipped by ↑/↓; Esc→trigger; `bottom-end` right-aligns; `top-start` opens UP +
flips when clipped; empty row; both themes. **No pipeline touch** (`light_/dark_Menu` already generated by DS-5).
typecheck 2/2 · @vida/ui **160/160** (24 new) · build + build-storybook ✓ · root 10/10. **Impl bug jsdom caught:**
portal open commits TWICE (pos null first) → focus/refine layout effects must dep on `pos`/`entered`
([[portal-open-focus-needs-a-mount-gated-effect-dep]], carries to U8/U9). **NEXT = U8 Dialog** (`dialog.md`; first
overlay/organism — focus TRAP + scrim + `zIndex.overlay`/`modal`), then U9 Popover · U10 Toast · UF final gate + PR.
Branch `ui-1-vida-ui-primitives` (NOT merged).

<details><summary>(prior) 2026-08-08 — UI-1: U0–U6 (…Tabs) shipped, Visual-Gate PASS (6/10).</summary>

**▶ (prior) — U6 Tabs (3rd molecular — the B12 showcase)** built to `tabs.md`: a `role="tablist"` of `render:'button'`
tabs (roving tabindex, AUTOMATIC activation, arrows WRAP + skip disabled, Home/End) + a selection **indicator** whose
**transform** animates (250/inOut) while its **width/height resize is an INSTANT inline swap** (B12 asymmetry). Panels =
compound **`<Tabs.Panel value>`** children (DEF-U6-a); only the active panel mounts. Gate 1 REVISE (2 blockers + 3
material + 4 minor) → fixed → Approval 1; preflight PASSED + gate-2 SHIP → Approval 2. **Visual Gate PASS in real Brave**:
indicator `translateX(0)→(118px)` + width 118→83, `transition: transform 0.25s inOut` ONLY (B12); both themes. @vida/ui
**136/136** (23 new).
</details>

<details><summary>(prior) 2026-08-08 — UI-1: U0–U5 (…Card) shipped, Visual-Gate PASS (5/10).</summary>

**▶ (prior) CURRENT (2026-08-08) — UI-1: U0 + U1 Button + U2 Input + U3 Checkbox + U4 Select + U5 Card shipped, Visual-Gate PASS (5/10).**
U5 Card (2nd molecular — a STATIC container, no floating layer) built to `card.md`: a `<div>` (`role="group"` |
`role="button"` + hand-rolled Enter-keydown/Space-keyup when `interactive`; NEVER a native `<button>` — it can't
legally contain the focusable `actions`/`footer`). **Slot composition** (header `<header>` + actions top-right · body ·
footer `<footer>`) + **elevation = opacity of a raised-shadow overlay (B12)**; the resting shadow **self-cancels in
dark** (its colour = the dark surface) so the border carries dark elevation (design §V) — no theme detection. §XXVI
double-gate: independent critique **REVISE (2 blockers + 4 material)** all fixed → Approval 1; preflight PASSED
(currency-doc gap folded in) + gate-2 SHIP → Approval 2. **B1**: `var(--shadow-*)` never resolved (shadow was AUX/
CSS-only/unwired) → added typed **`shadow.ts`** (`vida/shadow` format, the `motion.ts` precedent, DEF-U5-e). **§XXVIII
deviation:** contract authors **no `loading` prop** → shipped verbatim, loading/empty are consumer-composed (DEF-U5-f).
typecheck 2/2 · @vida/ui **113/113** · build + build-storybook ✓ · root 10/10. **NEXT = U6 Tabs** (`tabs.md`; 3rd
molecular), then U7 Menu · U8–U10 overlays · UF final gate + PR. Branch `ui-1-vida-ui-primitives` (NOT merged).

</details>

<details><summary>(prior) 2026-08-08 — UI-1: U0–U4 (…Select) shipped, Visual-Gate PASS (4/10).</summary>

**▶ (prior) CURRENT (2026-08-08) — UI-1: U0 + U1 Button + U2 Input + U3 Checkbox + U4 Select shipped, Visual-Gate PASS (4/10).**
U4 Select (first molecular + first floating primitive) built to `select.md` on `@tamagui/core` (hand-build-on-core vs
Tamagui-kit was a drift Victor corrected — [[dont-manufacture-an-architecture-fork-the-pattern-already-answers]]):
`<button role=combobox>` + listbox panel portalled to `document.body` (react-dom `createPortal`, `zIndex.dropdown`,
re-wrapped `<Theme name="Select">` so the sub-theme crosses the portal); WAI-ARIA 1.2 select-only (focus stays on
trigger via `aria-activedescendant`), full keyboard + type-ahead, flip-up + h-clamp, close-on-capture-scroll. §XXVI
double-gate (independent critique REVISE→12 findings fixed → Approval 1; preflight PASSED → Approval 2). **Visual Gate
caught 2 bugs** typecheck+92-tests missed: flip mixed top+bottom (Tamagui stale inline `top`) → single-`top`; text
clipped to a 1.5px line box — **createFont fed lineHeight RATIOS as px**, latent on ALL primitives, fixed ratio→px in
`tamagui.config.ts` (**DEF-U4-e**, [[tamagui-createfont-lineheight-ratio-is-px]]), Button/Checkbox re-verified.
typecheck 2/2 · @vida/ui **92/92** · build + build-storybook ✓ · root 10/10.
</details>

<details><summary>(prior) 2026-08-07 — UI-1: U0 + U1 (Button) + U2 (Input) + U3 (Checkbox) shipped, Visual-Gate PASS.</summary>

**▶ (prior) CURRENT (2026-08-07) — UI-1: U0 + U1 (Button) + U2 (Input) shipped, Visual-Gate PASS.**
UI-1 (`#27`, LIF-86, Design System) is under way, gated per component on branch `ui-1-vida-ui-primitives` (NOT merged):
**U0** stood up the component Visual-Gate harness (Storybook 9.1.20 + react-vite + addon-a11y); **U1 Button** built to
`button.md`; **U2 Input** built to `input.md` — frame + inner `render:'input'`, leading/trailing slots, all 8 states
(error/empty live), `forwardRef`→HTMLInputElement, `InputProps`; registered `light_/dark_Input` in `tamagui.config.ts`.
typecheck 2/2 · @vida/ui **51/51** · root 10/10 · build+build-storybook ✓ · **Visual Gate PASS**. **Lessons locked
for U3–U10:** (1) never Tamagui `group` on a content-hugging primitive ([[tamagui-group-breaks-content-width]]);
(2) the Visual Gate = *looking at the render*; (3) **the deliverable is what the DOCS specify — not my discretion**:
`:focus-visible` was mandated (input.md:37,55 + §VIII), a `:focus-within` shortcut was wrong; delivered the documented
selector via `.frame:has(input:focus-visible)`; (4) for uncertain Tamagui behavior, **measure in-browser + probe the
compiled CSS** (`placeholderTextColor` isn't consumed on a core `render:'input'` → injected `::placeholder` reading the
real `--placeholder` theme var). **NEXT = U3 Checkbox** (`checkbox.md`; `light_/dark_Checkbox` sub-theme: backgroundChecked
/border/borderError/checkmark/radius), then U4 Select…U10 Toast · UF final gate + PR.
Still-open (DS-2 brand-pass, not UI-1's): dark-mode overlay direction; filled-`danger` AA gap.
</details>

<details><summary>(prior) 2026-08-05 — AR-9 + DS-5 shipped; UI-1 was next head.</summary>

**▶ (prior) CURRENT (2026-08-05) — AR-9 (#15, LIF-80) DONE + DS-5 (#20, LIF-85) DELIVERED. Next head = UI-1 (#27).**
Session shipped three units, all merged to `main` (`5a9e0f9`): **AR-9** (`#15`, LIF-80 → Done, PR #4) — no-flush sync
stub skeleton in `core/src/sync/*` (seams throw `SyncNotActivated`); **F003** (PR #5) — DS-1 emitter fix so
component sub-themes dark-resolve (`light.<k>`/`dark.<k>` per DS-1:113); **DS-5** (`#20`, LIF-85 → In Progress, PR #7)
— 10 primitive contracts + the full `component.json` component-token set (refs into DS-2 semantics). DS-5 authors
references + contracts, **no built components and no token Visual Gate** (that's UI-1's, per the render table).
Note: `#16–19` (DS-1..DS-4) done; `#14` AR-8 done. **NEXT HEAD = UI-1 `#27` (LIF-86)** — Vida UI primitives, ← DS-5,
Design System / Add-Frontend-Component: build the components against DS-5's contracts; carries the component **Visual
Gate** (Storybook, 8 states) + registering the 9 new `light_/dark_<Comp>` sub-themes in `tamagui.config.ts` (fenced
to UI-1 by DS-5). Contracts to implement: `docs/specs/components/ds-5-primitive-contracts/`.
</details>

<details><summary>(prior) 2026-08-04 — QA-1 shipped + delivery-routing reconciled.</summary>

**▶ (prior) 2026-08-04 — QA-1 shipped (PR #3 → main). Delivery-routing reconciled.**
This session: fixed the recurring `--next` vs `#`-order conflict. Root cause = the tracker tie-breaks by
dependent-count (permanent, structural) + a stale illegal `AR-8 ← db-8` edge (#14←#60, DF-3 violation) that hid
the true head. Reconciled: AR-8 edge fixed (search → DB-8 stream, not a whole-issue block), 5 stale doc glyphs
refreshed (QA-1/AR-7/DS-3/DS-4/UX-1 → ✅), the `## 🧭 Delivery Routing` rule above added, glyph-snapshot caveat
added to the doc.
</details>

<details><summary>(prior) 2026-08-03 — DS-4 (Tamagui config + dark mode) DONE.</summary>

**▶ (prior) CURRENT (2026-08-03) — DS-4 (Tamagui config + dark mode) DONE.**
`packages/ui/src/tamagui.config.ts` composes the generated DS-1→DS-3 outputs into `createTamagui` (createTokens +
2× createFont [role keys + `$true` default] + light/dark + createAnimations) + `provider.tsx` (UIProvider/
useVidaTheme) + ambient `tamagui.d.ts` augmentation. **Animation driver = `@tamagui/animations-css`** per ADR-001 §9
(CSS-on-web + no-extra-dep; consumes motion.ts duration+easing losslessly). **First unit to COMPOSE the tokens**
(crossed DS-1's ⊥ DS-4). @vida/ui **30/30 · typecheck 10/10** · imports at runtime with NO react-native-web.
**Frontend Visual Gate PASS** (composed light｜dark theme surface). §XXIX: token-pipeline deferrals resolved +
`packages/ui/src/CLAUDE.md` layer-doc. ⚠ **Mid-build RN-driver drift triaged (STRUCTURAL) + corrected**
(`@tamagui/animations-react-native` → CSS; diagnosis `docs/specs/fixes/ds-4-rn-driver-drift/`).
**NEXT HEAD = QA-1 (Playwright + OPFS E2E harness, LIF-103)** — chosen 2026-08-03 by **strict `#` global build
order** (`reconstructed-structure.md:21` DF-10): QA-1 is `#8`, the lowest-`#` not-done ready issue (← AR-2 ✅),
ahead of AR-8 (#14), AR-9 (#15), and DS-5 (#20). Profile: **Add Backend Component** (fixed, DF-8). The earlier
"DS-5 next head" note was `TASKS.md` prose (Design-System track-continuity), NOT the authoritative order — superseded.
DS-5 (#20, ← DS-4 ✅) remains ready and is the head whenever the DS track is advanced next. DS-4 is committed +
merged (PR #2 → `main` @ 7e54176) — the prior "NOT committed" note was stale.
</details>

<details><summary>(prior) 2026-08-03 — DS-3 (Motion foundation) DONE.</summary>

**▶ (2026-08-03) — DS-3 (Motion foundation) DONE.**
Motion primitives shipped: `duration` (instant 0/fast 150/moderate 250/slow 400, unitless ms) + `easing`
(out/in/inOut cubic-beziers + linear) added as a **third aux consumer** — `AUX` factored
`[...TYPOGRAPHY, 'shadow', ...MOTION]`, `vida/fonts` narrowed to typography (fonts↔motion leak closed by
construction), new `vida/motion` format → `motion.ts`, index re-export, B11/B12. Values trace to
`standards/motion.md §IX`. **@vida/ui 26/26 · root typecheck 10/10 · deterministic.** 2 critiques (plan
REVISE→5 fixed; post-impl SHIP) + live-smoke render fix + Victor's Visual-Gate fix (`instant` static, not a
1ms flicker-loop). **Frontend Visual Gate PASS** (2nd run; standard-derived, not a placeholder). §XXIX docs
promoted. Spec `docs/specs/components/ds-3-motion-foundation/` (implemented). LIF-83 → Done.
**NEXT HEAD = DS-4 (Tamagui config + dark mode)** — `reconstructed-structure` #19, ← DS-3, Design System
(consumes `fonts.ts`→createFont + `motion.ts`→createAnimations; owns the dark-mode mechanism + CSS-var/unit
reconciliation deferred through DS-1→DS-3). ✅ **Merged + pushed to `origin/main`** (`8f9cbe2`, --no-ff of branch
`ds-3-motion-foundation`); re-verified green on merged main (26/26 · typecheck 10/10); branch deleted.
</details>

<details><summary>(prior) 2026-08-03 — DS-2 (foundations) DONE + two frontend gates stood up.</summary>

**▶ (2026-08-03) — DS-2 (foundations) DONE + two frontend gates stood up.**
Built DS-2's real foundation token VALUES + 2 pipeline extensions (aux namespaces font*/shadow → CSS+`fonts.ts`,
skipped from createTokens [B9]; `semantic.dark.json` parallel dark overlay [B7]) + B8 4pt-grid + `source`→3-file
list. Indigo/slate/emerald **placeholder** palette (⚠ NOT Vida's brand — [[ds-2-palette-is-provisional-placeholder]]),
7-size type scale (Space Grotesk/Inter), radius/shadow. `@vida/ui` **20/20** · root typecheck **10/10** · Frontend
Visual Gate **PASS (provisional)**. LIF-82 → Done.

This session ALSO produced two durable foundation artifacts (before more build loops):
- **`docs/specs/foundation/frontend-source-of-truth.md`** — the source-of-truth planning layer (code-first interim;
  Figma-later via MCP scripter, NOT Tokens Studio; release-gated M4 P2-⑦) + mechanical guard `pnpm check:frontend-source-model`.
- **`docs/specs/foundation/frontend-visual-gate.md`** — the visual gate (preflight → critique → `pnpm preview:tokens`
  render → Victor's visual approval) for all visual frontend issues.

**NEXT HEAD = DS-3 (Motion foundation)**, per `reconstructed-structure.md` #18 (← DS-2). Stay in **Design System**
(DS-3→DS-4→DS-5→UI-1). DS-3 is a visual issue → runs the Frontend Visual Gate. ⚠ NOT committed — DS-2 + both gate artifacts are on the
working tree of **`main`**; per convention, branch first before committing/PR.
</details>

<details><summary>(prior) 2026-08-01 — delivery structure reconstructed + live</summary>

**DELIVERY STRUCTURE RECONSTRUCTED + LIVE; BACK TO THE BUILD LOOP.**
The reconstruction is DONE (Phase V): Linear is re-organized to ADR-016 (Initiative→Project M1–M4→Milestone→Issue),
91 issues, 0 deferred edges, db-10 fixed (← all 26 modules). Committed on branch `phase-v-delivery-reconstruction`
(ff35a6f) — merge to main + push when ready. Toolkit Phase-T @ ~/dev-toolkit (4b31176 + 02ab9ea).
- **The loop is LIVE:** `tracker_sync --next` → **`ux-1-information-architecture`** (M1/M1.0 root, 9 ready · 66 blocked).
  Trust `--next` — the frontier is real again.
- **FIRST STEP next session (2-min, before trusting `--census`):** retire/replace the stale `docs/roadmap/m1.0-delivery-plan.md`
  with `reconstructed-structure.md` as the census home-source (else `--census` shows old milestone names like "Substrates";
  `--next` is unaffected). Then resume the per-issue build gate on the computed head.
- Db-10 un-parks when its milestone (M1.4) is reached in build order. Manual Linear hygiene: DONE (Victor, 2026-08-01).

<details><summary>(prior) 2026-07-31 — reconstruction kickoff context</summary>

**DELIVERY STRUCTURE UNDER RECONSTRUCTION.** The db-10 triage escalated STRUCTURAL: the
whole **Project > Milestone > Issue** setup is malformed at its core (db-10 is a symptom — mis-homed to M1.0 with an
unencoded "needs the whole OS" dep; see the harvest DF register). We STOPPED building and switched to **Project
Foundation** (NEW scenario `delivery-structure-reconstruction`). **Step 1 (harvest draft) is DONE:**
`docs/specs/foundation/delivery-structure-reconstruction/intent-and-provenance-harvest.md` — the grounded,
fully-cited organization of PROJECT → MILESTONES M1–M4 → all deliverables (repo-home + ADR + docs + relationship
layer) + legacy/migration provenance + DF-1…DF-9.
- **NEXT:** /begin → resume the reconstruction. Victor confirms (1) milestone framing INT-1..4→M1..4, (2) module-row
  granularity → then RECONSTRUCT the real structure (granular issues, file-deliverables matching repo/architecture/
  docs, corrected relationships + outcomes, no orphans).
- **⚠ DO NOT trust `--next` / build any M1.0 head until the reconstruction lands** — the delivery-plan/tracker encode
  the malformed structure (that is what surfaced db-10 wrongly). The loop is sound; its input graph is not.
- db-10 PARKED (un-parks when re-homed). The 9 built units + 20 ADRs are immutable/preserved.
</details>
</details>

---

**▶ (prior) CURRENT (2026-07-30).** Done = ar-1/db-1/ar-2/db-6/db-9/ar-5/ar-6/db-7/**ar-4** (9 of 30). ar-4 committed on
branch `ar-4-state-routing-forms` @ 955a255 (NOT merged/pushed yet). Prior spine pushed to origin/main @ 60a0a60.

**▶ NEXT — RE-COMPUTE the head via `tracker_sync.py --next`** (do not hand-read). After ar-4, the parallel-ready
alts flagged were **db-10** (dogfood seed ← db-6/db-7/db-9 — now all ✅) and **qa-1** (Playwright+OPFS E2E ← ar-2).
AR-4 unblocks UI-3 (editor, ← ui-1+ar-4) and UI-4 (app shell) once their other blockers land. Profile per head.
⚠ First `/begin` next session: merge/push the `ar-4-state-routing-forms` branch, then run `--next`.

✅ **Item 1 DONE — the delivery-planning loop is built + merged** (in `~/dev-toolkit`, ADR-015): the `--next` re-plan
grew into the legacy-aware, hierarchical, file-traceable loop — `tracker_sync --census` / `--next` / `--plan <scope>`
+ begin/delivery-plan/§XXX wiring. 4 units, 6 independent critiques, 25 tests, live-verified (`--next`→db-7). The
loop now COMPUTES the frontier from this plan (dep-graph + `_clusters.md` milestones + statuses) with a per-node
progress + legacy digest — hand-deriving the frontier is retired. See the delivery-plan §4 Consumption Rule.
✅ **Branch cleanup DONE** (merged branches deleted incl. `fix-tracker-sync-dedup-guard`).

**✅ ar-4 DONE (2026-07-30, LIF-75).** Was the computed head off db-7; built as generic-coding (profile switched).
apps/web client runtime + the D5 main↔worker binding + ADR-020. Details in the Completed table + session-log.
Homes landed at `apps/web/src/{stores,routes.tsx,hooks,lib,db}` (architecture homes, NOT the §149 `{stores,router,forms}`
shorthand — §149 cell is a flagged hygiene follow-up).
> **AR-7 is NOT the head** — READY (blockers all ✅) but in the *later* `Substrates` sub-wave. Boot & DB spine
> drains first (ar-4 · db-10 · qa-1). Always trust `--next`, never hand-read a prose "next".

**🔎 DELIVERY-LOOP AUDIT (2026-07-29) — VERIFIED SOUND.** The loop (ADR-015) resolves correctly: `--verify` 47/47
live · map complete (47 issues, all 38 active nodes ⊆ map) · 0 duplicate active nodes · **0 dangling blockers**
(nothing falsely suppressed) · all frontier waits legitimate. The db-7-vs-AR-7 "disagreement" was sub-wave
ordering working as designed, not a bug. Robustness comes from `parse_tasks` globbing active-only + `is_done`
file-wins-then-map. Details: [[delivery-loop-verified-sound]].

**✅ AR-7 edge reconcile DONE (this session):** added the intra-tier `AR-7 ← AR-6` blocker (was missing from both
the task file and delivery-plan §5) + wrote `AR-5, AR-6, DB-6, DB-9` into §5 row 165 + §4 model. Confirmed `--next`
unchanged (graph-honesty, not a re-route). NB: `ar-5-sessions-framework` (LIF-76) is CANONICAL — not a stale slug.

**🧹 Hygiene follow-ups:**
- ✅ RESOLVED 2026-07-30 (Phase A re-org): Delivery-plan §5 AR-6 Home `{spaces,views,effects}` → `{spaces,views}`
  (`effects/` is AR-7's home).
- ✅ RESOLVED 2026-07-30 (Phase A re-org): purged the one true dedup residue `ar-6-spaces-and-tags` (a keyless /
  `# Linear:`-less duplicate of `ar-6-spaces` LIF-77). The other 3 files the earlier note lumped in —
  `ar-5-sessions-base`, `ar-6-spaces`, `db-9-enums-and-zod-validators` — are CANONICAL archived-done tasks, NOT
  residue; kept. (Now that the loop reads `archive/`, the "inert" assumption no longer holds — hence the correction.)

**⚠ Manual-Linear (Victor, Linear UI only):** **NEW → LIF-78 (AR-7) blocked-by LIF-76 (AR-5) + LIF-77 (AR-6)**
(the tracker writes identity, not blocker relations); archive the 5 empty ①–⑤ Project shells; db-2 (LIF-64) disposition.

Full detail in `.claude/session-log.md`. Historical AR-*-era notes below (kept for reference):

---

**AR-2 DONE + M1.0 -a spine dep-graph RECONCILED (commit ef481c1). Corrected ready-frontier below.**
- **AR-2 recap:** async DatabaseAdapter + web-adapter (wa-sqlite/OPFS + drizzle-orm/sqlite-proxy). 5/7 DoD (contract);
  browser open/persist carried by **LIF-103** (Playwright+OPFS harness). Details: 2026-07-27→28 session-log.
- **Dep-graph reconcile (this session):** the -a spine was inconsistent (plan table vs Linear vs ADRs). Fixed +
  ADR-critiqued + repaired Linear (db-6/ar-9 were batch-TRASHED — restored). See docs/specs/fixes/m1.0-a-spine-dep-reconcile/.
- **CORRECTED READY-FRONTIER** (done = ar-1/db-1/ar-2):
  - **DB-6 (LIF-68) — Repository** ← ar-2 ✅ (spurious db-4 edge REMOVED → now genuinely unblocked). Owns the
    co-transactional sync_queue write + authors the sync_queue fragment. **Strong next head.** Profile: Add Backend Component.
  - **DB-9 (LIF-71) — enums+Zod** ← db-1 ✅ · **DB-7 (LIF-69) — migrations runner** ← ar-2 ✅ (authors app_state). Both ready, parallel.
  - **AR-4 (LIF-75) — state/routing/forms** ← ar-1 ✅ · **UX-1 (LIF-90) — IA** (no blockers). Parallel tracks.
  - Substrates **AR-5/AR-6 ← DB-6, DB-9** (NOT ready until those land) → AR-7 ← AR-5,DB-6,DB-9. **DS-1** built-but-parked (-b wave, unparkable).
- ✅ **FULL-M1.0 GRAPH NOW VALIDATED (2026-07-28, LIF-105, commit 5e36376).** The b/c/d tracks + db-3/4/8/10 + ar-4/8
  + qa-1 were per-edge reconciled across all 3 sources; independent ADR-critique clean; `--verify` 47 live. The
  ready-head→gated-build→next loop is now SAFE to run end-to-end. Key corrections: **db-8 ← db-7** (not db-6 — was an
  illegal M1.0←M3 edge; db-8 now rides db-7); ux-5 ← ux-1 (ar-3/M3 removed); db-10 ← +db-9; ds-4 ← +ds-3; ar-8 ← ar-6.
  Streaming loop settled: db-3/db-4 fold into consumer gates. Rule: graph edges = build-order blockers, not feeds (§5.1.1).
- ✅ **DB-6 DONE (2026-07-28, commit 7f90c9b, LIF-68)** — repository + sync_queue producer landed; unblocks the
  substrate tier (ar-5/6/7) + db-10 seed. See Completed table.
- ✅ **DB-9 DONE (2026-07-28, commit a137a44, LIF-106)** — 81 canonical enum tuples (C2 tuple-as-source) + 81 z.enum
  validators + SQL-CHECK↔tuple parity test; zod added (first in repo). Double-gated + 2 independent critiques; root
  typecheck 10/10 zero consumer edits, 89 tests green. **Substrates AR-5/6/7 now FULLY unblocked** (← db-6 ✅ + db-9 ✅).
- ▶ **READY HEADS NOW** (done = ar-1/db-1/ar-2/**db-6**/**db-9**): **DB-7** (migrations authoring ← ar-2), **AR-4**
  (state/routing/forms ← ar-1), **UX-1** (IA, no blockers) — all parallel; **AR-5/6/7** substrates now ready (← db-6+db-9);
  **DS-1** unparkable for the -b wave. Profile for DB/substrate heads: Add Backend Component.
- ✅ **AR-5 DONE (2026-07-28, commit f045ac1, merged 4956c81, pushed; LIF-107 → Done).** Sessions base substrate
  (Option-1 grain: spine + integration-contract STRUCTURE + 5 enums + thin registry). Effect-firing rail /
  transition engine / scheduler DEFERRED to AR-7/later. Double-gated + 3 independent critiques; typecheck 10/10,
  core 110/110. **CORRECTION to the prior head note:** AR-5 does NOT own the effect rail — that is AR-7
  (`foundation/effects`, ADR-004 §3.2.5 is the spec-OWNER, AR-7 builds it, AR-7 ← AR-5). See
  [[dont-manufacture-forks-from-non-authoritative-notes]].
- 🎯 **NEXT HEAD (done = ar-1/db-1/ar-2/db-6/db-9/ar-5, 6 of 30): AR-6 — Spaces (LIF-77)** OR **AR-7 — Capability
  + measurability + effect rail (LIF-78)**. AR-6 = independent 2nd substrate root (← db-6+db-9, ready now); AR-7
  MUST wait for AR-5 ✅ + **AR-6** (needs both). So **AR-6 is the ready head**; AR-7 unlocks once AR-6 lands.
  Profile: Add Backend Component. AR-8 ← AR-6 + DB-8.
- 🔧 **Dep-graph gap to reconcile (non-blocking):** write the intra-tier edge **AR-7 ← AR-5 + AR-6** into the
  delivery-plan §5 + Linear (the plan encodes only the external ← db-6+db-9). Same class LIF-105 cleaned for the -a spine.
- ⚠ **Manual Linear (Victor):** DB-9 synced as **LIF-106** (new) — reconcile vs roadmap **LIF-71** (dedup: keep one, remap slug).
- **Tracked follow-ups:** LIF-103 (browser E2E harness) · LIF-104 (toolkit: harden tracker visibility) · NIT-3 count()→count(*).
- **Manual Linear (Victor):** archive the 5 empty ①–⑤ shells · db-2 (LIF-64) disposition · confirm old LIF-56–59 gap · **dedup DB-9: LIF-106 (task-synced) vs LIF-71 (roadmap) — keep one, remap the slug.**

**PARKED — DS-1 token pipeline** (branch `ds-1-token-pipeline` @ fd9f144): complete + green but out of sequence
(M1.0-b, not the -a critical path); LIF-81 → Backlog. Resumes when the -b wave's turn comes. (This session built
DS-1 first, then course-corrected to the -a spine head AR-2 per the milestone order.)

**Linear hygiene done:** LIF-72 (ar-1) + LIF-61 (db-1) → Done (were lagging Backlog). LIF-73 (ar-2) → In Progress.

---
<details><summary>✅ FOUNDATION-REALIGNMENT CAMPAIGN COMPLETE (2026-07-25) — prior context</summary>

Part 1 (docs realignment, 34/34 aligned) + Part 2 (repo structure, ADR-018) + Part 3 (roadmap resequence, ADR-019)
done; docs + structure + roadmap coherent (ADRs 001–019). Linear mirrors M1→M4 (M1.0 = 30 issues). M1.0 build is
now underway (AR-2 above).</details>

**Standing follow-ons (create-at-gate, not tasks yet):** net-new module/integration/venue Linear issues are created as
each M-phase begins. **Manual:** archive the 5 empty ①–⑤ Linear Projects in the Linear UI (tracker can't delete Projects).

**Git:** `main` pushed to `origin/main` through `3c2adb7` (AR-5 merged + closed out, 2026-07-28). In sync.

**FIRST ACTION next session — Part 2.0 planning (its own gate-1):**
Part 2 is FORWARD-DECLARED, not yet detailed — it earns its own gate-1 plan before execution (per the master-plan
umbrella framing). Derive the target repo structure from the now-realigned docs: package boundaries; `core/src` homes
for the 5 substrates (sessions/spaces/capability/measurability/economy); `schema/` organization; a disposition ledger
(keep/migrate/quarantine/delete) for every censused file/dir; execute the reorg (quarantine legacy → `Old/_legacy`,
stand up the correctly-shaped skeleton, unwire the v1 `schema.ts` monolith). **Structure only — no feature code.**
Likely **ADR-018** (retire Phase-0 architecture; re-derive from docs). Full double-gate per unit + exit gate.

**The Part-1/Part-2 boundary is now LIVE:** Part 1 deliberately deferred every code/directory-home call
(`[DEFERRED — Part 2]`) — Part 2 is where those homes get decided. The realigned docs cite conceptual owners (ADRs);
Part 2 places them.

**Read first on resume:** `realignment-master-plan/_index.md` (Part-2 forward-declaration + the umbrella framing)
+ the `current-state-baseline/baseline.md` (the file census Part 2's disposition ledger works from) + `ADR-016`
(storage rebuild — the `schema.ts` monolith unwire) + `ADR-017` (features-first, what Part 3 sequences).

**Deferred open Qs (still open):** "RP" abbreviation (Part 3.0, non-blocking); V1/ADR-007 saved-views dedicated
reframe pass; the noted gamification stale-half-line was fixed this session (no longer open).

**Reusable patterns locked across the campaign** (full per-unit detail in the session-log; kept here as the Part-2 toolkit):
- **Per-unit LITE loop:** ground → read ALL 5 aspects to refine the sweep's single-aspect verdict → **grep the live schema floor FIRST** → persist a PLAN → independent adversarial critique → fix → approve → implement → grep-verify.
- **Two critiques for big work:** a PLAN critique (can't catch execution drift) AND a POST-IMPLEMENTATION critique on the prose (catches stale mechanisms surviving as ordinary English).
- **R6 has two shapes:** recovered-domain (no As-is floor, e.g. health/core) vs live-schema (real floor → two-tier retire, e.g. habits/projects/finance) — grep the schema to tell which.
- **Substrate reframes:** X*/AI* ingest layering · M1/M2 measured framing · S1 sessions reframe · E9 god-table split · pure-gap net-new token-naming.
- **The gate's own lesson (this session):** a sweep "aligned/gap" label scores the *token surface* — a context that is *silent* (names no retired token) can still fail applicable predicates ("aligned by omission"). The whole-corpus exit gate + sibling-doc cross-check is what catches it. Check verdicts against *applicability* (framework §4), not just anti-signal presence.

## 🔴 Blocked

_(none)_

## 📋 Planned

| Task | Profile | Priority |
|------|---------|----------|
| **Storage rebuild — from zero** (v1 schema ~60% stale → author v2 from scratch; `ADR-016` + `storage-build-plan.md` ledger + per-table gating. DB-1/LIF-61 ✅ done.) | Generic Coding Session | ⏸ **PARKED by ADR-017** — sequencing inverted to features-first; schema now authored per-feature, not full-schema-first. Resurfaces (incl. encryption/sync at DB-5/DB-2) in the post-validation hardening pass. |
| Toolkit scan-cascade audit + 6 command migrations | toolkit-development | parked — filed in ~/dev-toolkit/.claude/tasks/ |
| Integrate /task-new ↔ native task panel | toolkit-development | parked — sync gap found 2026-06-08 |
| Global Calendar (cross-module read-only aggregator over `dueIn`) | (feature) | parked platform surface — build when its feeder modules are built |
| **Repo-wide Prettier conformance** (CI `format-check` job is pre-existing-RED: `pnpm format:check` reports ~534 drifted files repo-wide — REPO.md, TASKS.md, token JSON, etc. Run `pnpm format` + commit, then keep it green. Surfaced by QA-1, 2026-08-04; not owned by any feature issue.) | Generic Coding Session | hygiene — do as a standalone sweep before the next broad touch |

## ✅ Completed (last 30 days)

| Task | Completed | Sessions |
|------|-----------|----------|
| **ar-8-foundation-services** (LIF-79 → Done · M1.0 `#14` · Add Backend Component / Default · ← AR-6. Delivered its ONE bespoke `@vida/core` piece — the **backlink / entity-link resolver** (`services/search/backlink-resolver.ts`: read-only `getBacklinksTo`/`getLinksFrom`/`resolveLink` over AR-6 `entity_links`, soft-delete-aware, index-hitting; `createBacklinkResolver(db, deviceId)`). Chosen as the `#`-order head (the reconciled routing rule; `--next` greedily said UX-3). `⊞≥2` pinned at its turn (DF-11) resolved — grounded in the plan — to just this one: the other named pieces are homed elsewhere IN the plan → **graph-prep** = AR-6 `ViewEngine`/`ViewProviderRegistry` seam + per-module providers (M1.1) + `@vida/ui` neural-graph (UI-2 #28); **export serializers** = UI-3 (#29 "block editor + serializers", `@vida/editor`, ADR-001 §8); **search (FTS5)** = DB-8 (#60 stream). Double-gated: plan critique REVISE→4 fixed (flat-file→`services/search/` dir per ADR-018 §3.2; `and(...)!`; soft-delete wording; notes/ boundary); post-impl critique SHIP + 2 hardening tests (partial-exclusion, revive). @vida/core **177/177** · root typecheck **10/10** · zero regression. Also this session: reconciled the recurring `--next`-vs-`#`-order routing conflict (stale illegal AR-8←db-8 #14←#60 edge fixed; `## 🧭 Delivery Routing` rule installed; 5 stale doc glyphs refreshed; toolkit task filed for a general `--next` build-order tie-break). §XXIX `docs/core/backlinks/current-*`. Spec `docs/specs/infrastructure/ar-8-foundation-services/`. NOT committed (working tree on `main`). Unblocks HARD-3.) | 2026-08-05 | 1 (2026-08-04→05) |
| **qa-1-e2e-harness-opfs** (LIF-103 → Done · M1.0 #8 · Add Backend Component / **new scenario `E2E Test Harness`** · ← AR-2. The repo's shared **browser-E2E foundation** (Playwright + wa-sqlite/OPFS worker), AR-2 verification as first consumer. Chosen by **strict `#` order** (Victor); profile switch Design System→Backend. Reframed scaffolding→**foundation** (Victor: nothing wasted, help following issues): reusable `db` backdoor fixture + OPFS-reset in `apps/web/e2e/fixtures.ts` (reused by UI-3 CRUD / MOD-* persistence / DB-10 seed — documented extension points), `harness.{html,ts}` backdoor (live ops only, never the deferred `values/batch` seam, never in `dist/`), `db-persistence.spec.ts`. **Zero throwaway** — item-2 persistence proven via a probe row in the DURABLE `app_state` table (not a synthetic table; not `schema_version`). Config at app root (`testDir ./e2e`) + `PW_EXECUTABLE_PATH` escape hatch + `e2e` turbo task + `ci.yml` job. Gates: 2 plan critiques + gate-2 critique + post-impl review (all independent); **live-smoke caught 2 bugs** (config-discovery collision; Vite dep-optimize reload race). Verified **2/2 green, twice, no flake** in a real Chromium worker (Brave on macOS 12). Zero regression (web typecheck ✓ · web 21/21 · core 169/169). **Closes AR-2 items 1 & 2 (7/7)**; Drizzle-write variant → UI-3/M1.1+. commit `4ee122d` → PR #3 merged to `main` (`3c7db3c`). Flagged 2 pre-existing CI reds on owners (`@vida/server` no-tests → P2-1; repo-wide Prettier drift → new Planned hygiene task). Spec `docs/specs/infrastructure/qa-1-e2e-harness-opfs/`.) | 2026-08-04 | 1 (2026-08-03→04) |
| **ds-4-tamagui-config-dark-mode** (LIF-84 · M1.0-b Design System · ← DS-2/DS-3 · reconstructed #19. `packages/ui/src/tamagui.config.ts` composes the generated outputs into `createTamagui` (createTokens + 2× createFont [role keys + `$true` default, guards the passthrough trap] + light/dark themes + createAnimations) + `provider.tsx` (`UIProvider`/`useVidaTheme`) + ambient `tamagui.d.ts` augmentation (avoids the `typeof config` TS2742 cycle under `declaration:true`). **First unit to COMPOSE the tokens** — crossed DS-1's ⊥ DS-4 standalone-typecheck boundary. **Animation driver = `@tamagui/animations-css`** per ADR-001 §9 (CSS-on-web + no-extra-dep; consumes motion.ts duration+easing losslessly). Gate: DS-* LITE (delivery-plan §3). Independent critique (read installed @tamagui/web types) REVISE→5 fixed (addThemeClassName=setting-not-prop · useThemeSetting→useVidaTheme · pinned switch mechanism · createFont `$true` render-assert · CSS-var reconciliation). ⚠ **Mid-build RN-driver drift triaged STRUCTURAL + corrected** (`/victor-triage`; I'd picked `@tamagui/animations-react-native` — not in docs for web, forced react-native-web violating ADR-001; diagnosis `docs/specs/fixes/ds-4-rn-driver-drift/`; memory [[dont-let-downstream-shape-reopen-an-adr]]). Also: core+driver pinned 2.6.2 (family align); jsx/DOM/react added (first JSX in @vida/ui); source-model guard scoped to `components/`. @vida/ui **30/30** · root typecheck **10/10** · imports at runtime with NO react-native-web. **Frontend Visual Gate PASS** (composed light｜dark theme surface). §XXIX: token-pipeline current-* deferrals resolved + `packages/ui/src/CLAUDE.md`. NOT committed — on `main` working tree; branch-first pending. Unblocks DS-5/UI-*/UX-*.) | 2026-08-03 | 1 (2026-08-03) |
| **ds-3-motion-foundation** (LIF-83 · M1.0-b Design System · ← DS-2 · reconstructed #18. Motion foundation: `duration` (instant 0/fast 150/moderate 250/slow 400, unitless ms) + `easing` (out/in/inOut cubic-beziers + linear) primitives added as a **third aux consumer** — `AUX` factored `[...TYPOGRAPHY, 'shadow', ...MOTION]`, `vida/fonts` narrowed to typography (closed the fonts↔motion leak by construction), new `vida/motion` format → `motion.ts` (mirrors `fonts.ts`), index re-export, B11/B12. Values trace to `standards/motion.md §IX`. LITE gate: plan-critique REVISE→5 fixed (F2 AUX sweep · F8 positive css-vars test · F6 createAnimations UNKNOWN · F5 band-floor INTERP · F9 both sort layers); post-impl critique SHIP + 2 NITs (linear-type→`easing`; camelCase `--easing-inOut`→DS-4). Live-smoke caught a preview render bug (cubic-bezier commas → isShadow miscapture → 3 easings as invalid box-shadow; motion branch moved above shadow). @vida/ui 26/26 · root typecheck 10/10 · deterministic. **Frontend Visual Gate PASS** (2nd run; `instant` render fixed static-not-flicker per Victor; values standard-derived, NOT a provisional placeholder). §XXIX docs promoted (current-spec/current-business-rules B11/B12 + themes CLAUDE.md = B12 enforcement artifact). Merged + pushed to origin/main (`8f9cbe2`, --no-ff); branch deleted; re-verified green. LIF-83 → Done. Unblocks DS-4.) | 2026-08-03 | 1 (2026-08-03) |
| **ds-1-token-pipeline** (LIF-81 · M1.0-b Design System ROOT · **RE-LANDED** — un-parked as the computed next head (`--next`/`--plan` rank #1 among READY; unblocks ds-2/3/4/5). The build was already gated+green on the parked branch @ fd9f144 (2026-07-27); this session INTEGRATED the isolated `packages/ui/src/themes` Style Dictionary→Tamagui+CSS pipeline onto current main 57 commits forward. Main never touched `packages/ui` → 0 clobber; only `docs/specs/_index.md` line-merged + `pnpm-lock.yaml` regenerated (+style-dictionary@5.5.0). Re-verified green vs today's main: tokens:build ✓ · @vida/ui 13/13 ✓ · root typecheck 10/10 ✓ · no artifact drift. Ship gate SHIP. commit ab5966c (merge of `ds-1-reland`) → pushed to origin/main. LIF-81 → Done. Currency §XXIX: `docs/ui/token-pipeline/current-*` verified current. Profile switched Add Backend Component → Design System.) | 2026-08-03 | 1 (2026-08-03) |
| **ar-7-capability-registry** (LIF-78 · M1.0 substrate spine · FINAL substrate) — the ⊞4 capstone: **4 gated increments** (effects rail · capability registry · measurability engine · points economy) in `core/src/foundation/{effects,capability,measurement,economy}` (ADRs 004/008/010/011/012). Delivered under the DF-11 per-substrate gating rule (written this session) with a DF-12 deferral-homing pass (new `#85 CAP-authoring`). Added `Repository.createInTx` (docs-grounded §XXVIII). @vida/core 169 tests, root typecheck 10/10. 6 commits on branch `ar-7-capability-registry` (`403d25f`→`b52d7b4`), **not merged/pushed**. Unblocks MOD-purposes, MOD-gamification, HARD-2. | 2026-08-03 | 1 (2026-08-02→03) |
| **ux-1-information-architecture** (LIF-90 · M1/M1.0 experience-track ROOT · computed head via `--next`. The web app's IA + **co-primary dual-axis nav model** — module dock (content home) + Spaces bar (cross-cutting overlays); amends ADR-007:88, ADR-006 §3.4 cover; Spaces bar = seam live M1.1. Deliverables: `docs/core/architecture/information-architecture.md` + `apps/web/src/nav/module-map.ts` (23 modules placed) + layer-doc. Grain: design/spec issue that also emits a declarative code artifact (dual home). 4 gates (PLAN critique+preflight, map critique — 3 REVISE all fixed) + **Victor primary-doc audit** caught Routines misclassified (harvest read the cockpit as inside-Sessions). Placements: Routines→dock, Check-ins→secondary, Gamification→conditional dock, Sessions→dock, Pomodoro/Flashcards→non-nav, Languages/Bucket-List→spaces-only. Homes verified vs ADR-018 (per-app, not shared pkg). typecheck 0, lint 0-err, routes.tsx untouched. Currency: BR-NAV-1..4 promoted. commit f5a863b → merged+pushed to main. Unblocks UX-2/3/4/5.) | 2026-08-02 | 1 (2026-08-01→02) |
| **ar-4-state-routing-forms** (LIF-75 · M1.0 Boot & DB spine · COMPUTED head via `--next` off db-7. apps/web client runtime: Zustand + React Query v5 + TanStack Router + TanStack Form/Zod, **+ the main↔worker DB binding AR-2 assigned to AR-4** (D5: `db/client.ts` SqliteDriver proxy over the worker RPC w/ timeout+crash handling; extended `worker.ts` protocol; `boot.ts` DB-ready gate). Grain = mechanism + 1 reference/plane; values/batch = deferred seam. **ADR-020** resolves the long-deferred ADR-001:286 (Zustand placement = per-app hooks). Profile switched → Generic Coding Session. Full §XXVI double-gate + §XXX: 2 plan critiques + preflight (surfaced the missing D5 layer) + post-impl critique (happy-path-only error handling → RPC timeout/onerror + worker default + boot memo-clear + App error/retry) + engineering gate PASS. typecheck 10/10, @vida/web 21/21, build green. commit 955a255 on branch `ar-4-state-routing-forms`. Victor corrected 2 manufactured forks (grain + binding ownership both already in docs). §XXIX docs at docs/infrastructure/web-client-runtime/.) | 2026-07-30 | 1 (2026-07-29→30) |
| **db-7-migrations-runner** (LIF-69 · M1.0 Boot & DB spine · COMPUTED head via `--next`. Reconcile+extend of the existing runner: authored the `app_state` infra table (`schema/foundation/app-state.ts`, ADR-002 §5.0) + `ensureInfra` pre-loop bootstrap + dev-only `resetDev`. **Closed a latent boot bug** — engine assumed `app_state` but no production migration created it → `migrate()` threw at real web boot (`worker.ts:23`), masked by 4 test fixtures (retired). Engine untouched; forward-only preserved (no `down()`, inherited §9.2 divergence → DB-11). Full §XXVI double-gate + 3 independent critiques (all SHIP; gate-1 caught a 4th fixture + BR-5 mechanism). typecheck 10/10, @vida/core 131/131, @vida/web 6/6. §XXIX docs shipped together. commit d7aa1e0. Also this session: manufactured-fork correction (memory [[read-architecture-before-implementing]]) + delivery-loop audited sound + AR-7 edge reconcile.) | 2026-07-29 | 1 (2026-07-29) |
| **ar-6-spaces** (LIF-77 · M1.0 substrate spine · Spaces per ADR-006 (SP1–SP7) + ADR-007 (V1–V5). 6 tables (`tags`·`entity_tags`·`entity_links`·`spaces`·`space_enabled_blocks`·`views`, migration 003) + `TaggableTypeRegistry` (SP2 open) + `SpacesService` (BR-14 idempotent junctions, BR-15 resolve-then-soft-delete, BR-3/5 cycle guards, BR-13 M1.0 empty-[E] pass-through) + `ViewsService` + `ViewProviderRegistry` (empty V4/R7 seam) + `ViewEngine` (V3/V4/V5). Deferred: capability registry/block_instances→AR-7, backlink resolver→AR-8, effect rail→AR-7, DSL/layout/resolution-surface→build-time. Double-gated + 3 independent critiques [g1×2: scope-drift + link_type-in-prompt; g2: 3 executability defects vs real repository.ts; post-impl: missing spaces cycle-guard]. §2.1 gather-protocol born after a triage. typecheck 10/10, spaces 14/14, parity 7/7. commit e2a170d → merged fad233b. Currency §XXIX docs at docs/core/spaces/. Unblocks AR-7. LIF-77 canonical (Facet A reconciled the LIF-108 dup).) | 2026-07-29 | 1 (2026-07-28→29) |
| **ar-5-sessions-base** (LIF-107 · M1.0 substrate SPINE · Sessions base per ADR-004. Option-1 grain: `sessions` spine + integration-contract STRUCTURE (`session_type_registry` + `session_attachments`) + 5 canonical enums (EFFECT_TYPE=12 incl. ADR-012 amendment) + thin SessionRegistry (register/get/list, BR-3/4/1, user types → db-6 Repository → sync_queue). Effect-firing rail/transition engine/scheduler DEFERRED to AR-7/later. Double-gated + 3 independent critiques [gate-1: EFFECT_TYPE 8→12 subset drift; gate-2: registry PK/Repository mismatch; post-impl: BR-4 effects⊆allowed⊆shipped]. typecheck 10/10, core 110/110. commit f045ac1, merged 4956c81, pushed. Currency §XXIX docs born. Unblocks AR-7. ⚠ LIF-107 dup roadmap LIF-76 — reconcile.) | 2026-07-28 | 1 (2026-07-28) |
| **db-9-enums-zod** (LIF-106 · M1.0-a spine · canonical enums+Zod. 81 @vida/types enums → `as const` tuple + derived union [C2 tuple-as-source = exhaustive, not `satisfies` ⊆] + 81 `z.enum` validators in @vida/core [zod ^4.4.3, first in repo] + SQL-CHECK↔tuple parity test [ADR-002 §2.3, ADR-016 §3.3 assert-only]. Double-gated + 2 independent critiques [PLAN caught buried tuple-location decision + sqlEnumCheck ADR-overreach; IMPL caught stale-dist false-green risk + 2 missed enums]. Verified: root typecheck 10/10 ZERO consumer edits, core 83 + web 6 green, literal-sets byte-identical vs HEAD. commit a137a44. Unblocks substrates AR-5/6/7) | 2026-07-28 | 1 (2026-07-28) |
| **db-6-repository-layer** (LIF-68 · M1.0-a1 spine · reconcile+extend of the v1-carried repository: sync_queue foundation table [ADR-002 §5.1 CHECKs+UNIQUE] + migration 001 registered; co-transactional UPSERT enqueue per mutation [ADR-004 §3.4]; M1.0 pass-through seam = empty [E] set + lazy vault key [ADR-017:20]. Baseline caught it was NOT from-zero. Independent /critique [7 fixed, 3 by source-verify — incl. refuting the "proxy has no .transaction()" risk] + 2nd critique [5 exec fixes incl. UPSERT correctness bug]. 10-case tests; @vida/core 55/55; commit 7f90c9b. Unblocks ar-5/6/7 + db-10) | 2026-07-28 | 1 (2026-07-28) |
| **m1.0-dep-graph-validation** (full-M1.0 dep-graph validated per-edge vs ADR contracts + reconciled across task files/Linear/delivery-plan §5; independent ADR-critique caught db-8←db-6 as illegal M1.0←M3; 9 edges corrected, 7 Linear mutations, --verify clean; streaming loop model settled. commit 5e36376) | 2026-07-28 | 1 (2026-07-28) |
| **ar-2-database-adapter-web** (LIF-73 · M1.0 critical-path ROOT · async DatabaseAdapter + web-adapter over wa-sqlite/OPFS + drizzle-orm/sqlite-proxy. DIRECTION corrected sync→async mid-build [wa-sqlite Factory API async-only] — Rev 3 re-gated. 5/7 DoD [contract]; items 1&2 [browser open/persist] → LIF-103. commit e55010f. Unblocks db-6/7, ar-5/6/8/9) | 2026-07-27 | 1 (2026-07-27) |
| **m1.0-delivery-plan** (Milestone Delivery Planning — new scenario crystallized. docs/roadmap/m1.0-delivery-plan.md: 30 M1.0 issues bound 1:1 to entity·ADR-018 home·intent·profile·flow·DOC spine·deps·gate; critic SHIP after 1 fix; grain+dep reconcile caught fold/split + inversion + 2 stale Linear edges [cleaned both sides]. Strategy meta-task, not a Linear issue) | 2026-07-26 | 1 (2026-07-26) |
| **linear-projectize** (U3 — re-scoped LIF-61…95 onto the roadmap M1→M4: created M1.0/M1.4/M2/M3/M4 Projects, moved 33 existing issues to final homes, created split/head issues LIF-98…101, old ①–⑤ emptied; LIF-97 Done) | 2026-07-26 | 1 (2026-07-25→26) |
| **build-roadmap-resequence** (→ foundation-realignment campaign: P1 docs realignment + P2 repo structure [ADR-018] + P3 roadmap resequence [ADR-019]; all exit gates accepted; docs+structure+roadmap coherent, derived from ADRs 001–019; LIF-96 Done) | 2026-07-25 | many (2026-07-23 → 07-25) |
| **storage-master-plan** (ADR-016 + storage-build-plan master ledger; both gates; commit 58dc813) | 2026-07-22 | 1 (2026-07-22) |
| **db-1-schema-primitives** (LIF-61 · P0 storage-rebuild primitives; both gates + review battery + 4 consistency passes) | 2026-07-22 | 1 (2026-07-20→22) |
| **build-roadmap** | 2026-07-20 | 3 (2026-07-20) |
| **documentation-blueprint** | 2026-07-19 | ~20+ (2026-06-08 → 07-19) |

---
*To add a task: /task-new [name]*
*To switch tasks: /task-switch [name]*
*To complete a task: /task-complete [name]*
*To see full status: /repo-status*
