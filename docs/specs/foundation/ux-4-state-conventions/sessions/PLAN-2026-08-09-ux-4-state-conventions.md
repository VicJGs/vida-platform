# PLAN — UX-4 State Conventions (session: 2026-08-09-ux-4-state-conventions · language: English)

> Systems-analyst executive summary: read to approve the DIRECTION (Approval 1). Two audiences — the client
> understands what/why; the developer absorbs enough to build it. No build detail. No-Guessing: every claim is
> [FACT: src] / [INTERP: from fact] / [UNKNOWN: needs X].
> Class: **UX state-conventions LOGIC issue** — a design/spec issue emitting a convention doc + a declarative logic
> artifact. **NOT visual-gated** (`frontend-visual-gate.md:23` classes "UX state-_conventions_ logic" as plumbing
> with no rendered surface → preflight + critique, **no** visual-approval stage) and **builds no rendered
> primitives** (authority is `engineering.md` only, not components.md/design.md) `[FACT: frontend-visual-gate.md:19-23;
m1.0-delivery-plan.md:211]`. Profile: **add-frontend-component**, authority **engineering.md + §XXII DoD** `[FACT:
m1.0-delivery-plan.md:211]` (+ Capability Framework R5 as the terminal-state authority `[INTERP:
capability-framework.md R5; not in the :211 cell]`); §XXVI **FULL** gate (it emits code), gate at close =
> `quality-gate-engineering`. Grounding: [`baseline.md`](../baseline.md).
> **Rev 3 — DRIFT-CATCH (Victor): removed a manufactured decision.** Rev 1/2 invented an IN.3 deliverable — building
> `Skeleton`/`EmptyState`/`ErrorState` rendered primitives in `packages/ui` + a component Visual Gate — and flagged it
> as an Approval-1 decision (D3). **That is drift.** The docs fully determine UX-4 with **no decisions**: (1)
> `frontend-visual-gate.md:23` puts "UX state-conventions logic" in the NOT-visual-gated bucket; (2) the authority is
> `engineering.md` only (a primitive build would be components/design-gated); (3) the dep "UX-1 · **via UI-1**" +
> UX-3's own PLAN ("`packages/ui` — **it touches UI-1**") mean UX-4 **composes** UI-1's existing primitives, it does
> not add new ones. IN.3, the Visual Gate, and D3 are removed. UX-4 = convention doc + logic artifact, composing
> UI-1's consumer-composed model. **No open decisions — fully doc-determined** (§6).
> **Rev 2** — independent critique REVISE cleared (B1 `ViewEngine.resolve` overclaim → conceptual parallelism; the
> three un-unified copies as evidence for the "one vocabulary" thesis; B2 misquote; B3 empty-vs-loading race + no-CLS +
> retry-re-enters-loading + reduced-motion). **Rev 1** — first direction (contained the D3 drift, now removed).

## 1. Context & demand

