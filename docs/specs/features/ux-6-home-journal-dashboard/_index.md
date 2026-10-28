# Spec: feature:ux-6-home-journal-dashboard

<!-- type ∈ component | feature | bug | hotfix | refactor | script | workflow -->

Status: implemented <!-- draft → approved → implemented -->
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-08-09-ux-6-home-journal-dashboard (created).

<!--
  FORWARD spec — written BEFORE the thing is built. §1–§4 are the DESCRIPTION; §5 is the executable PROMPT.
  This is a STUB scaffolded by /task-new. §2–§6 are written for real via the PLAN step
  (/documentation-component) under the Per-Step Build Gate (§XXVI), grounded in the No-Guessing baseline.
-->

## 1. Identity

UX-6 (LIF-95) — **Home = the Journal daily dashboard.** The landing experience Victor opens every day:
today's auto-generated summary + agenda (tasks/reminders/class schedule) + the free-form markdown journal
entry, aggregating data across all modules via the **journal-contribution registry** (`journals/contract.md`
`[INTENT]`; mirrors ADR-004's registry pattern + its `surface_journal` projection effect, ADR-004:84).

- **The desire:** a single daily dashboard that is the connective tissue across the 8 modules.
- **What it is NOT:** not the aggregation ENGINE / module feeds (Phase 1b); not the rendered React component;
  not the `journal-service.ts` engine / provider-registry runtime; not the journal `pages` row / `/summary`
  block / TipTap entry (Notes & Pages owns those).

- **DELIVERABLE SHAPE [FACT: resolved Step-1 3-signal check, 2026-08-17] = a DESIGN MODEL** — a typed declarative
  artifact under `apps/web/src/home/` + a `docs/core/architecture/` doc, **no rendered React component, no Visual
  Gate** — identical shape to UX-3 (`shell/{breakpoints,regions}.ts`) and UX-5 (`onboarding/{steps,first-run}.ts`).
  Docs-fixed: `derived-graph.md:31` ("Home/Journal screen **DESIGN** within the shell") · `delivery-plan:270`
  ("design issue") · `ui-4/_index.md:29` (UI-4 explicitly scopes OUT "the Journal Home content (UX-6, gated behind
  this)" → the `/` `<h2>Vida</h2>` placeholder is INTENTIONAL). The rendering + real data land downstream.

## 2. Business Rules

> Ground: `docs/features/journals/{identity,contract}.md` (the journal-contribution registry `[INTENT]`) + ADR-004
> registry pattern / `surface_journal` projection effect + UX-4 terminal-state canon.

- **BR-1 — three sections.** The Home dashboard models exactly three sections: **summary** (recap of what happened
  today) · **agenda** (what is due today) · **free-form entry** (referenced only — Notes & Pages owns the editor).
  `[FACT: journals/identity.md:8-9]`
- **BR-2 — registry, never by name (J2).** The model consumes **registered journal contributions**, naming no
  module: a contribution = `{ module, section_key, dataPoints[] (user-selectable), summary(date), dueIn(range) }`.
  A new module appears automatically. The seam **mirrors** ADR-004's registry pattern but is defined by the
  journals docs, not decided by an ADR. `[INTENT: journals/contract.md:12-14 (J2/J3); INTERP: mirrors ADR-004 registry]`
- **BR-3 — section-level degrade, never a blank journal.** A provider that fails degrades **only its own section**
  (`ContributionFailed`); every other section still renders. `[FACT: notes-and-pages summary degrade rule, via journals/identity.md:52-54; contract.md:39]`
- **BR-4 — four canon terminal states, per section.** Reuse UX-4's four-literal `deriveTerminalState<T>` canon
  verbatim — **never redefine** (`state-conventions/CLAUDE.md`): `empty` (= first-day/"nothing yet", anti-lost) ·
  `loading` (providers resolving) · `error` (= that section degrades) · `success` (= populated/aggregated). The
  review-only `InsufficientHistory` is a typed **error case on the deferred review seam** (`contract.md:41`), NOT
  one of the reused render-state literals — it is out of the M1.0 dashboard scope. `[FACT: journals/identity.md:51-54; UX-4 canon]`
- **BR-5 — agenda is ONE day.** The agenda reads `dueIn` for a **single-day range** (today); it is a single
  embedded day, NOT the range Calendar (a separate surface). `[FACT: journals/identity.md:45-46]`
- **BR-6 — personalization selection.** Per module + granular, the user selects which `dataPoints` show: a global
  default (Preferences seam) + a per-journal override (`summary_config`). Modeled here as a typed contract;
  storage is downstream. `[INTENT: journals/contract.md:23-24, identity.md:32-33 (J2/J4)]`
- **BR-7 — Home = the `/` index route.** The model declares that `/` renders the Journal daily dashboard (into the
  UI-4 shell `<Outlet/>`); the JSX render itself is downstream. `[FACT: ux-1/baseline.md:68; ui-4/_index.md:29]`

## 3. Contract (the typed declarative artifact — `apps/web/src/home/`)

> Design-model shape, per the UX-3/UX-5 precedent — pure types + data + pure logic, all module-facing runtime as a
> **deferred seam**. NO `/contract` (no rendered component in scope).

- **`section-model.ts`** — `HOME_SECTIONS` (the three-section model + order/placement within UX-3 regions) +
  `HomeSectionKey` union + each section's render-intent (which UI-1/UI-2 primitive/view renders it: summary → a
  data-view/list, agenda → list, entry → the N&P editor mount seam).
