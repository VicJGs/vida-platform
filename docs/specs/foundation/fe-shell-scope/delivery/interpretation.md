# fe-shell-scope — INTERPRETATION LAYER (Entity Delivery Flow · Step 1)

> Unit **#15** · LIF-219 · ② Frontend · M1.2.1 — Hub & Foundation · Frontend.
> Profile **Add Frontend Component** / scenario **default**. Built in worktree, off `origin/main`.
> **Goal (task):** SHELL · Bar 1 + the `Spaces:` scope-selector (global scope) + 6 global surfaces redistributed.
> **Methodology:** make the implicit explicit BEFORE decomposing. Every claim is grounded `[FACT: path:line]`;
> the No-Guessing Principle binds this doc. Unresolved points are flagged `⟨OPEN → Envision/Decomposition⟩`,
> never guessed.

---

## 0. What this unit is (one paragraph)

fe-shell (#14) shipped the CODEC dock⇄float inspector frame and left **two empty seams explicitly homed to #15**:
the top-strip `bar1Slot` prop and the **System** panel's body. #15 fills them with **Bar 1's real content** —
the **`Spaces:` scope selector** (a _new_ global-scope state) and the **6 global surfaces** re-homed from the
superseded `global-bar.tsx`. It is **presentational chrome** in `apps/web/src/shell` composing shipped `@vida/ui`
primitives; it adds **no `@vida/ui` component** (rule-of-three unmet) [FACT: apps/web/src/shell/CLAUDE.md:117] and,
per the M1.0 grain, **no live backend read** — the space-list source is a deferred `ProviderRead` seam.

---

## 1. DEPENDENCIES (what must already exist — and what does NOT)

### Satisfied (present on `origin/main`)

- **D1 — the shell frame + seams.** `AppShell` exposes `bar1Slot?: ReactNode` — documented verbatim as
  _"#15 (fe-shell-scope) — scope selector + global surfaces (incl. the ⌘K trigger). Injected into the bar; empty
  in #14"_ [FACT: apps/web/src/shell/app-shell.tsx:58-59], rendered in the reserved top strip at
  `data-region="bar1Slot"` [FACT: apps/web/src/shell/app-shell.tsx:269-270]. PR #118 merged
  [FACT: TASKS.md:9 "fe-shell … COMPLETE (S1–S5), PR #118"].
- **D2 — the System panel body seam.** The dock⇄float `ShellPanel` renders a body slot; #14 fills it with
  `PanelBodyPlaceholder`, commented _"The real bodies — the grouped module nav (`modules`) + the #15 global
  surfaces (`system`) — are the re-home follow-up"_ [FACT: apps/web/src/shell/app-shell.tsx:38-40,159,344].
  The `system` panel renders as an `<aside>` complementary landmark; `modules` as `<nav>`
  [FACT: apps/web/src/shell/shell-panel.tsx:18-20,65,192].
- **D3 — the 6 global surfaces (data).** `GLOBAL_SURFACES` = **Home `/` · Calendar `/calendar` · Search
  (`routePath:null`→⌘K) · Notifications `/notifications` · Settings `/settings` · Graph `/graph`**, each with an
  `owner` [FACT: apps/web/src/nav/module-map.ts:114-121]. This is nav DATA (no JSX) — the chrome renders it
  [FACT: apps/web/src/nav/CLAUDE.md:9-13].
- **D4 — the superseded renderer (shape reference, not authority).** `global-bar.tsx` already renders the 6 in
  `full`/`condensed` forms (NavLink icons + ⌘K trigger + overflow Menu) [FACT: apps/web/src/shell/global-bar.tsx:24-73];
  it is kept "to be re-homed as panel bodies / #15 content" [FACT: apps/web/src/shell/CLAUDE.md:35-36,86-87]. It is a
  **discontinued five-region-frame artifact** — SHAPE-reference only, never the correctness model
  [[discontinued-impl-and-frozen-decomposition-are-reference-not-authority]].
- **D5 — nav primitives.** `NavLink` (createLink SPA anchor, exact `aria-current`, `currentColor` icon tint)
  [FACT: apps/web/src/shell/CLAUDE.md:88-89] · `navIcon(key)` key→lucide glyph [FACT: apps/web/src/shell/nav-icons.ts
  via CLAUDE.md:89] · the ⌘K trigger seam `useCommandBarUIStore().open` [FACT: apps/web/src/shell/global-bar.tsx:11,25].
- **D6 — Spaces substrate (the scope _domain_).** `spaces` table: `root_tag_id · name[E] · icon · default_view_id
(nullable) · parent_space_id (nullable)` [FACT: docs/core/spaces/current-spec.md:17]. `views.space_id` nullable —
  **NULL = global, set = Space-owned**; `spaces.default_view_id` names the opener
  [FACT: docs/core/spaces/current-business-rules.md:16 BR-9]. This is the semantic the selector drives.

### NOT satisfied — the implicit gaps this layer surfaces

- **D7 ⚠ — there is NO `listSpaces`/`getSpace` read API.** `SpacesService` exposes only `createSpace/updateSpace/
deleteSpace` + enabled-block junctions — **no read** [FACT: packages/core/src/foundation/spaces/service.ts:38-61].
  The selector must _read_ the space list to populate itself → its data source is an **unbuilt seam**. Per ADR-019
  §3.5 first-consumer-pull + the current-spec, the _resolution surface_ "(UI + the persisted user switch) remains
  → P6" [FACT: docs/core/spaces/current-spec.md:39]. → Resolve as a **`ProviderRead` stub**, mirroring fe-shell's
  `stubShellPrefs` deferred-first-consumer pattern [FACT: apps/web/src/shell/CLAUDE.md:21-23] and the shipped
  `ProviderRead` convention [[sparse-foundation-seed-is-extension-seam-not-a-gap]].
- **D8 ⚠ — there is NO global-scope state.** No scope/space store exists in `apps/web` (only `module-map.ts` data).
  The active-scope state (which Space; NULL = global) is **net-new** — a new Zustand store, mirroring the shell's
  own ephemeral `app-shell-ui-store.placement` precedent [FACT: apps/web/src/shell/CLAUDE.md:21-23,132-133].
- **D9 ⚠ — owed ADR-006 amendment.** The Bar-1 `Spaces:` scope selector is flagged _"Victor refinement; owed
  ADR-006 amendment"_ [FACT: docs/specs/foundation/frontend-replan/surface-map.md:29]; the amendment is **not yet
  written** (grep of ADR-006 finds no scope-selector clause). → Surface at the gate; the amendment documents the
  global-scope _semantics_, it does not block the presentational surface. ⟨OPEN → confirm with Victor whether the
  amendment is authored this unit or homed forward⟩

---

## 2. NEEDS (what the unit must deliver — from the docs, not invented)

- **N1 — the `Spaces:` scope selector.** A Bar-1 control showing the active scope (a named Space, or **"All"/global**
  = NULL) and letting the user switch it. Reads the space list via the D7 `ProviderRead` seam (M1.0 → empty/stub →
  the control degrades to global-only, never crashes — the `ViewEngine`/nav "degrade, never throw/drop" idiom
  [FACT: docs/core/spaces/current-spec.md:32] [FACT: apps/web/src/shell/CLAUDE.md:123]).
- **N2 — the 6 global surfaces, re-homed.** Render `GLOBAL_SURFACES` [D3] into Bar 1 as nav (icon + label, exact
  `aria-current`) with the **Search** entry (`routePath:null`) wired to ⌘K, **never a link**
  [FACT: apps/web/src/shell/global-bar.tsx:15-16,29]. Reuse `NavLink` + `navIcon` [D5]; do NOT rebuild them.
- **N3 — responsive forms.** A `full` (tablet+) and a `condensed` (mobile) form — the `global-bar.tsx` precedent
  [FACT: apps/web/src/shell/global-bar.tsx:31-73] — adapted to Bar 1's placement. Standard widths 375/768/1440
  [FACT: apps/web/src/shell/CLAUDE.md:125-126].
- **N4 — the 8 visual + terminal states** for every interactive control (default/hover/focus/active/disabled +
  the selector's loading/empty/error of the space-list read), both light/dark incl. warm-dark AA
  [FACT: standards/components.md §VIII] [[contrast-test-must-be-full-matrix-not-light-only]].
- **N5 — currency.** Refresh `apps/web/src/shell/CLAUDE.md` (re-homed bodies, scope store) + born durable docs for
  the new scope context (Step 6/11, §XXIX) [FACT: add-frontend-component/scenarios/default.md:51-56].

---

## 3. ORGANIZATION (where the code lives — the pattern in active use)

- **O1 — Home = `apps/web/src/shell`.** New chrome files live beside `global-bar.tsx`/`shell-panel.tsx`; the shell
  **composes `@vida/ui`, never rebuilds it**, every value a DS token, **no barrel** (import specific files)
  [FACT: apps/web/src/shell/CLAUDE.md:117-122,137].
- **O2 — model vs chrome split.** Data/logic (no JSX) → model files; rendering → chrome. The scope _state_ is a
  store (chrome-consumed), NOT a model file [FACT: apps/web/src/shell/CLAUDE.md:11,115-116,132-136].
- **O3 — scope state store.** New Zustand store under `apps/web/src/stores/` (the `app-shell-ui-store` /
  `command-bar-ui-store` precedent) [FACT: apps/web/src/shell/global-bar.tsx:11] [FACT: apps/web/src/shell/app-shell.tsx:96].
- **O4 — the `ProviderRead` seam** lives as a typed read + stub beside the consumer (the `shell-prefs.ts` /
  `stubShellPrefs` shape) [FACT: apps/web/src/shell/CLAUDE.md:21-23].
- **O5 — nav DATA stays in `apps/web/src/nav/module-map.ts`** — do not duplicate `GLOBAL_SURFACES`
  [FACT: apps/web/src/nav/CLAUDE.md:9-13].

---

## 4. IMPLICIT RULES (the non-obvious constraints — surface, do not trip over)

- **IR1 ⚠ — WHERE does Bar 1 content land? The docs give two homes.** `bar1Slot` (top strip, always-visible)
  [FACT: app-shell.tsx:58-59,269-270] **and** the System panel body (dock⇄float, toggle-revealed)
  [FACT: app-shell.tsx:38-40,159]. The `global-bar.tsx` precedent had BOTH a persistent condensed form and a full
  form, so the likely resolution is **top strip = persistent/condensed Bar-1 chrome (scope selector + ⌘K + surface
  icons); System panel = the expanded form** — but this is **not stated** and shapes the slice list.
  ⟨OPEN → **Envision Gate** (this is a design-led placement decision) / **Decomposition**⟩
- **IR2 — the System panel body is currently HARDCODED, not a prop.** `renderDockedPanel`/float render
  `<PanelBodyPlaceholder id={id}/>` inline [FACT: app-shell.tsx:159,344]. Injecting #15 content into the System
  panel means either (a) a new `systemPanelSlot` prop on `AppShell`, or (b) a `PanelId→body` map. The `bar1Slot`
  seam already exists; the panel-body seam does **not**. ⟨OPEN → Decomposition: define the seam in seam-contract.md⟩
- **IR3 — scope state has NO live consumer in M1.0.** `views.space_id` is the eventual consumer [D6/BR-9], but no
  live view-read exists yet (ViewProviderRegistry "ships EMPTY" [FACT: docs/core/spaces/current-spec.md:31]). So the
  selector **sets** scope but it drives nothing downstream yet — an **emit-to-seam**, honest per the No-Guessing
  Principle (do not fabricate a filtered view). [[absent-deny-safe-port-write-is-noop-not-new-error]]
- **IR4 — Search is an action, never a route.** `command-palette` has `routePath:null`; rendering it as a link is a
  bug [FACT: apps/web/src/shell/global-bar.tsx:15-16,29]. It flips `commandBar.open()` (⌘K owned by #17/UX-2).
- **IR5 — degrade, never crash.** Unregistered routes → `NotFoundComponent`; an empty space-list → global-only
  selector; links use TanStack `to` (SPA), never `href` [FACT: apps/web/src/shell/CLAUDE.md:123-124].
- **IR6 — the `system` panel is an `<aside>` landmark, `modules` is `<nav>`.** Bar-1 global-surface _navigation_
  inside an `<aside>` needs its own labelled `<nav>`/list for SR correctness — don't rely on the aside being a nav
  [FACT: apps/web/src/shell/shell-panel.tsx:18-20,192].
- **IR7 — `fe-spaces-page` (#20) is a DIFFERENT unit.** It owns the Spaces _page_ + create/edit
  [FACT: .claude/tasks/fe-spaces-page.md:12]. #15 ships only the global _switcher_ — space **CRUD is out of scope**.

---

## 5. Carry-forward to the gates

| #   | Item                                                            | Lands at                                         |
| --- | --------------------------------------------------------------- | ------------------------------------------------ |
| IR1 | Where Bar 1 content renders (top strip vs System panel vs both) | **Envision Gate** (design-led) → Decomposition   |
| IR2 | System-panel body injection seam (new prop vs map)              | Decomposition / seam-contract.md                 |
| D7  | `SpacesScopeRead` `ProviderRead` stub (no `listSpaces`)         | seam-contract.md (M1.0 stub, live read deferred) |
| D8  | net-new scope Zustand store                                     | slice-map.md (frontend)                          |
| D9  | owed ADR-006 amendment — author now or home forward?            | **Victor confirm** at the gate                   |
| IR3 | scope = emit-to-seam (no live view consumer)                    | slice-map.md (note, not a slice)                 |

**Interpretation Gate asks:** is every implicit dependency surfaced (boot/runtime readiness, injected deps,
registry entries, missing read APIs)? → **Yes** (D7 missing read API, D8 net-new state, IR2 hardcoded body, IR3
dangling consumer all caught here, not in the browser). Ready for **Step 1.5 — the Envision trigger test**.
