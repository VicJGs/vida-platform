# PLAN — UX-2 Command bar + Search (session: 2026-08-09-ux-2-command-bar-search · language: English)

> Systems-analyst executive summary: read to approve the DIRECTION (Approval 1). Two audiences — the client
> understands what/why; the developer absorbs enough to build it. No build detail. No-Guessing: every claim is
> [FACT: src] / [INTERP: from fact] / [UNKNOWN: needs X].
> Class: **design/spec issue** (dep-graph) that ALSO emits a declarative code artifact (the UX-1 precedent) →
> §XXVI **FULL** gate `[FACT: baseline §3; reconstructed-structure.md:79]`. Grounding: [`baseline.md`](../baseline.md).
> **Rev 2** (post independent critique — REVISE cleared): added the focus contract, keybind/platform decision (D5),
> a ZK display-constraint reserve, corrected the IN.2 home to `command-bar/` (not `components/`). Citations verified.

## 1. Context & demand

The Vida web app is keyboard-first: the IA reserves a **`⌘K` global overlay** as a first-class surface —
`[FACT: information-architecture.md:104]` _"Search (⌘K) | overlay | Preferences (UX by UX-2)"_ — and hands its UX
to UX-2 `[FACT: ia.md:154]`. Today **nothing of it exists**: `apps/web/src/components/` is empty, no
command-palette code, no `cmdk`/`kbar` dep `[FACT: baseline §1]`. The launcher is the fast path to _jump anywhere_
and _do anything_ without hunting through nav — the keyboard spine of the OS. Without a fixed interaction model,
every future module invents its own quick-action entry and the `⌘K` surface fragments (the v1 failure pattern —
`[FACT: [[v1-failure-lessons]]]`). UX-2 sets that model ONCE.

