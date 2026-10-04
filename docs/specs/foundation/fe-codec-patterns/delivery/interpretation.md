# fe-codec-patterns — Interpretation Layer (Entity Delivery Flow ②, Step 1)

> **Unit:** LIF-211 · ② Frontend CODEC #2 · the cross-cutting **pattern-kit** (decomposition.md §1.3).
> **Scope:** web, M1.0. EXTENDs `ux-4` (state-conventions) + composes `ui-1` primitives + the `fe-codec-theme` tokens.
> **Method:** process.md §6 Step-1 **3-lens audit** (WRONG / MISSING / OVERFLOWING) over the frozen ux-4/ui-1
> contracts + the G1 Quality Bar (§2 ADDs, P4/P5/P6) + the P4/P5/P6 specimens. No guessing — anything the docs leave
> open goes to Victor (Step 2) before code; everything here is doc-fixed (§6).

---

## 0. What this unit is

The **behavioural half of the CODEC** (fe-codec-theme was the visual half). Six reusable cross-cutting primitives +
one state machine that **every downstream `fe-*` surface inherits**, so the 8 systemic findings are satisfied *once,
by construction* [FACT: decomposition.md:36-40 §1.3; surface-map.md:157]:

1. **the 8-state machine** — `idle · typing · loading · results · empty · unavailable · error · success`
2. **`EmptyState`** — teaching-invitation
3. **`SyncStatus` + `HonestProgress`** — calm honest local-first status + honest progress for genuinely-slow ops
4. **`ReducedMotion`** — the wrapper that enforces the §IX / B12 reduced-motion contract
5. **`VoiceCopy`** — voice + copy-honesty lint
6. **`ReachabilityRegistry`** — the ≥2-reachable-paths floor, as a runtime registry
7. **`ProviderRead`** — the "no direct cross-module tables" read convention

`ThemeProvider` (the 8th §1.3 item) **already shipped in fe-codec-theme** → OUT of scope [FACT: decomposition.md:37; .claude/tasks/archive/fe-codec-theme.md].

---

## 1. DEPENDENCIES (frozen contracts — this unit builds ON, never patches around)

- **`@vida/core` TerminalState canon** — `['loading','empty','error','success']` (`foundation/capability/types.ts:13-14`,
  ADR-008 CB6 / R5). The ONE vocabulary the capability registry (`MissingTerminalStates`), the ViewEngine degrade
  contract, and the web layer all speak. A surface **MAY extend** with sub-states, but **each maps back** to one of
  these four [FACT: state-conventions.md:30-47; packages/core/src/foundation/capability/types.ts:13-14].
- **ux-4 state-conventions** (`apps/web/src/state-conventions/`) — `terminal-state.ts` re-exports the canon + the
  `isPending`-first `deriveTerminalState<T>(result, isEmpty)`; `keyboard.ts` = `FOCUS_CONTRACT` + `OVERLAY_DISMISS`.
  **This unit EXTENDS ux-4**, it does not re-home it [FACT: state-conventions.md:56-64; apps/web/src/state-conventions/terminal-state.ts:18,50-58].
- **ux-2 `SearchStatus`** — the already-shipped **worked example** of the superset: `idle · typing · loading · results ·
  empty · search-unavailable · error`, each collapsing to one canonical state. The 8-state machine *generalizes this
  one surface's pattern into the codec* [FACT: state-conventions.md:44-47; apps/web/src/command-bar/types.ts:62-73].
- **ui-1 primitives** (`@vida/ui/components/`) — Card · Button · Input · Toast · … The kit **composes** these; the
  error state = `Card`+`Button`, the skeleton recipe = a `View` sized to the content box [FACT: state-conventions.md:82,85-99].
- **fe-codec-theme tokens** — all color/space/radius/type come from the preset theme vars via DIRECT semantic tokens
  (`$colorSurface*`, `$colorText*`, `$colorBrand*`, radius `$md/$lg`); no hard-coded palette [FACT: docs/ui/token-pipeline/current-business-rules.md B-codec-6:149-163].
- **motion foundation** (`motion.ts` / B11 / B12) — `duration.*` + `easing.*` tokens; B12 = the reduced-motion +
  safe-property (`transform`/`opacity`/`clip-path` only) contract, **documented, awaiting its component-gate enforcer**
  [FACT: docs/ui/token-pipeline/current-business-rules.md B11:38-43, B12:44-50].
- **backend cross-module providers** — the read seams `ProviderRead` points at already exist (e.g. `getPlansForConsumer`,
  `getDayBooksDigest`, the `dueIn(today)` provider) [FACT: decomposition.md:66,84; .claude/tasks/archive/mod-books.md S10].