- **`journal-contribution.ts`** — the **journal-contribution registry seam** as a typed contract (per
  `journals/contract.md` `[INTENT]`; mirrors ADR-004's registry pattern): `JournalContribution` + `SectionData` +
  `registerJournalContribution` **signature only** — throws its own `JournalSeamNotActivated`, following the AR-9
  `SyncNotActivated` precedent (`packages/core/src/sync/types.ts:7`); UX-6 defines its own, does NOT import the
  sync one. Names no module.
- **`terminal-state` reuse** — `import type { TerminalState }` (the four-literal canon); **do NOT call
  `deriveTerminalState`** — that derives state from a _live React-Query result_, which a data-less design model
  has none of (the query→state derivation is the downstream engine's, MOD-journals #33). UX-6 owns only the
  **degrade composition** over already-resolved per-section states (BR-3). No new terminal-state literals.
- **`selection.ts`** — the personalization model: `getSelection()/setSelection(perModule)` **signatures** + the
  default-resolution pure logic (global default ← per-journal override); storage deferred (MOD-prefs/MOD-journals).
- **`docs/core/architecture/home-journal-dashboard.md`** + README row — the durable design doc.

## 4. Acceptance

- [ ] `apps/web/src/home/{section-model,journal-contribution,section-state,selection}.ts` — typed, `pnpm typecheck` 0.
- [ ] The three-section model (BR-1) + placement within UX-3 regions is declared as data, not JSX.
- [ ] The provider-registry seam (BR-2) is a typed contract that **names no module** and does not execute (deferred seam).
- [ ] The section-degrade model reuses the `TerminalState` **type** (BR-4, no new literal) and composes per-section
      states **independently** (BR-3) — the query→state `deriveTerminalState` derivation is UX-4's/the engine's, NOT
      re-tested here; `InsufficientHistory` is NOT among the states (deferred review seam).
- [ ] Personalization selection (BR-6) **default-resolution logic** is pure + unit-tested (NOT the deferred `setSelection` storage path).
- [ ] **Fenced OUT (asserted by absence):** no `journal-service.ts` engine, no real module `summary(date)`/`dueIn`
      providers, no `pages`/`/summary`/editor code, no snapshot/review engine, no rendered React component, no route JSX change.
- [ ] `docs/core/architecture/home-journal-dashboard.md` + `apps/web/src/home/CLAUDE.md` written; README row added.
- [ ] Tests for all pure logic (section model, terminal-state derivation, selection default). No Visual Gate (design model).
- [ ] Downstream seams named with homes: engine → MOD-journals #33 (M1.1) · providers → each MOD-\* · render → Phase-1b · review → design-pass/Wave 3-4.

## 5. Implementation Prompt

> Build sequence for the DESIGN MODEL in `apps/web/src/home/` — flat `.ts` files, colocated `*.test.ts`, no
> barrel, per-dir `CLAUDE.md` (the UX-3/UX-4/UX-5 precedent). **No `.tsx`, no route change, no engine** — those
> are Phase-1b/MOD-journals. Preflight PASSED 2026-08-17; reuse targets verified importable:
> `deriveTerminalState`/`TerminalState` (`state-conventions/terminal-state.ts` → `@vida/core` canon) ·
> `ShellRegion` (`shell/regions.ts:8`) · the `SyncNotActivated` pattern (`@vida/core sync/types.ts:7`, pattern only).

1. **`home/section-model.ts`** — the three-section model (BR-1, BR-7):
   - `type HomeSectionKey = 'summary' | 'agenda' | 'entry'`.
   - `type SectionRenderHint = 'data-view' | 'list' | 'editor-seam'` — names the _intended_ UI-1/UI-2 renderer as
     a string, **imports no component** (design model, not a render).
   - `const HOME_SECTIONS: readonly HomeSection[]` where `HomeSection = { key, title, region: ShellRegion, renderHint }`
     — placement references `import type { ShellRegion }` from `shell/regions.ts` (the region is the shell's; the
     placement is Home's data). summary+agenda+entry → `region: 'content'`.
2. **`home/journal-contribution.ts`** — the registry seam (BR-2), signature-only:
   - `type DataPoint = { id; label }` · `type SectionData = { sectionKey: HomeSectionKey; dataPoints: DataPoint[]; state: TerminalState }`.
   - `type JournalContribution = { module: string; sectionKey: HomeSectionKey; dataPoints: DataPoint[]; summary(date: string): SectionData; dueIn(range: DateRange): SectionData }` — **names no module** (a `module` _field_, not a hard reference).
   - `class JournalSeamNotActivated extends Error` (defined here, following AR-9 — does NOT import `SyncNotActivated`).
   - `function registerJournalContribution(_def: JournalContribution): never { throw new JournalSeamNotActivated(...) }` — the deferred runtime seam (MOD-journals #33 activates it).
3. **`home/section-state.ts`** — the degrade **composition** model (BR-3, BR-4):
   - `import type { TerminalState } from '../state-conventions/terminal-state'` — reuse the 4-literal canon **type**;
     declare no new literal and **do not call `deriveTerminalState`** (no query exists to derive from — that is the
     downstream engine's per-section job).
   - `function resolveDashboardStates(sections: readonly SectionData[]): Record<HomeSectionKey, TerminalState>` —
     reads each section's **already-resolved** `state` and maps per-section so one `'error'` never overwrites its
     siblings (per-section degrade). `InsufficientHistory` is NOT modeled here (deferred review seam).
4. **`home/selection.ts`** — personalization (BR-6):
   - `type JournalSelection = Record<string /*module*/, string[] /*enabled dataPoint ids*/>`.
   - pure `function resolveSelection(globalDefault: JournalSelection, perJournalOverride?: Partial<JournalSelection>): JournalSelection` — override wins per module; **unit-tested**.
   - `getSelection`/`setSelection` **signatures only** (storage deferred → MOD-prefs/MOD-journals) — throw the seam error or typed-`TODO`, per the AR-9 precedent.
5. **Tests** (colocated): `section-model.test.ts` (shape + region placement) · `journal-contribution.test.ts` (seam throws `JournalSeamNotActivated`; type-level contribution shape) · `section-state.test.ts` (one failed section → only its `error`, siblings resolve) · `selection.test.ts` (override-wins default resolution).
6. **`home/CLAUDE.md`** — layer doc (the design model, its seams, the downstream homes).
7. **`docs/core/architecture/home-journal-dashboard.md`** + a README row inserted **directly after `onboarding.md`
   (README.md:40), before `module-dependency-graph.md` (:41)** — appended to the experience-track cluster (UX-1…UX-6),
   NOT the table tail. The durable design doc.
8. **Verify:** `pnpm typecheck` 0 · `pnpm --filter @vida/web test` green · assert-by-absence the fences (§4): no `.tsx` in `home/`, no `routes.tsx` change, no `journal-service.ts`, no `pages`/`/summary` code. Currency (§XXIX): write the two docs WITH the code.

## 6. Open UNKNOWNs / Decisions Needed

- [RESOLVED 2026-08-17] deliverable shape — **design model** (see §1 + Step-1 3-signal check).
- [RESOLVED 2026-08-17] aggregation boundary — the journal-contribution registry **seam** (typed, deferred; mirrors ADR-004's pattern) is designed
  here; the `journal-service.ts` engine + real module `summary(date)`/`dueIn` feeds are downstream (MOD-journals #33 /
  each MOD-\*, Phase-1b). `[FACT: journals/identity.md:15-16 "0 lines INTENDED"; contract.md:5]`
- [RESOLVED 2026-08-17] region reuse — `apps/web/src/home/` **imports the `ShellRegion` type** from
  `shell/regions.ts` (an exported value/type, `regions.ts:8`); the section→region PLACEMENT is Home's own data.
  The regions are the shell's; Home only references them by type.

## 7. Change Log

| Date       | Session                     | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-09 | ux-6-home-journal-dashboard | initial stub (scaffolded by /task-new)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-08-17 | ux-6-home-journal-dashboard | forward spec authored — shape resolved to DESIGN MODEL (Step-1 3-signal, docs-fixed); §2–§4 filled + §6 UNKNOWNs resolved, grounded in `docs/features/journals`.                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-08-17 | ux-6-home-journal-dashboard | Gate-1 independent critique = REVISE → all fixed: B1 (terminal states 5→4 canon, drop `InsufficientHistory`) · M1/M2 (journal-contribution registry is `[INTENT]`/mirrors ADR-004, not decided by it; `[FACT]`→`[INTENT]`) · M3 (`JournalSeamNotActivated` following AR-9 `SyncNotActivated`, not a generic import) · m1 (region reuse = import `ShellRegion` type) · m2 (`dueIn` single-day range) · m3 (selection default-resolution logic tested, not storage). Approval 1 (Victor).                                                                                       |
| 2026-08-17 | ux-6-home-journal-dashboard | Preflight PASSED (reuse targets verified importable; all OUT layers fenced with named homes). §5 implementation plan drafted — 4 `.ts` model files + 4 tests + CLAUDE.md + arch doc, no `.tsx`/route/engine.                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-08-17 | ux-6-home-journal-dashboard | Gate-2 independent plan critique = REVISE → all fixed: MAT-1 (`section-state.ts` must NOT call `deriveTerminalState` — no live query in a data-less model; reuse the `TerminalState` TYPE + compose already-resolved per-section states; derivation is the downstream engine's) · MAT-2 (§4 acceptance reworded to match — no derivation test) · MIN-1 (README row placed after `onboarding.md`:40 before `module-dependency-graph.md`:41, not table tail). Reuse/fence/build-order/coverage confirmed sound. Approval 2 (Victor).                                            |
| 2026-08-17 | ux-6-home-journal-dashboard | IMPLEMENTED — `apps/web/src/home/{section-model,journal-contribution,section-state,selection}.ts` + 4 tests + `CLAUDE.md` + `docs/core/architecture/home-journal-dashboard.md` + README row. typecheck 0 · @vida/web **180 tests** (+15) · lint 0-err. Strict-TS caught the `resolveSelection` `Partial` merge type-hole (fixed with an undefined-skipping merge). §3 file name `home-model`→`section-model` reconciled. **Post-impl independent critique = SHIP** (no blocker/material; BRs enforced-not-asserted, tests prove isolation/override/inert-seam, fences clean). |
