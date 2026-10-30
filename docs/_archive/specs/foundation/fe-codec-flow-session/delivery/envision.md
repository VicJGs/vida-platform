# Envision — fe-codec-flow-session (#11, the Flow/Session shell)

> **Status: APPROVED (Victor, 2026-10-07).** The §3.75 Envision Gate FIRED (interpretation.md §7 — a mechanical doc test,
> not a decision). Greybox + the full EC-1…EC-11 set approved, after **two review rounds**: review-1 corrected the
> typography (semantic scale, no px · title-hero · progress BAR not a text subtitle · dropped the all-caps eyebrow +
> middle-dot meta-string) and review-2 fixed the title→context breathing room (16px, 4pt grid). The SHIPPED `EntityView`
> carried the same crammed-header root → filed `fix-entity-view-header`. Decomposition (Step 2) follows
> [FACT: entity-delivery-flow.md:129-132].

## Greybox

A THROWAWAY composition mock (deleted after the gate) — the SHIPPED `@vida/ui` primitives (`Timeline`, `Card`, `Button`,
`ListView`, `EmptyState`, `SyncStatus`) + fake data, envisioning the Flow/Session shell whole. NOT the real
`FlowSessionView` (it doesn't exist yet) — intent-fidelity (layout / affordance / state), not pixel-perfect.

- **File:** `packages/ui/src/__envision__/flow-session.stories.tsx` (title `__envision__/FlowSession (greybox)`).
- **Harness:** the @vida/ui Storybook Visual-Gate surface — preset × mode × density via the global toolbar; 375/1440 via viewport.
- **Stories (screen × state):**
  - `FlowMultiStage` — the full flow: attached-entity header + a staged `Timeline` (2 done ✓ · a "current stage" fulcrum ·
    the current stage expanded with deliverable + attach + mark-done/proof · 2 upcoming faded) + a populated effect-rail log.
  - `FlowSingleStage` — a single-stage flow (a check-in entry / one-shot session): one current stage, empty effect log.
  - `EffectLogEmpty` — the effect-rail log empty state (a teaching `EmptyState`, "Nothing logged yet").
  - `StageStates` — per-stage state threading: a done stage + a loading stage (skeleton) + an errored stage (`role="status"`).
- **Screenshots:** `/tmp/vg/flow/` — Brave, 3 presets × light/dark @ 1440 (multi-stage) + 375 reflow (editorial·light / reader·dark,
  **no overflow**) + single / empty-log / states. Attached at review.

**What the greybox resolved (the flagged precisions + Victor's review-1 typography correction):**

- **Precision 1 (the #6 dep):** the greybox **MIRRORS `EntityView`'s serif-`$display` header** (title-hero) for the
  attached-entity identity. The flow is its own surface _about_ an entity, so it mirrors the header pattern rather than
  nesting inside `EntityView`. **Resolved: mirror (not compose-as-host).**
- **Precision 2 (the stage-rail primitive):** the greybox uses the shipped **`Timeline`** — `getTemporalState`
  past/present/future maps 1:1 to done/current/upcoming, and `nowFulcrum` renders the **"current stage"** boundary. Reads
  cleanly across all 3 presets (accent flips on the fulcrum + current dot). **Resolved: reuse `Timeline` for the stage rail;
  `ListView` for the effect-rail log.**
- **Typography (Victor's review-1 correction — the first greybox was messy):** rebuilt on the **semantic type scale, NO
  arbitrary px** (`design.md:103`); the serif `$display` **title is the hero and carries alone** — **no all-caps eyebrow over
  the title, no middle-dot meta-string** (both are `frontend-design` generic tells Victor flagged); **progress is a
  `HonestProgress` BAR** (Victor's call), not a crammed text subtitle; 4pt vertical rhythm (title→metadata `$12`); accent spent
  in ONE place (the current stage + the bar). Hierarchy: current card = serif `$display`@`$heading` · done/upcoming = serif
  `$display`@`$subheading` muted · body = `$body` muted · status/log-label = `$caption`/`$small` muted (sentence case).
- **Carried finding → a fix-unit:** the SHIPPED `EntityView` (#6) has the same crammed-header root (`entity-view.tsx:72`
  `TitleGroup` has no title→subtitle gap). Filed `fix-entity-view-header` (Victor's call: separate §XXVI unit, this session
  stays focused).

## Anchored checkpoints (PROPOSED — pin/edit at review)

| EC    | Screen / state  | Assertion (the vision)                                                                                                                                                                                                                                                                                  | Type       | Slice(s)                              | Gate assertion          |
| ----- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------- | ----------------------- |
| EC-1  | Multi-stage     | the flow reads top-to-bottom as a **staged progression**: done stages collapsed · a **"current stage" fulcrum** · the current stage expanded · upcoming stages faded; the rail is continuous through the fulcrum                                                                                        | structural | S-frame · S-stages                    | Visual-Gate MUST        |
| EC-2  | Current stage   | the current stage surfaces, in one card: the **deliverable + a description** · the **attach** affordance (doc / photo / audio) · **mark-done** + **require-proof** actions                                                                                                                              | structural | S-stage-body                          | Visual-Gate MUST        |
| EC-3  | Done / upcoming | a **done** stage shows its delivered **proof** (collapsed); an **upcoming** stage reads as not-yet (faded, collapsed); the rail dot's temporal state (done ✓ / current accent+ring / upcoming faded) is visible                                                                                         | structural | S-stages                              | Visual-Gate MUST        |
| EC-4  | Effect rail     | the effects a session fired show as a **calm, chronological log** (type eyebrow + detail); the **empty** log is a teaching `EmptyState`, never a blank                                                                                                                                                  | structural | S-effect-log                          | Visual-Gate MUST        |
| EC-5  | Header          | **title-hero**: the serif `$display` title carries alone + ONE quiet plain-language context line + a **`HonestProgress` bar** for progress (NOT a text subtitle) + a `SyncStatus` chip + `⋯` action; NO all-caps eyebrow, NO middle-dot meta-string (mirrors `EntityView`; precision 1)                 | structural | S-frame                               | Visual-Gate MUST        |
| EC-6  | Per-stage state | each stage threads its **OWN** loading/empty/error independently; a loading stage = a calm skeleton (`aria-busy`), an errored stage = a calm `role="status"` muted message — the shell **degrades-never-crashes**                                                                                       | structural | S-state                               | Visual-Gate MUST        |
| EC-7  | 375 → 1440      | the staged layout + effect log reflow with **no 375 overflow**; content column centered on desktop; the rail + stage cards stay usable at 375                                                                                                                                                           | structural | S-frame                               | Visual-Gate MUST        |
| EC-8  | all · dark      | header title serif `$display`; DIRECT semantic tokens; dark **designed** (not inverted); **preset accent flips** (editorial blue / reader oxblood / quietDesk olive) across the fulcrum + current dot + effect eyebrows + Mark-done                                                                     | structural | S-frame                               | Visual-Gate MUST        |
| EC-9  | Single-stage    | a **single-stage** flow (check-in entry / one-shot) reads sanely — one current stage, no spurious done/upcoming chrome, an honest empty log                                                                                                                                                             | structural | S-stages                              | Visual-Gate MUST        |
| EC-10 | Stage advance   | marking a stage done → the next becoming current feels **immediate**; attach / proof feel direct (not a buried form)                                                                                                                                                                                    | feel       | S-stage-body                          | live Visual Gate (feel) |
| EC-11 | all text        | **typography follows the semantic scale — NO arbitrary px** (`design.md:103`); serif `$display` for the title, consistent hierarchy (current `$heading` · done/upcoming `$subheading` · body `$body` · labels `$caption`/`$small`); weight is hierarchy; accent spent in ONE place; 4pt vertical rhythm | structural | S-frame · S-stage-body · S-effect-log | Visual-Gate MUST        |

> Slice ids (S-frame · S-stages · S-stage-body · S-effect-log · S-state) are PROPOSED names for Step-2 decomposition — the
> coverage check maps every `structural` EC to ≥1 slice there.

## Approval

Greybox + checkpoints (EC-1…EC-11) approved by **Victor on 2026-10-07** across two review rounds (typography correction +
header breathing-room). The two precisions confirmed: **mirror** `EntityView`'s header (not compose-as-host) · reuse
**`Timeline`** for the stage rail + **`ListView`** for the effect-rail log. Progress = a **`HonestProgress` bar** (not a
text subtitle). (blocking — decomposition follows.) The greybox `packages/ui/src/__envision__/flow-session.stories.tsx` is
retired after the gate; the durable record = this file + the `/tmp/vg/flow/` screenshots.

## Re-pins

- **EC-4 re-pinned — Victor, 2026-10-27 (sessions-rescope LIF-248, Re-scope Gate, R-45).** The effect rail shows the
  effects a session **fired + any declared effect that did not apply** — the unapplied ones in the SAME chronological
  list as calm muted rows ("Not applied — <kind> · retry pending"), never flipping the whole log to `error`. Grounds the
  typed error state (sessions business-rules:84-85; pomodoro BR:78-79 "flagged"). Mechanism: an additive optional
  `status` on `@vida/ui` `FlowEffect` (a recorded §XXVIII change to this shipped shell, carrying this unit's Visual-Gate
  MUST) and the log's aria-label → "Session effects". The empty log stays a teaching `EmptyState`.