### THE boundary that governs every home (load-bearing)
**`@vida/ui` CANNOT import `@vida/core`** — its deps are Tamagui-only; importing the canon would be a wrong-direction
edge. So `@vida/ui` mirrors terminal state **structurally** (`ViewState` in `internal/data-view.tsx`) and takes it as a
**PROP** (`state?: ViewState`, default `'success'`); the **app** derives via `deriveTerminalState` (which imports the
canon) and **passes it in** — BR-2, the package→app boundary [FACT: packages/ui/src/CLAUDE.md:125; packages/ui/src/internal/data-view.tsx:9; packages/ui/src/components/list-view.tsx:15,17,34-35].

## 2. NEEDS (what the kit must deliver)

1. **The 8-state type + collapse map + extended deriver** — the superset `{idle,typing,loading,results,empty,unavailable,
   error,success}`, a total map `→ TerminalState` (the fail-loud/degrade contract), and a deriver for input-bearing
   surfaces (extends `deriveTerminalState` with the idle/typing/results dimension). Reuses the `@vida/core` canon as the
   collapse target — authors **no new canon**.
2. **`EmptyState`** — a presentational component: headline + teaching body + primary action slot + optional guided-setup
   slot; never a blank region, never "No data available".
3. **`SyncStatus` + `HonestProgress`** — a calm status chiplet (never alarming) + an honest determinate/indeterminate
   progress for genuinely-slow ops (FTS rebuild, export, vault unlock). The `/sync` *page* is a LATER unit (fe-sync-log).
4. **`ReducedMotion`** — a wrapper/hook giving every animation an instant `prefers-reduced-motion` alternative over
   transform/opacity only (the B12 contract, finally with a component-level enforcer).
5. **`VoiceCopy`** — the voice constants + a copy-honesty lint (dev-time) encoding the three honesty rules.
6. **`ReachabilityRegistry`** — register a capability's reach paths (dock · ⌘K · contextual/`[[link]]` · M1.1 Spaces) +
   assert the ≥2-path floor; the runtime companion to the G4 set-cover gate.
7. **`ProviderRead`** — the typed convention + hook shape for cross-module reads via a provider seam (React Query over a
   backend provider method), never a direct cross-module table read.

## 3. ORGANIZATION (where each piece slots — governed by §1's boundary)

```
@vida/core  foundation/capability/types.ts      TerminalState canon (frozen — reused, never re-homed)
@vida/ui    components/empty-state.tsx           EmptyState        ← presentational, state/status as PROP
            components/sync-status.tsx           SyncStatus + HonestProgress   ← presentational
            components/reduced-motion.tsx|hook   ReducedMotion     ← Tamagui/media, no @vida/core edge
            internal/… (structural 8-state mirror, if the kit components need it, à la ViewState)
apps/web    state-conventions/terminal-state.ts  EXTEND: the 8-state type + collapse map + input-state deriver
                                                  (imports the @vida/core canon — the app side owns the edge)
            <reach>/reachability-registry.ts     ReachabilityRegistry  ← nav/reach, app-coupled (UX-1 module-map)
            <providers>/provider-read.ts          ProviderRead convention + hook shape
            <voice>/voice-copy.ts                 VoiceCopy constants + honesty lint
                  → every surface composes the kit  ← codec payoff
```
> Home split = the BR-2 boundary: **renders → `@vida/ui` (state as prop)**; **imports-the-canon / derives / app-logic →
> `apps/web`**. Exact file paths are ratified at Step 2 (slice-map); the package↔app split is doc-fixed, not open.

## 4. IMPLICIT RULES (caught here, not in the browser)

- **Reuse the canon — never redefine.** The 8-state machine imports `@vida/core`'s four literals (app side) or mirrors
  them structurally (`@vida/ui` side); it does **not** declare a fifth un-unified copy [FACT: state-conventions.md:40,49-52].
- **Each sub-state maps back to exactly one canonical state** — the fail-loud/degrade contract; the map is total
  [FACT: state-conventions.md:44-47].
- **State is a PROP across the package boundary** (BR-2) — `@vida/ui` components never derive; the app derives + passes
  [FACT: packages/ui/src/components/list-view.tsx:34-35].
- **Degrade, never crash** — every state renders something; an empty `success` list self-heals to empty (the LV-2
  precedent) [FACT: list-view.tsx:27; state-conventions.md:39].
- **loading = CLS-safe skeleton** matching the settled content box + `aria-busy`; **no bare spinner** [FACT: state-conventions.md:80].
- **error = inline + retry**; retry `refetch()`s and re-enters `loading`, never stacks; message `aria-live="assertive"`
  [FACT: state-conventions.md:82].
- **Reduced-motion is an instant state change, not the absence of motion**; animate transform/opacity/clip-path only
  [FACT: docs/ui/token-pipeline/current-business-rules.md B12:44-50; motion.md §IX].