Every Vida screen reads its data through React Query over local SQLite (`data-flow.md §7`) and will render one of
four outcomes while/after that read: **loading · empty · error · success**. Today there is **no shared convention**
for how a screen presents those outcomes — the state plane (AR-4) gives modules the _cache_, but not the answer to
"what does loading look like, what does an empty list say, how does an error offer a retry, when (if ever) do we
patch optimistically, and what is the keyboard contract." `[FACT: web-client-runtime/current-spec.md — mechanism
only; no interaction-state layer]`

**Why now, why once:** these are decisions that must be identical across all 26 modules or the app fragments into 26
dialects of "loading" (the v1 failure pattern — `[FACT: [[v1-failure-lessons]]]`). UX-4 fixes the convention ONCE,
before the M1.1+ module wave; every module inherits it. `[FACT: .claude/tasks/ux-4-state-conventions.md:10-12
"defined once so no module reinvents"; reconstructed-structure.md:81 (the UX-4 row)]`

**The defining constraint** `[FACT: baseline §3]`: the vocabulary is **not UX-4's to invent** — it already exists as
**runtime code**. `packages/core/src/foundation/capability/types.ts:13` exports
`TERMINAL_STATE = ['loading','empty','error','success'] as const` + `type TerminalState`, on the `@vida/core`
barrel (`index.ts:124`), and `@vida/web` already depends on `@vida/core` `[FACT: apps/web/package.json:19]`. The
capability registry mandates every render target declare all four (CB6/BR-4, `MissingTerminalStates`); ADR-007:91 +
ADR-008:142 declare the same four `[FACT]` (ADR-009 declares a _different_ instantiation set — see baseline §4). The
**`ViewEngine.resolve()` already implements the same _conceptual_ result→state mapping** ("degrade, never throw/drop")
— but over its **own local `ViewState` type** (`views/types.ts:29`), NOT the shared `TerminalState` `[FACT:
spaces/current-spec.md:29; views/engine.ts:76]`. That is the point: the four-state canon is **declared three times,
un-unified** (`TerminalState` · `ViewState` · `SearchStatus`) — so UX-4 is the **first web consumer** and the layer
that gives the web presentation a _single_ typed way to consume the canon, exactly as UX-1 (`module-map.ts` + IA doc),
UX-2 (`command-bar/` + interaction doc), UX-3 (`shell/` + layout doc) did for their domains.

## 2. What changes and why (the deliverables)

UX-4's home is **dual** (convention doc + declarative logic artifact), the UX-1/UX-2/UX-3 pattern. Its delivery-plan
Home also lists `packages/ui` because UX-4 **composes UI-1's existing primitives** ("via UI-1") — it references them
in the conventions and MAY home a piece of the shared logic there, but it **builds no new primitives** (that would be
components/design-gated + visual-gated; UX-4 is engineering-gated conventions logic) `[FACT: m1.0-delivery-plan.md:211
"via UI-1"; ux-3 PLAN:163 "packages/ui — it touches UI-1"; frontend-visual-gate.md:23]`.

### IN.1 — State-conventions design doc → `docs/core/architecture/state-conventions.md`

A sibling of `information-architecture.md` / `command-bar-and-search.md` / `shell-layout.md`. It specifies:

**(a) The terminal-state model — REUSES `@vida/core`'s `TerminalState`, does not redefine.** Every data surface's
status **is** `TerminalState` (`loading · empty · error · success`); "degrade, never crash" `[FACT:
capability/types.ts:13; capability/current-business-rules.md:13]`. A surface MAY extend with surface-specific
sub-states (UX-2's `SearchStatus` adds `idle/typing/results/search-unavailable`) but each sub-state **maps back** to
one of the four for the fail-loud/degrade contract `[FACT: command-bar/types.ts:62-70]`. This closes the loop: the
frontend, the capability registry, and the ViewEngine all speak ONE vocabulary.

**(b) The result→state derivation (the ViewEngine.resolve analog for React Query).** A single documented rule for
mapping a React Query result to a `TerminalState`, in **strict precedence** so the sharpest edge is closed:
`isPending → loading` **is checked FIRST**, _before_ the empty predicate — otherwise a first paint where `data` is
still `undefined`/`[]` would flash **empty** instead of **loading** (the classic empty-vs-loading race). Then
`isError → error` · `data` empty (by an injected `isEmpty` predicate, since "empty" is entity-shaped) `→ empty` · else
`→ success`. This is **conceptual parallelism with** `ViewEngine.resolve`'s degrade contract `[FACT:
spaces/current-spec.md:29]` — the same four-state degrade shape — but a **distinct implementation** over React Query's
result, not a shared code path (the engine uses its own `ViewState`; UX-4 uses the imported `TerminalState`). No new
semantics; the ordering rule is the one non-obvious guarantee and is a required unit-test case.

**(c) Presentation conventions per state** — grounded, not invented:

- **loading** → skeleton placeholders that **match the settled content layout so there is no layout shift on
  resolve** (skeleton dimensions = content dimensions → CLS ≈ 0, the §XIII budget) `[FACT: performance-strategy.md:144
"sections show skeleton loaders"; engineering §XIII CLS]` + `aria-busy` (the UI-1 consumer-composed model `[FACT:
DEF-register U5-f]`); the skeleton is **STATIC bars by default (no shimmer — the shipped `card.stories.tsx:147`
  precedent); any animation is transform/opacity-only, off under `prefers-reduced-motion`** (B12) `[FACT:
card.stories.tsx:146-161; standards/motion.md; DS-3]`; never a bare spinner-blank. **Because UI-1 has no shared `Skeleton`
  (U5-a superseded), the doc carries an explicit token/motion RECIPE so every module composes an identical skeleton —
  consistency by convention, not a component** (IMPL-PLAN G1).
- **empty** → a guided empty state (never a blank region — the fail-loud principle `[FACT: command-bar/CLAUDE.md
"never a blank"]`): what it is, and the primary action to fill it.
- **error** → an inline error + **retry affordance**, reusing the pattern App.tsx already ships for the DB-boot
  failure (error message + retry button) `[FACT: web-client-runtime/current-spec.md:78-79 "App.tsx shows an
error+retry state"]`. **Retry semantics are specified:** retry calls React Query `refetch()` and **re-enters
  `loading`** (never stacks a second error over the first); errors are `aria-live="assertive"` `[FACT: engineering §XIV]`.
- **success** → the content, no wrapper state, **`aria-busy` cleared**; on a page-level navigation that resolves,
  focus moves to the main heading/top-of-content per the §XIV transition rule (a same-surface refetch does not steal
  focus). `[FACT: engineering §XIV focus-at-transitions]`

**(d) Optimistic-update behaviour — BR-RT-4 verbatim, with the exception criterion named.** **Default = none**: local
SQLite reads are <10 ms, so a write **invalidates and re-reads** rather than patching the cache `[FACT: data-flow.md:427;
BR-RT-4]`. UX-4 documents this as the convention and names the _only_ grounded exception (a write whose downstream
re-read is genuinely slow — e.g. crosses the deferred sync/transport seam) as a **future, opt-in, per-mutation**
decision, not a default — so no module reaches for optimistic patching casually.

**(e) The keyboard model — engineering §XIV + the established focus contract, as the global convention.** UX-4
documents the app-wide keyboard contract by _referencing_ the authorities, not restating a new scheme:

- Focus management at every transition (modal open → focus in; close → restore to trigger; page nav → focus main
  heading; tab change → focus panel) `[FACT: engineering §XIV]` — already realized by the UI-1 primitives + the UX-2
  command-bar focus contract (enter-on-open, restore-on-close, visible ring) `[FACT: command-bar-and-search.md §3]`.
- Esc closes every overlay; arrow keys within composites; Tab reachability in visual order `[FACT: engineering §XIV]`.
- **Keybind-as-data** (the D5 precedent `resolveKeybind(platform) → CommandKeybind`, `preventDefault`) is the pattern
  for any app-level global keybind UX-4 registers `[FACT: command-bar/types.ts:83-95]`.

### IN.2 — Declarative artifact → `apps/web/src/state-conventions/`

A new non-component data dir, sibling of `nav/` / `command-bar/` / `shell/`, **not** under `components/` (that is
UI-4's render dir) `[FACT: baseline §5; nav/CLAUDE.md]`:

- re-exports `TerminalState` + `TERMINAL_STATE` from `@vida/core` (one import point for the web layer);
- `deriveTerminalState(result, isEmpty)` — the pure §2(b) derivation (React Query result → `TerminalState`), fully
  unit-testable, zero unbuilt dep;
- the app-level keyboard-model data (keybind registry shape + the focus-contract constants), following the
  `resolveKeybind` data pattern;
- layer `CLAUDE.md` (data-not-chrome rules, mirroring the siblings); colocated `*.test.ts`.

### On `packages/ui` (why it is in Home) — COMPOSE UI-1, build nothing

UX-4 **composes UI-1's existing primitives** in its conventions ("via UI-1") — e.g. the loading convention documents
composing skeleton placeholders per UI-1's **consumer-composed model** (skeleton children + `aria-busy`), and the
error convention composes UI-1's Card/Button for the inline error + retry. UX-4 **adds no new `@vida/ui` component**
`[FACT: DEF-register U5-a/U5-f — Skeleton is consumer-composed, not a primitive; m1.0-delivery-plan.md:211 authority =
engineering.md only; frontend-visual-gate.md:23 — UX state-conventions logic is NOT visual-gated]`. If a slice of the
convention **logic** is cross-platform it MAY home in `packages/ui` rather than app-local (a file-home mechanic for
the IMPLEMENTATION-PLAN, not new UI) — otherwise it lands in `apps/web/src/state-conventions/` per the sibling pattern.

## 3. Scope boundary (what this is NOT)

Not per-module hooks/loading UIs (each module's M1.1+ wave, composing these conventions) · **not any new rendered
`@vida/ui` primitive** (no `Skeleton`/`EmptyState`/`ErrorState` build — UX-4 composes UI-1's consumer-composed model;
a primitive build would be components-gated + visual-gated, which UX-4 is not) · not the state-plane _mechanism_
(AR-4 — UX-4 consumes it) · **not re-homing `TerminalState` out of `@vida/core`** (a downstream consumer isn't grounds
to move a core canon — `[[dont-let-downstream-shape-reopen-an-adr]]`) · not _unifying_ the three existing declarations
(`TerminalState`·`ViewState`·`SearchStatus`) · not the sync/optimistic _engine_ (M4 — UX-4 only names the exception
criterion) · not the command-bar keyboard grammar (UX-2 — UX-4 references its focus contract) · not the shell/overlay
layout (UX-3) · not rendered app chrome (UI-4) · not native mobile (@vida/mobile track) · not onboarding (UX-5).

> **Latent, explicitly deferred:** the fact that the four-state canon is declared **three un-unified times** is a
> real argument that a _shared_ `TerminalState` vocabulary might one day belong in `@vida/types` (the shared-types
> package), consumed by capability + views + web alike. UX-4 does **not** open that — it imports the existing
> `@vida/core` canon (clean today: barrel-exported, web already depends on core) and flags the duplication as a
> future consolidation for the canon's owner. Re-homing now would drag capability-registry blast radius into a
> conventions issue. `[INTERP: from the three-declaration FACT]`

## 4. Acceptance (functional DoD — full detail promoted to spec §4)

- [ ] The terminal-state model is documented as a **reuse** of `@vida/core`'s `TerminalState` (the four canonical;
      degrade-never-crash), with the surface-specific-extension rule (UX-2 `SearchStatus` as the worked example).
- [ ] The **result→state derivation** rule is specified with **`isPending`-checked-first precedence** (closes the
      empty-vs-loading race) — RQ result → `TerminalState`, injected `isEmpty` — conceptually matching (not sharing
      code with) the `ViewEngine.resolve` degrade contract; the ordering is a required unit-test case.
- [ ] **Per-state presentation conventions** documented, each cited to its authority: loading = skeleton **matching
      content layout (no CLS)** + `aria-busy`, **reduced-motion static** (B12); empty = guided, never blank;
      error = inline + **retry via `refetch()` that re-enters `loading`**, `aria-live=assertive`; **success = content,
      `aria-busy` cleared, §XIV focus-on-nav-resolve**.
- [ ] **Optimistic behaviour** = BR-RT-4 (no optimistic by default; invalidate-and-reread), with the single grounded
      exception named as opt-in/future — not a default.
- [ ] **Keyboard model** documented as engineering §XIV + the command-bar focus contract + keybind-as-data — global
      conventions by reference, not a new scheme; Esc-closes, focus-at-transitions, arrows-in-composites.
- [ ] The **logic artifact** compiles (home `apps/web/src/state-conventions/`, or `packages/ui` for any cross-platform
      slice): `deriveTerminalState` + `TerminalState` re-export + keyboard-model data; **unit-tested** (all four
      derivation branches + `isPending`-first ordering + empty-predicate); zero unbuilt dep; no barrel; no JSX; **no new
      rendered `@vida/ui` component**.
- [ ] `typecheck` + `lint` green; consistent with the `@vida/core` `TerminalState` canon, UX-2 `SearchStatus`, UI-1
      primitive stance (no loading prop; consumer-composed skeleton), AR-4 state plane.
- [ ] Model promoted to `docs/core/architecture/state-conventions.md` + README row (Currency Rule §XXIX).

## 5. Implementation Prompt

Authored as the gate-2 IMPLEMENTATION-PLAN after Approval 1 (FULL variant — the `state-conventions/` logic artifact is
code). Will sequence: `TerminalState` re-export + `deriveTerminalState` (types/derivation) → keyboard-model data →
tests (four branches + `isPending`-first ordering) → layer CLAUDE.md → doc promotion to `state-conventions.md`. **No
rendered-component step, no Visual Gate** (engineering-gated conventions logic).

## 6. Decisions — NONE. Fully doc-determined (no open forks)

Everything from description to delivery is fixed by the documentation; there is nothing for the owner to decide.

- **D1 — terminal-state vocabulary.** ✅ **Fixed by `@vida/core`'s `TERMINAL_STATE` canon** — reuse, don't redefine.
  `[FACT: capability/types.ts:13; barrel index.ts:124]` UX-4 is its first web consumer.
- **D2 — optimistic behaviour.** ✅ **Fixed by BR-RT-4** (no optimistic by default). UX-4 documents it + names the one
  opt-in exception. `[FACT: data-flow.md:427]` Not a choice.
- **D3 — `packages/ui` = compose UI-1, build nothing.** ✅ **Fixed by the docs** (was a manufactured decision in
  Rev 1/2, removed Rev 3): authority = `engineering.md` only (no components/design) + `frontend-visual-gate.md:23`
  classes UX-4 as NON-visual-gated state-conventions logic + dep "via UI-1" = compose. No new primitive; no Visual
  Gate; nothing to decide. `[FACT: m1.0-delivery-plan.md:211; frontend-visual-gate.md:23; DEF-register U5-a/f]`
- **D4 — keyboard model as data vs prose.** ✅ **Resolved by the `resolveKeybind` precedent** — keybind-as-data,
  focus contract by reference to §XIV + command-bar. `[FACT: command-bar/types.ts:83]`
- **D5 — artifact home.** ✅ **`apps/web/src/state-conventions/`** (sibling of nav/command-bar/shell; cross-platform
  logic slice MAY sit in `packages/ui`). `[FACT: baseline §5]` (Dir-name is a naming sub-detail for the IMPL-PLAN.)

**Net: the vocabulary, the derivation, the optimistic rule, the keyboard model, and the `packages/ui` role are ALL
doc/code-determined. UX-4 concretizes an existing canon and composes UI-1. Zero open decisions.**

## 7. Change Log

| Date       | Session                           | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-09 | 2026-08-09-ux-4-state-conventions | PLAN Rev 1 — direction for Approval 1. Grounded in baseline (terminal-state canon in `@vida/core`, BR-RT-4, §XIV, ViewEngine.resolve, UX-2 SearchStatus, DEF-U5-a). D1/D2/D4/D5 doc-fixed; D3 (packages/ui primitives) recommended + flagged for confirmation.                                                                                                                                                                                                                                                                                                                |
| 2026-08-09 | 2026-08-09-ux-4-state-conventions | **PLAN Rev 2 — independent critique REVISE cleared.** B1: `ViewEngine.resolve` "reuse" overclaim → **conceptual parallelism** (local `ViewState`, not shared `TerminalState`); the three un-unified declarations now framed as evidence FOR the "one vocabulary" thesis + a deferred `@vida/types` consolidation (§3). B2: fixed the misquoted `reconstructed-structure.md:81` cite → task-file:10-12. B3: added empty-vs-loading race (`isPending`-first), no-CLS skeleton, retry-re-enters-`loading`, reduced-motion loading, success convention to §2(c)/§4. M1-M4 folded. |
| 2026-08-09 | 2026-08-09-ux-4-state-conventions | **PLAN Rev 3 — DRIFT-CATCH (Victor): "there are no decisions."** Removed the manufactured IN.3 (build `Skeleton`/`EmptyState`/`ErrorState` in `packages/ui`) + its component Visual Gate + the D3 "decision." The docs fully determine UX-4 with zero forks: `frontend-visual-gate.md:23` classes "UX state-conventions logic" as NOT visual-gated; authority `engineering.md` only (no component build); dep "via UI-1" = **compose** UI-1's primitives, not add new ones. UX-4 = convention doc + logic artifact. §6 now "Decisions — NONE."                                |