**The defining constraint** `[FACT: baseline §2]`: the three systems the launcher _appears_ to use are all unbuilt —
`command_bar_history` (Preferences/MOD-prefs #32, M1.1 — exists only in v1/`dist`, **not v2**), FTS5 search
(DB-8 #60, M1.4), and the rendering host (UI-4). So UX-2 is NOT a component build — it is the **interaction model +
typed contracts + provider seams**, designed _against_ those systems without _coding against_ them. This is the
same class as UX-1 (which emitted `module-map.ts` + an IA doc).

## 2. What changes and why (the deliverables)

UX-2's home is **dual** (design doc + declarative artifact), mirroring UX-1 `[INTERP: baseline §3]`:

**IN.1 — Interaction-model design doc** — a `⌘K` section promoted to `docs/core/architecture/` (sibling of the IA
doc; exact file TBD at IMPL-PLAN — new `command-bar-and-search.md` vs a section in `information-architecture.md`).
It specifies:

- **(a) The overlay + its two modes.** One `⌘K` overlay, Preferences-realm-owned, that opens in **Command mode**
  (default: actions + navigation targets) and switches to **Search mode** as-you-type (entity results). Keyboard
  grammar: open `⌘K`/`Ctrl+K`, close `Esc`, `↑/↓` move, `Enter` execute, wrap, type-ahead. `[FACT: ia.md:104]`
  **Focus contract (M1 — UX-2 owns it, UI-4 honors it):** on open, focus moves **into** the overlay's input; on
  close, focus **restores to the triggering element** `[FACT: engineering.md §XIV:84-85]`; visible focus ring on the
  active item `[FACT: components.md §VIII]`. Reuses the UI-1 overlay/focus precedents (Dialog focus-into, Menu roving
  focus) when UI-4 renders it — referenced, not built.
- **(b) The command model = frecency + pinning.** A command is `{key (unique), label, category, run()}`; the
  displayed order is **frecency** (recency × frequency) with **pinned** commands first — derived directly from the
  v1 `command_bar_history` shape (`command_key`·`command_label`·`command_category`·`use_count`·`last_used_at`·
  `is_pinned`) `[FACT: baseline §2 / schema.v1.ts:1291]`, which UX-2 re-affirms as the v2 target shape for MOD-prefs.
- **(c) Command sources (providers).** Commands come from typed **providers**, not a hardcoded list:
  **navigation commands are DERIVED from UX-1's `module-map.ts`** (every dock/global surface → a "Go to X"
  command — zero new data) `[FACT: module-map.ts exists]`; **action commands** are contributed by modules at
  M1.1+ via the provider interface UX-2 defines (reserve the seam, ship 0–few built-in app actions). `[INTERP]`
- **(d) Search-as-you-type UX.** On query, Search mode shows entity results **grouped by type**, keyboard-navigable,
  with a selection→navigate action; preview affordance reserved. The **ranking/index is DB-8's** — UX-2 defines the
  _result contract_ + the _empty/loading/no-substrate_ states, not the ranking. `[FACT: baseline §2]`
  **ZK constraint (reserved, minor):** the `SearchResult` contract UX-2 shapes is where "what is safe to display"
  is decided — result fields are already-decrypted client-side view data (Vida decrypts only client-side); UX-2
  reserves the constraint that the contract carries display fields only, and that `command_bar_history` retains
  command keys/labels (app vocabulary), not entity plaintext. Full enforcement rides DB-8/MOD-prefs. `[FACT: ADR-002 ZK model]`
- **(e) All terminal states (fail-loud).** Command mode empty (no match) · Search mode: idle/typing/loading/
  results/empty/**search-unavailable** (FTS5 not yet built — explicit, not a silent blank) · error. `[FACT: STANDARDS §VIII]`
- **(f) State ownership.** Overlay open + query + mode = **ephemeral Zustand** (`command-bar-ui-store.ts`, the
  AR-4 pattern — BR-RT-6, never persisted, never entity data) `[FACT: app-shell-ui-store.ts]`; history/frecency =
  the future Preferences store (seam). Navigation via the central `routes.tsx` (no routes registered here).
  `[FACT: ia.md:139]`

**IN.2 — Declarative contract artifact** in **`apps/web/src/command-bar/`** — a **non-component data/logic dir,
sibling of `nav/`, explicitly NOT under `components/`** (the UX-1 `nav/module-map.ts` precedent; `components/` is the
render dir UI-4 owns) `[FACT: baseline §1; M-minor]`. Types + interaction reducer + provider registry + guarded
search stub. The typed source of truth the UI-4 host renders against:

- `Command`, `CommandProvider`, `CommandCategory`, `SearchResult`, `SearchProvider` **types**;
- the **navigation-command provider** derived from `module-map.ts` (real, testable now — no unbuilt dep);
- the **frecency ranking** pure function — **unit-tested against a fixture that IS the v1 six-field shape**
  (`command_key`·`command_label`·`command_category`·`use_count`·`last_used_at`·`is_pinned`), so the test doubles as
  the **v2 MOD-prefs contract assertion** `[FACT: schema.v1.ts:1291]`;
- the **provider registry** + a **search-provider seam** with a **stub** that returns `search-unavailable` until
  DB-8 wires the real one (guards the gap — no import of a non-existent FTS5 API). `[FACT: baseline §2]`
- **NOT** a rendered React component (UI-4), **NOT** the `command_bar_history` table (MOD-prefs), **NOT** FTS5 (DB-8).

## 3. Scope boundary (what this is NOT)

Not the rendered command-bar component / modal host (UI-4) · not the shell layout/responsive (UX-3) · not the
`command_bar_history` table (MOD-prefs, M1.1) · not the FTS5 index or search population (DB-8, M1.4) · not
per-module action commands (each module contributes at M1.1+ via the seam) · not client-state _conventions_ (UX-4;
UX-2 only places its own ephemeral store per the existing AR-4 pattern) · not onboarding (UX-5).

## 4. Acceptance (functional DoD — full detail promoted to spec §4)

- [ ] The `⌘K` interaction model is documented: two modes, full keyboard grammar, frecency+pinning, all terminal
      states incl. explicit **search-unavailable**.
- [ ] **Focus contract** specified: focus enters overlay on open, restores to trigger on close, visible focus ring
      `[engineering.md §XIV / components.md §VIII]`.
- [ ] **Keybind semantics** specified: `⌘K`/`Ctrl+K` platform branch + `preventDefault`; non-keyboard trigger
      affordance reserved for UI-4/mobile (D5).
- [ ] Navigation commands are **derived** from `module-map.ts` (no duplication, no new inventory).
- [ ] The command/search **type contract** + **provider seam** compile in `apps/web/src`; the search seam is a
      guarded stub (no FTS5/`command_bar_history` import).
- [ ] The frecency ranking + nav-provider are **unit-tested** (pure, no unbuilt deps).
- [ ] `typecheck` + `lint` green; no dep on unbuilt systems; matches UX-1 nav model + STANDARDS §VIII states.
- [ ] Interaction model promoted to `docs/core/architecture/` (Currency Rule §XXIX).

## 5. Implementation Prompt

Authored as the gate-2 IMPLEMENTATION-PLAN after Approval 1 (FULL variant — the `apps/web/src` artifact is code).

## 6. Open decisions (resolve at Approval 1)

- **D1 — artifact vs pure-doc.** ▶ _Recommend FULL-with-artifact (IN.1 + IN.2)._ Symmetric with UX-1; gives UI-4 a
  typed contract to render and lets the frecency/nav logic be tested now. Pure-doc would defer all of that into
  UI-4 with nothing verifiable here. `[INTERP: baseline §3]`
- **D2 — search scope.** ▶ _Recommend: fully specify the search-as-you-type UX + result contract + a guarded stub
  provider; do NOT implement ranking (DB-8 owns it)._ Captures the whole UX now, guards the unbuilt substrate.
- **D3 — doc home.** New `docs/core/architecture/command-bar-and-search.md` vs a section in the IA doc.
  ▶ _Recommend a new sibling file_ (the IA doc explicitly scopes this OUT → cleaner ownership). Confirm at IMPL-PLAN.
- **D4 — built-in actions.** How many app-level action commands ship now vs all deferred to modules. ▶ _Recommend a
  tiny seed set from ALREADY-BUILT shell state only_ — i.e. **"Toggle sidebar"** (`app-shell-ui-store.ts:18`
  `toggleSidebar()` exists) and go-to-nav commands. **NOT "Toggle theme"** — no theme store exists in the thin shell
  yet, so it would violate the "already-built only" guard `[FACT: baseline §1; M-minor]`. Everything else via the seam.
- **D5 — keybind semantics & platform branching (NEW, from critique M2).** The IA reserves the _surface_, not the
  keystroke. ▶ _Recommend:_ bind **`⌘K` (mac) / `Ctrl+K` (win/linux)** with `preventDefault` (avoid browser-native
  collisions); the binding is registered as **data in IN.2** (not hardcoded in UI-4); reserve a **non-keyboard open
  affordance** (a search icon/tap target) for UI-4 + mobile/Tauri where there's no hardware `⌘K`. Confirm at IMPL-PLAN.

## 7. Change Log

| Date       | Session                            | Change                                                                                                                                                                                                                                       |
| ---------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-09 | 2026-08-09-ux-2-command-bar-search | PLAN Rev 1 — direction for Approval 1 (grounded in baseline; D1–D4 recommended)                                                                                                                                                              |
| 2026-08-09 | 2026-08-09-ux-2-command-bar-search | PLAN Rev 2 — post independent critique (REVISE): +focus contract (M1), +D5 keybind/platform (M2), +ZK reserve, IN.2 home = `command-bar/` not `components/`, frecency fixture = v1 shape, D4 drops "Toggle theme". Citations verified clean. |