- **Copy honesty is a constraint, not a nicety** — no ZK-*sync* claim before M3 (M1 = local-first, encrypted at rest);
  overclaim→staged-honest, blame→teach-the-fix, dead-end→anti-lost [FACT: frontend-quality-bar/_index.md:41-43 §2.1-2.2].
- **≥2 reachable paths is a hard floor** — a one-path capability *fails* G4 [FACT: frontend-quality-bar/_index.md:46 §2.4].
- **No cross-module table reads** — a module reading another's tables is OVERFLOWING; go through a provider [FACT: frontend-quality-bar/_index.md:27].
- Consume frozen ux-4/ui-1/theme contracts; if one looks wrong, STOP — don't patch the frontend around it [FACT: process.md:113].

---

## 5. THE 3-LENS AUDIT

### WRONG — contradicts a standard or a bar decision
- **W1** The terminal-state vocabulary is **declared 3× un-unified** (`TerminalState` · `ViewState` · `SearchStatus`)
  and there is **no shared machine** for the input-bearing superset — every input surface would re-invent idle/typing/
  results [state-conventions.md:49-52; command-bar/types.ts:62-73]. *(The kit resolves it as the single codec machine —
  NOT by consolidating the canon into @vida/types, which is deferred + the canon owner's job; see R1.)*
- **W2** B12 (reduced-motion + safe-property) is a **documented contract with no component-level enforcer** — "enforced
  at the component gate," but no reusable `ReducedMotion` exists; each animation would re-handle it ad hoc
  [current-business-rules.md B12:44-50].

### MISSING — the bar requires it, nothing exists
- **M1** **No `EmptyState` primitive** — the teaching-invitation empty state is a P5 hard requirement; today only
  per-view `empty` slots exist, no shared teaching component [frontend-quality-bar/_index.md:84 P5; p5 specimen:154-166].
- **M2** **No `SyncStatus` / `HonestProgress`** — P4 requires a calm honest sync status + honest progress for slow ops;
  nothing renders it [frontend-quality-bar/_index.md:50-51 §2.6, 79-82 P4].
- **M3** **No `ReachabilityRegistry`** — the ≥2-path floor is proven at *plan* time (G4 set-cover) but has **no runtime
  artifact** a surface registers its paths with [frontend-quality-bar/_index.md:46 §2.4; surface-map.md:144].
- **M4** **No `ProviderRead` convention/type** — the "never direct cross-module tables" rule is stated but not encoded
  as a reusable read shape [decomposition.md:66,84].
- **M5** **No `VoiceCopy` honesty lint** — the voice + 3 honesty rules are specified but not enforced/encoded
  [frontend-quality-bar/_index.md:41-43 §2.1-2.2; p6-voice-coherence-specimen.html].

### OVERFLOWING — past this unit's job
- **O1** The **`/sync` page** (change log + multi-device compare) → `fe-sync-log` (#21), which *depends on this unit*.
  This kit ships only the status **chiplet + HonestProgress**, not the page [decomposition.md:55,68 fe-sync-log].
- **O2** **Multi-device sync compare / real sync transport** = M3+ — the status is honest-local-only in M1
  [frontend-quality-bar/_index.md:82 P4].
- **O3** **The @vida/types canon consolidation** — unifying the 3 copies into a shared vocabulary is **deferred and
  belongs to the canon owner (@vida/core)**, NOT this frontend unit [state-conventions.md:49-52].
- **O4** **Per-surface reach *wiring*** (which dock/⌘K/link entries each module registers) is the modules' M1.2.2+ job;
  this unit ships the *registry mechanism* + the floor assertion, not every module's entries [surface-map.md:110,144].

---

## 6. RESOLVED BY DOCS (stated as FACT — no decision owed to Victor)

- **R1 — No new canon; the 8-state is the documented superset pattern.** The machine reuses `@vida/core` `TerminalState`
  as its collapse target; each of the 8 maps back to one of the 4 for the fail-loud/degrade contract. The `@vida/types`
  consolidation is explicitly **deferred** and **belongs to the canon's owner** — this unit imports/mirrors, never
  re-homes [FACT: state-conventions.md:30-52].
- **R2 — Homes follow the BR-2 package→app boundary.** Rendering primitives (`EmptyState`, `SyncStatus`+`HonestProgress`,
  `ReducedMotion`) → `@vida/ui`, state/status **as a prop**, structurally typed (the `ViewState`/`list-view` precedent).
  Canon-importing logic (the 8-state type + collapse map + input deriver), `ReachabilityRegistry`, `ProviderRead`,
  `VoiceCopy` → `apps/web` (the app owns the `@vida/core` edge) [FACT: packages/ui/src/CLAUDE.md:125; internal/data-view.tsx:9; list-view.tsx:15,34-35].
- **R3 — `EmptyState` = teaching-invitation.** Say what it is + offer the primary action to fill it + opt-in guided
  setup; never a blank region, never "No data available" [FACT: state-conventions.md:81; frontend-quality-bar/_index.md:84 P5; p5 specimen:154-166].
- **R4 — `SyncStatus` = calm + honest + 4 presentations exist as a user pref** (chip · /sync page · on-change · hidden);
  this unit ships the **chip/status primitive + `HonestProgress`**; the page is fe-sync-log; copy is stage-honest
  (M1 local-first, no ZK-sync claim) [FACT: frontend-quality-bar/_index.md:50-51 §2.6, 79-82 P4; p5 specimen:197].
- **R5 — `ReducedMotion`** realizes the B12 contract as a reusable wrapper: instant alternative, transform/opacity only,
  reads `motion.ts` tokens [FACT: current-business-rules.md B12:44-50; motion.md §IX].
- **R6 — `ReachabilityRegistry`** = the runtime companion to the G4 ≥2-path set-cover; reach vocabulary = dock · ⌘K ·
  contextual/`[[link]]` · (M1.1) Spaces [FACT: frontend-quality-bar/_index.md:46-47 §2.4, 84 P5].
- **R7 — `ProviderRead`** = cross-module reads go through a provider seam (React Query over a backend provider method);
  direct cross-module table reads are forbidden (OVERFLOWING) [FACT: frontend-quality-bar/_index.md:27; decomposition.md:66,84].
- **R8 — `VoiceCopy`** = the voice (plain · calm · honest · warm · yours · sentence-case) + the 3 honesty rules as an
  encoded lint [FACT: frontend-quality-bar/_index.md:41-43 §2.1-2.2; p6-voice-coherence-specimen.html].

### One detail to author at the S1 spec (grounded, not a Victor gap)
The **total collapse map** `InteractionState → TerminalState`. This is **net-new logic**, not a map to copy: ux-2's
`SearchStatus` is a **flat 7-member union with NO collapse function** (`idle·typing·loading·results·empty·search-unavailable·error`
— no `success`; `search-unavailable` not `unavailable`) [FACT: command-bar/types.ts:62-73]. The codec's **8**-state is the
`decomposition.md:39` explicit list (adds `success`, generalizes `search-unavailable`→`unavailable`). So S1 **authors** the
map grounded in the "each sub-state maps back to one of the four" rule + the SearchStatus *semantics* — `typing`→`loading`,
`results`→`success`, `unavailable`→`error`, the four canonical → themselves, and `idle` (pre-query, no data yet) → the
documented pre-state. No-Guessing: ground each row in state-conventions.md:44-47, do not assume [FACT: state-conventions.md:44-47; command-bar/types.ts:62-73].

### The canonical state → primitive render mapping (S1 deliverable — so the codec doesn't leak)
The codec's promise is "satisfied once, by construction" — so S1 also **extends the state-conventions.md:78-83 §3
presentation table** (which covers the 4 canonical) with the 3 added states, giving surfaces ONE mapping instead of
each re-deciding: `loading`→the skeleton recipe (§3.1) · `empty`→`EmptyState` (S3) · `error`/`unavailable`→inline error
card + retry (§3 error) · `idle`/`typing`→the input affordance itself · `results`/`success`→content. Lives in S1 +
echoed in the seam-contract [FACT: state-conventions.md:78-99 §3].

## 7. NO OPEN GAPS FOR VICTOR — proceed to decomposition

Every architecture + feel question is doc-fixed (§6); the only residual (`idle`/`typing` collapse) is resolved from
the shipped `SearchStatus`, not a design decision. → Step 2 Decomposition (slice-map + seam-contract).

## 8. Envision Gate (Step 1.5) — SATISFIED by the gated P4/P5/P6 record (no re-run)

Trigger test (entity-delivery-flow.md §3.75): the kit's user-visible primitives (`EmptyState`, `SyncStatus`) *are*
affordances — but their **feel was already captured + gated** at the frontend-replan G1, exactly as P1 covered the theme:
- **The greybox equivalents exist** = `p5-discover-own-specimen.html` (teaching-invitation empty + the sync-indicator
  presentations) + `p4-trust-reversibility-specimen.html` (honest sync/undo) + `p6-voice-coherence-specimen.html`
  (voice + honesty) [FACT: frontend-quality-bar/_index.md:10-13 specimens; p5 specimen:154-166,197].
- **Victor approved them** = P4/P5/P6 RESOLVED + G1 **SHIP** [FACT: frontend-quality-bar/_index.md:161-169 gate record].

→ Re-greyboxing would redo gated work. The per-slice **Visual Gate (Step 10)** still verifies the *rendered* kit (every
state × light/dark × 375/768/1440 + a11y) against those specimens — verification, not a new feel gate.
