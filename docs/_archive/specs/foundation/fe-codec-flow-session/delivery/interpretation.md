# fe-codec-flow-session — Interpretation Layer (Entity Delivery Flow ②, Step 1)

> **Unit:** LIF-210 · ② Frontend CODEC #11 · the **Flow/Session shell** — _deliverable-per-stage · attach
> (doc/photo/audio) · mark-done/proof · effect-rail log_. G6 net-new. Blocked by `fe-codec-patterns` (#2) +
> `fe-codec-entity-facet` (#6) [FACT: docs/specs/foundation/frontend-replan/reconstructed-structure.md:31].
> **Scope:** web, M1.0. The **4th archetype shell** (Collection #4 ✅, Dashboard #5 ✅, Entity #6 ✅, **Flow/Session #11 ← this**)
> — it FRAMES a staged progression (a sequence of stages, each with a deliverable + attach + done/proof) + an effect-rail log,
> over ui-1/ui-2 primitives + fe-codec-theme tokens + the fe-codec-patterns kit. It is a **flow FRAME**, not a stage renderer,
> not the timer, not the runtime page [FACT: frontend-quality-bar/_index.md:134-139; decomposition.md:33].
> **Method:** process.md §XXVI Step-1 **3-lens audit** (WRONG / MISSING / OVERFLOWING) over the three frozen shell precedents
> (collection-view · dashboard-view · entity-view) + the §4.5 archetype definition + the G1 Quality Bar. No guessing — the
> governing docs + the shipped siblings' resolved homes are READ, not decided; anything genuinely open goes to Victor.

---

## 0. What this unit is

The **Flow/Session shell** — the archetype behind every **staged, do-this-then-that** surface in the OS: a session you run
to completion, a routine you step through, a wizard you fill, a drill you grind. It is defined as:

> **Flow / Session** = _"a **deliverable-per-stage page** + the persistent HUD"_ [FACT: decomposition.md:33] — concretely,
> _"entity title + summary · the current **stage** · the **deliverable + a description of what it should be** · **attach**
> (document / photo / audio / file) · **mark-done or require proof**"_, and _"sessions **log to the entity via the effect
> rail**"_ [FACT: frontend-quality-bar/_index.md:134-138]. Session **types are open/extensible** (study · class · focus ·
> reading · practice · workout · work · review · user-made) [FACT: quality-bar/_index.md:136; ADR-004-session-framework.md:33-35].

**Where it sits — a FLOW FRAME that composes consumer-supplied stage bodies + a persistent effect log:**

```
the session/flow data (↑ @vida/core, apps/web)   THIS UNIT (FlowSessionView, @vida/ui)   the stage bodies (↓ consumer slots)
  sessions row + sub_type + status      ─────────▶ Flow/Session shell          ──▶ STAGE body (per stage):
  session_attachments / note_attachments            • frame the staged progression   deliverable + description + the
  effect rail (applied_effects)                     • the current stage + sequence    attach affordance + mark-done/proof
  isEntityType() + the attached entity              • the attach / done-proof slots   (consumer renders the body; wires
                                                    • the effect-rail LOG surface ──▶ EFFECT-RAIL log entries:
                                                    • per-stage/flow a11y + state       log_time · measurement · xp …
                                                                                        (consumer supplies the entries)
```

> **The Flow shell renders NO stage internals and fires NO effects — the load-bearing contrast, identical to its three
> siblings.** Collection composed the 7 view renderers; Dashboard composed block widgets; Entity composed two facets; the Flow
> shell composes **a sequence of stage bodies + a log of already-fired effects**, and _neither the stage body nor the effect
> write is this unit's job_ [FACT: collection-view.tsx:17-20; dashboard-view.tsx:17-24; entity-view.tsx:9-27]:
>
> - The **stage body** (what a deliverable + its description + the attach control + the proof affordance actually look like for
>   _this_ flow) is the consumer's — a focus session's stage ≠ a grading-builder's stage ≠ a book-wizard's step.
> - The **effect rail** is an ADR-004 **backend** mechanism — the framework fires a catalogued set of writes on lifecycle
>   transitions (`complete_habit · log_time · emit_measurement · … · award_xp · surface_journal · surface_calendar`)
>   [FACT: docs/core/decisions/ADR-004-session-framework.md:60-62]. The shell only **displays the log** of what fired; it owns
>   no write. The shell emits lifecycle INTENTS via callbacks (the pomodoro-widget precedent — _"emits lifecycle intents via
>   callbacks"_) and the app wires the real transition/effect service [FACT: packages/ui/src/CLAUDE.md:273 "pomodoro-widget"].
>
> **So this unit builds the FRAME that sequences consumer-supplied stage bodies, surfaces the attach + done/proof affordances,
> and presents the effect-rail log** — the Collection/Dashboard/Entity agnostic-composition move, applied to a staged flow.
> The genuinely novel thing `FlowSessionView` owns that its siblings don't: **the staged-deliverable progression + the
> effect-rail log surface**.

> **The timer is NOT in this unit.** _"A persistent timer HUD follows the user across the OS"_ is a **separate** shell element
> — region 6, `fe-session-hud` #16 (_"persistent timer + stage + controls; reads active `focus` session"_)
> [FACT: quality-bar/_index.md:137,154; decomposition.md:57; g6-reshape-runbook.md:50]. The countdown widget itself already
> ships (ui-2 V5 `pomodoro-widget`) [FACT: packages/ui/src/CLAUDE.md "pomodoro-widget is UI-2 · V5"]. This shell frames the
> **deliverable-per-stage** structure; the HUD composes the timer + a stage glance on top of it.

---

## 1. DEPENDENCIES (frozen contracts — this unit builds ON, never patches around)

- **The three shipped archetype-shell siblings** — the exact SHAPE precedent: a presentational shell that composes foreign
  bodies via a render-prop/slot, holds no data, uses LOCAL union types, threads state-as-prop (BR-2), degrades-never-crashes,
  React-19 ref-as-prop (no `forwardRef`), DIRECT tokens, no sub-theme. `CollectionView` (a switcher shell) [FACT:
  collection-view.tsx:9-25], `DashboardView` (a grid shell, per-cell state, `renderBlock` only for success) [FACT:
  dashboard-view.tsx:8-28,164-220], `EntityView` (a facet frame, merged/tabbed, slot-gated editor) [FACT:
  entity-view.tsx:34-66,116-207]. The Flow shell is the same shape with a **staged-sequence** composition + an **effect-log**
  surface.
- **`fe-codec-entity-facet` `EntityView` (#6 ✅ — a declared blocker)** — the runtime page shows _"entity title + summary"_
  at its head [FACT: decomposition.md:70; quality-bar/_index.md:134], i.e. the identity of the entity the session/flow is
  _about_ (ADR-004 attachment). The `#6` dep means the Flow shell **composes or mirrors the EntityView header chrome** for
  that attached-entity identity. The exact relationship — compose `EntityView` as the host vs reuse only its serif-title header
  pattern — is a §6 precision (resolved at greybox/`/contract`) [FACT: reconstructed-structure.md:31 deps `#2 #6`;
  entity-view.tsx:143-158].
- **`fe-codec-patterns` kit (#2 — a declared blocker)** — all SHIPPED:
  - `EmptyState` — a no-stages / nothing-to-do empty [FACT: packages/ui/src/index.ts:50; CLAUDE.md "EmptyState (S3)"];
  - `SyncStatus` + `HonestProgress` — the flow's save state + an honest determinate/indeterminate progress bar
    (`transform: scaleX`, never animated width) [FACT: packages/ui/src/index.ts:52-55; CLAUDE.md "SyncStatus + HonestProgress"];
  - the **8-state machine** the shell threads per stage/surface as a PROP (it lives in `apps/web`
    `state-conventions/interaction-state.ts` — it imports the `@vida/core` canon, so it can't live in `@vida/ui`) [FACT:
    packages/ui/src/CLAUDE.md "The 8-state machine itself lives in `apps/web`"];
  - `ReducedMotion` (`hooks/use-reduced-motion.ts`) gating any stage-transition motion [FACT: packages/ui/src/CLAUDE.md "hooks/"].
- **ui-1 / ui-2 primitives REUSED** — `Button` (the mark-done / attach / proof actions), `Card` (a stage frame, per the
  dashboard-cell precedent), `Tabs` only if a flow is tabbed (unlikely — a flow is sequential, not same-data), the
  `timeline`/`list` data-view spine as a candidate for the stage rail + the effect-rail log (both are ordered sequences —
  `internal/data-view`) [FACT: packages/ui/src/CLAUDE.md "timeline is UI-2 · V3"; "list-view is UI-2 · V1"]. The exact
  primitive the stage-rail and the effect-log reuse is a decomposition/greybox call (§6 precision 2).
- **fe-codec-theme tokens** — DIRECT semantic tokens; serif `$display` for the flow/stage title, **tabular figures** for any
  counts/durations, **eyebrow** `$caption`-uppercase for the stage label, the accent flipped per preset via
  `useTheme().get('web')`; dimensions via the token SCALE (radius `card → $lg`), never a sub-theme key, no hard-coded palette
  [FACT: packages/ui/src/CLAUDE.md "Dimension props read the TOKEN SCALE"; "tabular"; "eyebrow"; "accent … useTheme().get('web')"].
- **The SHIPPED ADR-004 contracts the app-plane adapter binds (`@vida/core`, uncrossable from `@vida/ui`)** — the **4-dimension
  Integration Contract** (_Attachment · Effects · Lifecycle · Permissions_) [FACT: ADR-004-session-framework.md:19]: the
  `session_attachments` polymorphic links (type/instance) [FACT: ADR-004:57-58], the catalogued **effect set** fired on
  lifecycle transitions [FACT: ADR-004:60-62], the lifecycle state machine `scheduled|planned → in_progress → completed |
skipped | missed | rescheduled` [FACT: ADR-004:65], the permissions guardrail (effects scoped to attachments, no
  double-count, subset-of-shipped) [FACT: ADR-004:69-71]; `note_attachments` (encrypted file blobs — doc/photo/audio) [FACT:
  packages/core/src/db/schema/notes.ts:90-92] + the `deliverable_note` page per stage [FACT: quality-bar/_index.md:138,155].
  The adapter maps the real session + its attachments + its fired-effect log → the shell's props — it does NOT invent a table.

### THE boundary that governs every home (load-bearing)

**`@vida/ui` CANNOT import `@vida/core` NOR `@vida/types`** — deps are `@tamagui/*` + `date-fns`/`sigma`/`graphology` ONLY
[FACT: packages/ui/package.json — all three shipped shells split on this]. So the Flow shell **SPLITS across two planes**,
exactly as Collection + Dashboard + Entity split [FACT: collection-view.tsx:23-25; dashboard-view.tsx:12-14; entity-view.tsx:20-23]:

| plane          | what                                                                                                                                                                                                                                                                                                                                                                                                   | why                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| **`@vida/ui`** | the presentational **`FlowSessionView`** — the flow frame: header (attached-entity title/summary) + the staged progression (current stage + the sequence) + the per-stage deliverable/attach/done-proof slots + the effect-rail LOG surface + per-stage threaded state; stage bodies + log entries supplied as **slots/render-props**, structurally typed; lifecycle **intents** emitted via callbacks | presentational, state-as-prop (BR-2); no `@vida/core`/`@vida/types` import |
| **`apps/web`** | the **canon-wiring convention** — map a real `sessions` row (sub_type · status · stages) + its `session_attachments`/`note_attachments` + its fired-effect log → the shell's props; wire the attach / mark-done / proof intents to the sessions service (`transition`/`attach`); resolve the attached entity via `isEntityType()`                                                                      | imports `@vida/core` → can't live in `@vida/ui`                            |

## 2. NEEDS (what the unit must deliver)

1. **`FlowSessionView` (`@vida/ui`, presentational)** — the flow frame:
   - a **flow header** — the attached-entity Title (+ an optional summary slot + an action slot), region-named via
     `warnMissingName`/`useId` (the sibling accessible-name convention) [FACT: entity-view.tsx:134-137; dashboard-view.tsx:179-188];
   - a **staged progression** — the **current stage** made prominent + the **sequence** of stages (done / current / upcoming),
     a read presentation of where the user is; CONTROLLED (the app owns which stage is active) [FACT: quality-bar/_index.md:134-135;
     decomposition.md:70];
   - a **per-stage body slot** — the consumer renders the stage's **deliverable + its description + the attach affordance
     (doc/photo/audio/file) + the mark-done/require-proof action**; the shell frames it + surfaces the attach/done/proof
     **affordances**, the consumer wires them [FACT: quality-bar/_index.md:135-136];
   - an **effect-rail log surface** — a chronological, calm presentation of the effects that have fired for this flow
     (`log_time`, measurement signals, xp…); the consumer supplies the entries (read-only; the shell never fires) [FACT:
     quality-bar/_index.md:137-138; ADR-004:60-62];
   - **per-stage/flow state threading** — each surface renders its own `loading`/`empty`/`error`/`success` as a PROP (BR-2),
     the shell degrades-never-crashes [FACT: dashboard-view.tsx:120-162; entity-view.tsx:81-113];
   - **lifecycle intents** emitted via callbacks (`onAttach`, `onMarkDone`/`onRequireProof`, `onAdvanceStage`…), never a write
     (the pomodoro-widget `onStart/onComplete` precedent) [FACT: packages/ui/src/CLAUDE.md:273];
   - **responsive** — the staged layout + the effect log behave sanely 375 → 768 → 1440 (the collection-view `useTabletUp`
     reflow precedent) [FACT: collection-view.tsx:37-52,143].
2. **The stage descriptor + slot/render-prop types** — a typed way for a consumer to declare each stage and render its body +
   the effect-log entries, keeping `FlowSessionView` agnostic of both **and** free of any `@vida/core`/`@vida/types` type
   (LOCAL unions ≡ the canon, the `ViewLayout`/`CellSize`/`FacetMode` precedent) [FACT: collection-view.tsx:23-25;
   dashboard-view.tsx:27-28; entity-view.tsx:30-32].
3. **The `apps/web` session/flow↔FlowSessionView adapter CONVENTION** — the documented shape a consumer uses to map a
   `sessions` row + attachments + the fired-effect log into `FlowSessionView` props and to wire the attach/done/proof intents
   to the sessions service. **Whether this ships as code or type+convention is a Step-2 decomposition call** (no _built_
   consumer exists — the runtime page #23 / HUD #16 / module flows ship after #11; the Collection/Dashboard/Entity adapter
   precedent: ship pure mapping + types + convention now, defer the live hook) [FACT: fe-codec-entity-facet/delivery/interpretation.md R3].
4. **Visual-Gate harness** — a Storybook specimen: a multi-stage flow (done/current/upcoming) × single-stage × with-effect-log /
   empty-log × mixed per-stage states, exercising the 375/768/1440 reflow + a11y (the ui-2 sibling precedent).
5. **Specs** — `docs/specs/components/ui-2-platform-views/flow-session-view.md` (+ `_index.md` update).

## 3. ORGANIZATION (where each piece slots — governed by §1's boundary)

```
@vida/ui        components/flow-session-view.tsx     FlowSessionView — flow frame: header + staged progression + per-stage slot + effect-rail log + per-stage state (net-new, presentational)
                components/flow-session-view.stories.tsx  the Visual-Gate surface (multi/single stage × with/without effect log × states)
                components/entity-view.tsx          COMPOSED / mirrored for the attached-entity header (the #6 dep — §6 precision 1)
                components/card.tsx · button.tsx     REUSE (stage frame · attach/done/proof actions)
                components/timeline.tsx | list-view.tsx  CANDIDATE reuse for the stage rail + the effect-rail log (ordered sequences) — §6 precision 2
                components/empty-state.tsx · sync-status.tsx  REUSE (no-stages empty · flow save state + HonestProgress)
                internal/data-view.tsx              REUSE ViewState + warnMissingName
                hooks/use-reduced-motion.ts         REUSE (gate stage-transition motion)
                index.ts                            + export { FlowSessionView, its stage/intent types }
apps/web        sessions/ (or state-conventions/)   the session/flow↔FlowSessionView adapter convention (code OR type+convention per
                                                    Step-2) — imports @vida/core (sessions service, isEntityType, attachments)
packages/core   services/sessions · schema/sessions  the sessions spine + effect rail + attachments (READ/dispatched by apps/web, frozen)
docs/specs/components/ui-2-platform-views/flow-session-view.md · _index.md (updated)
— OUT of this unit (homed by the docs):
  • the persistent timer HUD (region 6) → fe-session-hud #16 [FACT: decomposition.md:57; g6-reshape-runbook.md:50]
  • the session runtime PAGE (the live deliverable-per-stage route) → fe-session-runtime #23 [FACT: g6-reshape-runbook.md:57]
  • the countdown timer widget → pomodoro-widget (ui-2 V5 ✅) [FACT: packages/ui/src/CLAUDE.md "pomodoro-widget is UI-2 · V5"]
  • the effect WRITES (log_time/measurement/xp) + the lifecycle transition engine → @vida/core services/sessions + the AR-7 effect rail (#32) [FACT: ADR-004:60-65]
  • the attachment STORAGE (note_attachments blobs) + the deliverable_note pages → @vida/core schema (frozen; READ) [FACT: notes.ts:90-92]
  • per-module flow SURFACES + live data (routine-run · grading-builder · book-wizards · flashcard-drill · onboarding · check-ins) → each owning module's ② track [FACT: decomposition.md:70,87,90-92]
  • the sub-type registry / open session types → @vida/core (AR-5/AR-7, frozen; READ) [FACT: ADR-004:33-35,48]
```

## 4. IMPLICIT RULES (caught here, not in the browser)

- **The Flow shell is a flow FRAME, not a stage renderer and not the timer** — it sequences consumer-supplied stage bodies +
  presents the effect-rail log; it owns the header + the staged progression + the attach/done/proof affordances + per-stage
  state threading, never a stage's internals nor the countdown [FACT: quality-bar/_index.md:134-138,154; decomposition.md:57].
- **The shell FIRES no effects — it DISPLAYS the effect-rail log and EMITS lifecycle intents** — effects are an ADR-004
  backend mechanism fired by `@vida/core` on lifecycle transitions; the shell shows what fired and calls back
  (`onMarkDone`…), the app does the write (the pomodoro-widget intent-emit precedent) [FACT: ADR-004:60-62;
  packages/ui/src/CLAUDE.md:273].
- **The timer + the persistent HUD are NOT built here and are NOT this unit** — region 6 (`fe-session-hud` #16) + the shipped
  pomodoro widget own the countdown; a wrong read would embed a timer this unit has no business owning [FACT:
  decomposition.md:57; quality-bar/_index.md:154; g6-reshape-runbook.md:50].
- **`state` is a PROP across the package boundary** (BR-2) — `@vida/ui` never derives; the app derives via the 8-state machine
  - passes it, per stage/surface [FACT: dashboard-view.tsx:38-39; entity-view.tsx:117-118; list-view.tsx state-as-prop].
- **The attached-entity identity is CONSUMED, not owned** — the header shows the entity the session is _about_ (ADR-004
  attachment), resolved in `apps/web` (`isEntityType()` + the entity row); the shell takes it as a title/summary slot (the #6
  dep — compose/mirror EntityView's header) [FACT: ADR-004:57-58; decomposition.md:70; entity-view.tsx:143-158].
- **Degrade, never crash** — a no-stages / nothing-to-do flow renders a calm `EmptyState`, not a blank; an errored surface
  renders a calm `role="status"`, never `$colorSignalDanger` (fails AA 4.5 light — the ds-2 M4 fix) [FACT:
  dashboard-view.tsx:147-157; entity-view.tsx:100-109].
- **LOCAL union types, structural typing** — the stage/intent types are LOCAL unions ≡ the canon, no `@vida/core`/`@vida/types`
  import; the app passes real values, assignable structurally [FACT: collection-view.tsx:23-25; entity-view.tsx:30-32].
- **A flow is SEQUENTIAL, not same-data-switched** — the staged progression is an ordered walk (done → current → upcoming),
  NOT a toolbar view-switch (collection-view) nor necessarily Tabs (entity-view); the right primitive for the stage rail is a
  decomposition/greybox call, likely the `timeline`/`list` ordered spine [FACT: quality-bar/_index.md:134-135;
  packages/ui/src/CLAUDE.md "timeline"/"list-view"].
- **React 19 ref-as-prop, NO `forwardRef`; DIRECT semantic tokens (serif `$display`, tabular figures, eyebrow, accent via
  `useTheme().get('web')`); token-scale dimensions; reduced-motion honored** (the shared shell conventions) [FACT:
  entity-view.tsx:116-133; packages/ui/src/CLAUDE.md].
- **Accessible name + per-stage region a11y; the effect log is a calm `role="status"`/list, not an alert** — the flow region
  is named (`warnMissingName`); the effect-rail log is a polite status/list, never `role="alert"` (it's a running record, not
  a live critical insertion — the Toast/list contrast) [FACT: dashboard-view.tsx:180-182; packages/ui/src/CLAUDE.md "list-view … role=status"].
- Consume the frozen collection/dashboard/entity/tabs/theme/patterns/sessions contracts; if one looks wrong, STOP — don't
  patch the frontend around it [FACT: process.md:113].

---

## 5. THE 3-LENS AUDIT

### WRONG — contradicts a standard or a bar decision

- _(none found.)_ The flow-frame / stage-body split, the display-the-log-emit-intents boundary, the timer-is-the-HUD's
  separation, and the state-as-prop boundary are all consistent with the canon + all three shipped siblings' resolved homes +
  the pomodoro-widget's deferred-session-engine seam.

### MISSING — the archetype requires it, nothing exists

- **M1** **No Flow/Session shell** — every staged surface in the OS needs one; `@vida/ui` ships no `FlowSessionView` and no
  staged-deliverable frame [FACT: grep clean — no FlowSession/FlowView/StageRail/StepFlow in packages/ui or apps/web; agent map].
- **M2** **No staged-deliverable progression primitive** — the data-views render lenses (list/timeline/board…), but none
  frames a _do-this-then-that_ sequence with per-stage deliverable + attach + done/proof [FACT: packages/ui/src/CLAUDE.md
  (8 UI-2 views are read-lenses + the pomodoro timer); grep clean].
- **M3** **No effect-rail LOG surface** — the `SyncStatus` pill shows a single save state; no component presents a chronological
  log of fired session effects [FACT: packages/ui/src/CLAUDE.md "SyncStatus"; grep clean].
- **M4** **No session/flow↔FlowSessionView adapter convention** in `apps/web` — the documented shape mapping a `sessions` row +
  attachments + the effect log into `FlowSessionView` props + wiring the intents [FACT: apps/web/src surface dirs are `.gitkeep`].

### OVERFLOWING — past this shell's job (homed by the docs, NOT deferred)

- **O1** **The persistent timer HUD (region 6)** → `fe-session-hud` #16 — a separate shell element, not this unit [FACT:
  decomposition.md:57; quality-bar/_index.md:154; g6-reshape-runbook.md:50].
- **O2** **The session runtime PAGE** (the live route composing this shell with real data) → `fe-session-runtime` #23 [FACT:
  g6-reshape-runbook.md:57].
- **O3** **The countdown timer widget** → `pomodoro-widget` ui-2 V5 ✅ (composed by the HUD, not rebuilt) [FACT:
  packages/ui/src/CLAUDE.md "pomodoro-widget is UI-2 · V5"].
- **O4** **The effect WRITES + lifecycle transition engine** (`log_time`→`task_time_logs`, measurement, xp; `transition()`) →
  `@vida/core` services/sessions + the AR-7 effect rail (#32); the shell only displays + emits intents [FACT: ADR-004:60-65].
- **O5** **Attachment STORAGE + deliverable_note pages** (`note_attachments` encrypted blobs; the per-stage page) → `@vida/core`
  schema (frozen; READ by the adapter) [FACT: notes.ts:90-92; quality-bar/_index.md:138].
- **O6** **The sub-type registry / open session types** → `@vida/core` (AR-5/AR-7, frozen; READ) [FACT: ADR-004:33-35,48].
- **O7** **Per-module flow SURFACES + live data** (routine-run · grading-builder · book-wizards · flashcard-drill · onboarding ·
  check-ins · gamification rule-authoring) → each owning module's ② track [FACT: decomposition.md:70,87,90-92;
  g6-reshape-runbook.md:57-70].

---

## 6. RESOLVED BY DOCS (stated as FACT — read from the governing docs + the sibling gates, not decided)

- **R1 — Scope = the Flow/Session shell = a flow FRAME (attached-entity header + staged progression + per-stage
  deliverable/attach/done-proof slots + an effect-rail log + per-stage state).** Not the timer (→ #16 / V5), not the runtime
  page (→ #23), not the effect writes (→ @vida/core / #32), not the attachment storage (→ @vida/core), not per-module flow
  surfaces [FACT: quality-bar/_index.md:134-139,154; decomposition.md:33,57,70; reconstructed-structure.md:31].
- **R2 — Splits across planes (BR-2).** Presentational `FlowSessionView` → `@vida/ui` (slots + staged progression + state as
  props; emits intents); canon-wiring (sessions service, attachments, effect-log map, entity resolve) → `apps/web`. The
  Collection + Dashboard + Entity splits are the exact precedents [FACT: collection-view.tsx:23-25; dashboard-view.tsx:12-14;
  entity-view.tsx:20-23].
- **R3 — The `apps/web` adapter ships the pure mapping + types + convention; only the LIVE hook defers.** No _built_ consumer
  exists; the runtime page / HUD / module flows ship after #11. The Collection/Dashboard/Entity adapters are the exact
  precedent (ship pure mapping + types + convention now; defer the live React-Query hook to the first consumer) [FACT:
  fe-codec-entity-facet/delivery/interpretation.md R3]. Ratified at Step 2.
- **R4 — The shell DISPLAYS the effect-rail log and EMITS lifecycle intents; it fires no effect and does no write.** Effects
  are ADR-004 backend writes fired by `@vida/core`; the shell shows the fired-log + calls back (the pomodoro-widget intent
  precedent) [FACT: ADR-004:60-62; packages/ui/src/CLAUDE.md:273].
- **R5 — The timer + persistent HUD are a SEPARATE unit (#16) over the shipped pomodoro widget (V5); this shell owns the
  staged-deliverable frame only** [FACT: decomposition.md:57; quality-bar/_index.md:154; g6-reshape-runbook.md:50].
- **R6 — Each stage/surface threads its own `ViewState` as a PROP; degrade never crashes; LOCAL unions; React-19 ref-prop;
  DIRECT tokens (serif/tabular/eyebrow/accent-flip); reduced-motion honored** [FACT: dashboard-view.tsx:38-39,120-162,164-185;
  entity-view.tsx:116-133].

### Two precisions kept (flagged, not silently decided)

1. **The #6 (entity-facet) relationship** — the runtime page shows _"entity title + summary"_ [FACT: decomposition.md:70], and
   #11 declares a hard dep on #6. Does the Flow shell **compose `EntityView` as its host** (the flow lives as a facet/section
   inside the entity shell) or **reuse only EntityView's serif-title header pattern** for the attached-entity identity? The
   greybox answers it; grounded, not guessed [FACT: reconstructed-structure.md:31 deps `#2 #6`; entity-view.tsx:143-158].
2. **The stage-rail + effect-log primitive** — both are ordered sequences; the `timeline` (continuous rail, present/past/future
   temporal state — a near-perfect fit for done/current/upcoming) and the `list` spine are the candidates. Which the stage rail
   and the effect log reuse (and whether the stage rail is vertical/horizontal) is a greybox/`/contract` decision [FACT:
   packages/ui/src/CLAUDE.md "timeline is UI-2 · V3" (getTemporalState past/present/future); "list-view is UI-2 · V1"].

## 7. ENVISION GATE (Step 1.5) — FIRES (doc test §3.75, applied to facts — NOT a decision)

The firing is a **mechanical one-question test**, not a judgment or a human choice; the human's role is the blocking _review_
of the greybox, not whether the gate fires [FACT: entity-delivery-flow.md:104-107,129-132;
[[envision-gate-firing-is-a-doc-test-not-a-human-decision]]].

**Test:** _"Is there a user affordance whose UI answer isn't already obvious from an existing shipped surface?"_ — Yes → fire
(module hub · standalone entity page · novel interaction surface); No → skip [FACT: entity-delivery-flow.md:104-107].

Applied, per affordance:

| affordance                                                                                                             | UI answer obvious from a shipped surface?                                                                                                                    | FACT                                                                               |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| **the staged-deliverable progression** (the current stage + the done/current/upcoming sequence, deliverable-per-stage) | **NO** — no shipped surface frames a _do-this-then-that_ staged walk; the staged-deliverable structure is an explicit **design-intent extension** of ADR-004 | quality-bar/\_index.md:134-135,139,150; grep clean                                 |
| **the attach + mark-done/require-proof affordance** (attach doc/photo/audio to a stage, mark it done or demand proof)  | **NO** — no shipped surface composes a per-stage attach + proof gate                                                                                         | quality-bar/\_index.md:135-136,155; grep clean                                     |
| **the effect-rail log surface** (a running, honest log of the effects a session fired to the entity)                   | **NO** — only a single-state `SyncStatus` pill ships; a chronological fired-effect log has no shipped UI answer                                              | quality-bar/\_index.md:137-138; packages/ui/src/CLAUDE.md "SyncStatus"; grep clean |
| the 8-state / tokens / reduced-motion / timer internals                                                                | YES — fe-codec-patterns + the pomodoro widget ship                                                                                                           | packages/ui/src/CLAUDE.md                                                          |

**Result = FIRE.** The Flow/Session shell is an archetype shell / **novel interaction surface** (the fire case "a novel
interaction surface"), and the staged-deliverable progression + the attach/proof gate + the effect-rail log have no shipped UI
answer — the exact class this gate catches [FACT: entity-delivery-flow.md:99-107; quality-bar/_index.md:139,150]. None of the
three SKIP cases hold (not a thin leaf reusing a shipped pattern; it renders; not backend). This mirrors all three shipped
siblings, which FIRED on the same archetype-shell basis [FACT: fe-codec-entity-facet/delivery/interpretation.md:268-272].

**Activity (next):** a THROWAWAY greybox from real `@vida/ui` primitives + fake stage bodies + a fake effect log
(`apps/web/src/__envision__/flow-session.tsx` or a Storybook page, deleted after the gate; `frontend-design` as the
composition aid), covering: a multi-stage flow (done/current/upcoming) · a single-stage flow · the per-stage deliverable +
attach + mark-done/proof affordances · the effect-rail log (populated vs empty) · a mix of per-stage states · the attached-entity
header (compose vs mirror EntityView — precision 1) · the 375/768/1440 reflow → the human reviews + pins `EC-n`
(structural | feel) into `delivery/envision.md` [FACT: entity-delivery-flow.md:109-121].

## 8. Open for Victor — the Envision REVIEW (not a fire decision)

Everything is doc-homed (§6); the §3.75 test resolves the gate to FIRE on facts (§7), not a decision. The one blocking human
step is the **review of the greybox + pinning the anchored EC-n** — which comes AFTER I author the greybox, per the gate's
exit criteria [FACT: entity-delivery-flow.md:129-132]. The two §6 precisions (the #6 entity-facet relationship; the
stage-rail/effect-log primitive) are MINE to resolve at the greybox/`/contract`, surfaced for the review — not scattered
questions. → Author the greybox → human review → Step 2 Decomposition (slice-map + seam-contract, maps every `structural` EC
to ≥1 slice).
