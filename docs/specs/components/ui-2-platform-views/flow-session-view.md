# FlowSessionView — the CODEC Flow/Session shell (fe-codec-flow-session #11, S1)

> **Spec / contract (Step 4).** The 4th archetype shell (Collection #4 · Dashboard #5 · Entity #6 · **Flow/Session #11**).
> Grounds: delivery/interpretation.md · slice-map.md (S1) · seam-contract.md (Seam A) · envision.md (EC-1…EC-11, APPROVED
> 2026-10-07). A `@vida/ui` presentational shell — Tamagui-only, no `@vida/core`/`@vida/types` import.

## Intent
A **flow FRAME** for any staged, do-this-then-that surface (a session you run, a routine you step, a wizard, a drill, an
onboarding, a check-in entry). It frames a **staged progression** (done/current/upcoming) over the shipped `Timeline`, owns
the **standardized stage affordances** (attach · mark-done · require-proof, EMITTING intents — never a write), and presents a
read-only **effect-rail log**. It renders **no stage body content** (the consumer's `renderStage`) and **fires no effect**
(ADR-004 backend). NOT the timer/HUD (#16), NOT the runtime page (#23), NOT the countdown (pomodoro V5).

## Contract (Seam A)
See `delivery/seam-contract.md` Seam A for the full `FlowSessionViewProps`. Shape: `title` · `context?` · `progress?`
(0..1, derived from stages if omitted) · `progressLabel?` · `saveStatus?` · `action?` · `stages: FlowStage[]` ·
`renderStage?(stage)` · `nowLabel?` · intents `onAttach`/`onMarkDone`/`onRequireProof` · `effects?`/`effectsState?` ·
`effectRailLabel?` · aria · React-19 `ref`. Non-generic (`FlowStage` is concrete → no `<T>` → ref-as-prop, no `forwardRef`).

## Business rules
- **BR-FS-1 State-as-prop (BR-2).** `stage.state` + `effectsState` are the app's; the shell never derives. Default `'success'`.
- **BR-FS-2 Emit, never write.** The affordances call `onAttach`/`onMarkDone`/`onRequireProof`; the shell performs no write
  (the pomodoro-widget intent-emit precedent). Effects are fired by `@vida/core`; the shell only DISPLAYS the fired log.
- **BR-FS-3 Staged rail = the shipped `Timeline`.** `getTemporalState`: done→`past` · current→`present` · upcoming→`future`;
  `getEyebrow` = `stage.label`; `nowFulcrum` renders the "current stage" boundary; done ✓ · current accent+ring · upcoming faded.
- **BR-FS-4 Standardized affordances on the CURRENT stage only.** Mark-done (primary) · Require-proof (secondary) · Attach
  Document/Photo/Audio (ghost), each emitting its intent. Done/upcoming stages render no affordances.
- **BR-FS-5 Per-stage body.** `renderStage(stage)` supplies the deliverable CONTENT; a done stage shows `stage.proof`
  (collapsed), current/upcoming show `renderStage` (current prominent, upcoming muted). Degrade-never-crash on each state.
- **BR-FS-6 Effect-rail log = read-only `ListView`.** Polite `role="status"`/list (never `role="alert"`); empty → a teaching
  `EmptyState`; each row = `kind` label (muted, sentence case) + `detail`.
- **BR-FS-7 Title-hero header.** Serif `$display` title carries alone; `context` is ONE quiet `$small` muted line **16px**
  below (EC-5, review-2); progress is a `HonestProgress` BAR (NOT a text subtitle); `saveStatus` + `action` right-aligned.
- **BR-FS-8 Typography discipline (EC-11).** The semantic type scale ONLY — no arbitrary px (`design.md:103`): title
  `$display` · current card `$heading` · done/upcoming `$subheading` · body `$body` · labels `$caption`/`$small`. Weight is
  hierarchy; **accent spent in ONE place** (the current stage + the progress bar); DIRECT semantic tokens; dark designed;
  preset accent flips.
- **BR-FS-9 a11y.** `role="region"` named via `aria-label`/`aria-labelledby`→title (`warnMissingName`/`useId`); the rail is
  the Timeline's (its rail column is aria-hidden); the effect log is polite.
- **BR-FS-10 No own motion in S1 + no sub-theme + ref-as-prop.** S1 adds NO own animation — the composed Timeline/Card gate
  their own motion via `useReducedMotion`; there is nothing for the shell itself to gate (revisit if a stage-advance
  transition is added). DIRECT base tokens (no sub-theme); React-19 `ref` prop.

## EC coverage (envision → Visual-Gate MUSTs)
EC-1 staged progression · EC-2 current: deliverable+attach+mark-done/proof · EC-3 done proof / upcoming faded / dot state ·
EC-4 effect-rail log (+ empty teach) · EC-5 title-hero + progress bar + 16px rhythm · EC-6 per-stage state degrade · EC-7
reflow 375→1440 no overflow · EC-8 serif title · DIRECT tokens · dark · preset flips · EC-9 single-stage sane · EC-11 type
scale no px. (EC-10 stage-advance immediacy = `feel` → live Visual Gate.)

## Resolved precision
**`require-proof` = a distinct intent** (`onRequireProof`), not a mark-done-gating flag (the per-stage proof-gate is the
consuming flow's config, not this shell's). Ratified here (seam-contract open precision).

## Out (homed by the docs)
Stage BODY content (consumer `renderStage`) · effect WRITES + lifecycle engine (`@vida/core`/#32) · the "stages" backend
realization (design-intent ext → #23) · the timer HUD (#16) · the runtime page (#23) · countdown (pomodoro V5) · attachment
storage + `deliverable_note` (`@vida/core`).
