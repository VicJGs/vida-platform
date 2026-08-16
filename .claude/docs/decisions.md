<!-- Last updated: 2026-08-16 by /session-end -->
| Date | Area | Decision | Choice | Reason | Reversible |
|------|------|----------|--------|--------|------------|
| 2026-08-16 | ui-4-s1/media (D5 seam) | how UI-4 wires the shell breakpoints into Tamagui | a **plain `media` object** on `createTamagui` (`packages/ui/tamagui.config.ts`) + barrel export; `config.media` = runtime SSOT, `apps/web` `TAMAGUI_MEDIA` = a parity-test guard | Tamagui **v2 has NO `createMedia` helper** (removed v1 API — gate-1 verified vs installed `@tamagui/web@2.6.2`); `packages/ui` can't import `apps/web` (one-way boundary), so the parity test binds the two mirrors | n/a (Tamagui API) |
| 2026-08-16 | ui-4-s1/composition | where the AppShell chrome mounts | in `routes.tsx` **`RootComponent`** (`<AppShell><Outlet/></AppShell>`), NOT above `<RouterProvider>`; the providers (`UIProvider`/`ToastProvider`) go in `App.tsx` | `<Outlet/>` is only legal inside a route component (gate-1 blocker); wrapping RouterProvider would orphan the Outlet + collide with RootComponent as a 2nd layout owner. Compose-in-`apps/web`, no new `packages/ui` component (rule-of-three unmet) | yes |
| 2026-08-16 | ui-4-s1/a11y | rendering semantic landmark elements | `styled(View, { render: 'nav'/'header'/'main' })` (the UI-1 Card precedent) | Tamagui's **runtime `tag` prop is NOT honoured** — `<View tag="nav">` emits a `<div>`; caught by the a11y landmark test, not typecheck | n/a (Tamagui) |
| 2026-08-16 | ui-4-s1/runtime | the `process is not defined` blank page | a runtime **`window.process` shim in `apps/web/index.html`** (the UI-1 U0 fix) | `@vida/ui` runs Tamagui UNTAMED (no vite-plugin, DS-4) and `@tamagui/core` reads `process.env.*` at runtime → crash in the browser; jsdom defines `process` so only the **real-browser Visual Gate** caught it ([[measure-browser-bugs-dont-hypothesize]]) | yes (a vite-plugin would replace it) |
| 2026-08-16 | ui-4/routing + profile | the UI-4 head + profile | head = **UI-4 (#30)** confirmed by an independent `#`-walk (git-status) + sub-wave gate + `--next` converging; profile = **new-feature** (delivery-plan:140 over reconstructed-structure's coarse "Generic") | Victor's steer: verify the head from the docs, not memory. The walk also surfaced UX-2's missing archive/index bookkeeping (shipped PR #9) → fixed | n/a (doc-fixed) |
| 2026-08-16 | ui-3-e8/testability (BR-E8-7) | how to unit-test a serializer whose engine objects are opaque | **descriptor-AST split** — the pure `documentToDocxBlocks` returns a plain `DocxBlock` AST (deep-equal testable); a thin adapter maps 1:1 to `docx` instances, proven by UNZIPPING `word/document.xml` (`jszip` test devDep), NOT E7-style direct-instance assertions | `docx`'s `Paragraph`/`TextRun`/`Table` hold a `private properties` field (verified at preflight vs the installed `.d.ts`) — not introspectable like react-pdf's plain elements; the post-impl critic proved a `PK`-bytes smoke tests nothing (Packer packs malformed docs), so the unzip assertion is the real adapter gate | n/a (engine constraint) |
| 2026-08-16 | ui-3-e8/image (BR-E8-image) | how DOCX renders an `image` node | **degrade to a `[image: alt]` text placeholder** — NEVER an `ImageRun` in M1.0 | `docx` `ImageRun` REQUIRES binary data + explicit pixel dimensions (`CoreMediaData.data` :332), which a pure IO-free emit builder can't obtain (no fetch, no dimension probe); real embedding is deferred to the encrypted attachment pipeline (BR-E2-5) — simplest-correct for the stage | yes (embedding lands with the attachment pipeline) |
| 2026-08-15 | ui-3-e6/mechanism | markdown serialization approach | **custom TipTap-JSON↔Markdown serializer** (`serializers/{to,from}-markdown.ts`), NOT `@tiptap/markdown` (now exists) nor a PM→HTML→turndown path | ADR-001 §8 already fixes "Custom serializer … round-trip lossless"; the new first-party module is a downstream shape that doesn't reopen a settled ADR; turndown drops E5's `rendered:false` config attrs — Victor's doc-verify steer | n/a (ADR-001) |
| 2026-08-15 | ui-3-e6/invariant | the lossless round-trip direction | **JSON→md→JSON**: `fromMarkdown(toMarkdown(doc)).document ≡ doc` over the live schema | the reverse (`to ∘ from` over an arbitrary string) is unsatisfiable — Markdown has equivalent spellings; `toMarkdown` emits ONE canonical form, `fromMarkdown` normalizes to it. Amended umbrella BR-5 | n/a |
| 2026-08-15 | ui-3-e6/grammar | how to parse without a lexer | **closed canonical grammar** — `toMarkdown` emits one deterministic spelling (italic→`_`, bold always OUTER, variable code fences, callout/integration→HTML/comment), so `fromMarkdown` inverts exactly that + degrades on the rest | dissolves the "lexer fallback" as a manufactured hazard (E5 D-7 pattern) — no general GFM ambiguity on the round-trip path; zero new runtime dep | n/a (fix) |
| 2026-08-15 | ui-3-e6/types | frontmatter emit-side value source | **one additive optional `MarkdownSerializeOptions.frontmatter?`** in `@vida/types` (symmetric with `MarkdownParseResult.frontmatter`) | preflight GAP-1: the bare `include_frontmatter` flag had no value carrier and `EditorDocument` has no metadata; additive/optional breaks no caller; scalars round-trip stringly-typed (declared-lossy) | yes |
| 2026-08-14 | ui-3-e5/registry (D1) | what the editor "block registry" IS | **the ADR-008 `inline` render ADAPTER**, not a bespoke editor registry — AR-7 shipped the registry in `@vida/core`; the editor is only its `inline` renderer (§3.4); closed enum = interim M1.0 definition source; MOD-notes #31 wires the real `CapabilityRegistry` | ADR-008 already decided it + AR-7 deferred the "TipTap re-home" to UI-3 #29 (`capability/current-business-rules.md:26`) — Victor's "we already solved this in the docs" steer re-grounded a spec that had re-invented it | n/a (grounding) |
| 2026-08-14 | ui-3-e5/config (D2) | how integration blocks preserve config | **config = node attrs declared per `config_schema` (CB2)** — the 7 typed capabilities declare their `@vida/types` interface as attrs (`satisfies`-guarded, `rendered:false` JSON-only); 4 schema-less register attr-less | ADR-008 §data-model:122 "inline = editor-node attrs"; dissolves the manufactured "D-7 deferred attr-preservation hazard" — CB2 answers it (declare the attrs, don't defer) | yes |
| 2026-08-14 | ui-3-e5/availability | integration slash entries in M1.0 | **flipped ON (all 11 insertable → placeholder)** — `AVAILABLE_INTEGRATION_BLOCKS` (all 11) + a `run` per entry | BR-E4-5 "a deferred entry lights up when E5 registers its node-view"; safe (editor mounts in no M1.0 app); MOD-* upgrades placeholder→real body | yes |
| 2026-08-14 | ui-3-e5/defaults | mutable (object/array) attr defaults | **FUNCTION defaults `() => []`** (invoked per schema build → per-editor fresh), NOT bare literals | post-impl critique MEASURED a cross-editor leak with a shared bare-literal default; `@tiptap/core` invokes a function default once per schema build; ProseMirror attrs are immutable-by-convention | n/a (fix) |
| 2026-08-09 | ux-2/class (D1) | artifact vs pure-doc | **FULL design-spec + code artifact** — `apps/web/src/command-bar/` contract, not just a doc | UX-1 precedent (design doc + `module-map.ts` data); makes frecency/nav logic testable now vs deferring all to UI-4 | yes |
| 2026-08-09 | ux-2/seams | 3 unbuilt backing systems (`command_bar_history`, FTS5/DB-8, UI-4) | **typed seams, never coded against** — `CommandHistoryEntry` = v1 shape; `SearchProvider` stub → `search-unavailable`; nav derived from `module-map.ts` | ships real/tested code at #22 without waiting on #32/#60; no import of a non-existent table/API (cascade-guard) | n/a (grounding) |
| 2026-08-09 | ux-2/search (D2) | how far UX-2 designs search | **full search-as-you-type UX + result contract + guarded stub; ranking is DB-8's** | captures the whole UX now, guards the unbuilt FTS5 substrate; `SearchResult` = display-only (ZK reserve) | yes |
| 2026-08-09 | ux-2/keybind (D5) | `⌘K` semantics | **`⌘K` mac / `Ctrl+K` win-linux + preventDefault, registered as DATA (`resolveKeybind`)**; non-keyboard affordance reserved for UI-4/mobile | IA reserves the surface not the keystroke; data-not-hardcoded so UI-4 + Tauri/mobile consume it (added by gate-1 critique M2) | yes |
| 2026-08-09 | ux-2/actions (D4) | built-in action seed | **"Toggle sidebar" only** (already-built shell state); NOT "Toggle theme" (no theme store yet); rest via provider seam | already-built-only guard; modules contribute action commands at M1.1+ | yes |
| 2026-08-05 | ar-9/scope | what AR-9 builds (no-flush scaffold) | **stub-only seams** — `sync/{types,queue,resolver,crdt}` factories throwing `SyncNotActivated`, reusing `@vida/types`; NO table/enqueue (DB-6), NO HLC/columns (DB-2), NO transport/merge/yjs (AR-9b/M4) | ADR-003 §8 + ADR-017 scaffold-only (delivery-plan:183); activation is a non-structural bolt-on onto reserved seams | n/a (grounding) |
| 2026-08-05 | ds-1/pipeline (F003) | component sub-themes emitted identical for light/dark (dark rendered light values) | **fix the emitter** — resolve component (rank-2) tokens to the SEMANTIC base-theme key, emit `light.<k>`/`dark.<k>` per DS-1 spec:113 (+ regression fixture) | STRUCTURAL emitter deviation from DS-1:113 (resolved to raw primitives + duplicated light/dark); dark now inherits the overlay by construction | n/a (fix) |
| 2026-08-05 | ds-5/scope | what DS-5 delivers | **the full component-token set** (`component.json` refs into DS-2 semantics) **+ 10 primitive contracts**; NO new token VALUES (DS-2's), NO built components (UI-1's) | ds-2 spec:54/:101 "component tokens beyond DS-1's proof… full set = DS-5"; design.md §II three-layer (component→semantic) | yes |
| 2026-08-05 | ds-5/gate | does DS-5 run a Visual Gate now | **No token Visual Gate** — DS-5 authors references not values; per `frontend-visual-gate.md`'s render table DS-5 = the Components/Storybook row, deferred to first-consumer **UI-1**; DS-5 ships on the normal §XXVI gate | a component-token *reference* is not a token *value*; applicability is the render-table classification, not a per-turn re-derivation (the DS-5 loop) | n/a (grounding) |
| 2026-08-05 | delivery/routing | end the recurring `--next` vs `#`-order conflict at every `/begin` | **enforce the `#`-order rule via docs** — `TASKS.md → ## 🧭 Delivery Routing`: next head = lowest-`#` not-done non-`〰` ready issue; `--next` is ADVISORY; DF-3 (every `blocked by` → lower `#`) is an audit invariant | the divergence is *structural* — `order_nodes` tie-breaks the ready set by dependent-count (`tracker_sync.py:1108`), a different valid topo tie-break than the doc's narrative `#`; fixing edges never makes them agree, only re-ranking by `#` does | yes |
| 2026-08-05 | delivery/data | the stale `AR-8 ← db-8-fts5-search` edge | **removed** (illegal `#14 ← #60`, DF-3 violation) — search is a streamed sub-part of AR-8's `⊞≥2`, not a whole-issue blocker | a higher-`#` edge silently dropped AR-8 from `--next`'s ready set, hiding the true head; the doc models AR-8 ← AR-6 only | n/a (fix) |
| 2026-08-05 | ar-8/home | backlink resolver home | **`packages/core/src/services/search/` (directory)** — not a flat `services/backlink-service.ts` | ADR-018 §3.2 mandates `services/` as one-subdir-per-unit (all 19 live ones are dirs) and outranks `cross-module-integration.md:170`'s flat path (which defers homes to the structural phase) | yes |
| 2026-08-05 | ar-8/scope | what AR-8 actually builds at M1.0 (`⊞≥2` pin) | **only the backlink resolver** is a bespoke `@vida/core` build; **graph-prep** = AR-6 `ViewEngine`/`ViewProviderRegistry` seam + UI-2 (#28), **export** = UI-3 (#29 "block editor + serializers"), **search** = DB-8 (#60) | all homed elsewhere *in the same plan* (reconstructed-structure); building them under AR-8 would duplicate/mis-home. AR-8 closed with the resolver | n/a (grounding) |
| 2026-08-05 | toolkit/tracker | generalize the `#`-order fix beyond this repo | **filed a toolkit task** (`add-declared-build-order-to-tracker`) — optional `buildOrder` config → `order_nodes` tie-break honors it when present, inert otherwise | the tie-break mismatch exists in any repo with a hand-authored order; a backward-compatible config makes `--next` correct generally, but it's a toolkit change (own gate) | yes |
| 2026-08-03 | ds-3/motion | how to add motion (duration/easing) to the token pipeline | **third aux consumer** — reuse DS-2's aux-namespace mechanism verbatim (route to CSS + typed `motion.ts`, skip from createTokens), NOT a new pipeline concept | duration/easing aren't Tamagui categories, exactly like font*/shadow; `motion.ts`→`createAnimations` mirrors `fonts.ts`→`createFont` | yes |
| 2026-08-03 | ds-3/pipeline | how to prevent motion leaking into fonts.ts | factor `AUX = [...TYPOGRAPHY, 'shadow', ...MOTION]`, each emitter filters its own sub-list (`vida/fonts`→TYPOGRAPHY, `vida/motion`→MOTION) | leak-proof by set membership, not a fragile `\|\| ns==='shadow'` exclusion; adding to a flat AUX alone would've leaked motion into fonts.ts | yes |
| 2026-08-03 | ds-3/values | duration storage unit | **unitless numbers** (`--duration-fast: 150`, not `150ms`); `ms` reconciliation → DS-4 | consistent with DS-2's unitless-dimension convention (`--space-16: 16`); joins the existing px deferral rather than a 2nd unit convention | yes (DS-4) |
| 2026-08-03 | ds-3/values | duration speeds + easing naming | band **floors** (fast 150 / moderate 250 / slow 400 — snappy bias) + curve-shape names (out/in/inOut/linear) | in-band per motion.md §IX; floors read snappier; curve-shape matches the CSS `ease-*` mental model (intent aliases → DS-4 presets) | yes (values) |
| 2026-08-03 | ds-3/scope | semantic transition presets (duration+easing pairs) | **deferred to DS-4** `createAnimations`; DS-3 stays primitive-only | the 3-layer model (semantic→one primitive ref) can't express a two-value pair without a raw literal (B2 violation) | n/a (boundary) |
| 2026-08-03 | delivery/ds-1 | how to "do" the parked-but-built DS-1 head | **re-land**, not rebuild — re-apply the isolated `packages/ui/themes` code onto current main (57 behind), regen lockfile, re-verify, ship-gate, merge | the build already passed its gate (fd9f144); the only unfaced risk was *today's main*. Main never touched `packages/ui` → 0 clobber | yes |
| 2026-08-03 | delivery/ordering | doc `#` order vs tracker `--next` when they disagree | **doc `#` column is authoritative** (DF-10 topological order → DS-2 next); `--next` (dependent-count heuristic → ux-3) is a convenience, not the order | they agree on *what's ready* but the `#` sequence encodes the intended narrative (finish the DS foundation chain); DS-2/UX-3 are parallel-ready | n/a (rule) |
| 2026-08-03 | delivery/gate | multi-substrate issue gating (DF-11) | per-substrate **increment rule** (`⊞N`) + an **enforced** gate-1 substrate-count precondition | the per-issue flow assumed issue = one context; a 4-substrate issue (AR-7) needs N gated increments, not one utopian gate | yes (docs) |
| 2026-08-03 | delivery/homing | AR-7 deferral homes (DF-12) | first-consumer-pull; new `#85`/**LIF-156 cap-authoring** for the ADR-010/SP4 runtime; grants-ext→P3-boundary; registry-runtime→MOD-notes/UI-3 | db-10-proof — every cited deferral must have a real issue home, no orphans | yes |
| 2026-08-03 | economy/idempotency | `consequence_ledger` convergence key | UNIQUE `(effect_event_id, kind, target_ref)` mirroring the effect rail's composite PK | a bare `effect_event_id` under-keys vs the rail (two effects share an id, differ in target) | yes |
| 2026-08-03 | db/repository | effect-handler synced write | added `Repository.createInTx(tx, data)` — the owed inc-1 tx-scoped write, at its first consumer | docs-grounded: ADR-004 §3.2.5 single-write-path + §3.4 co-transactional enqueue, inside the rail's tx | yes (zero behavior change to `create`) |
| 2026-08-03 | measurement | measurement substrate grain | contract + pure engine, **NO tables/migration** | ADR-011 §3.8 — kind/mode are per-entity columns (DB-4), contributions is Purpose-domain, progress is derived-on-read | yes |
| 2026-08-03 | delivery/process | multi-substrate deferral: decision vs realignment | when the docs are silent/half-baked on the actual case, triage STRUCTURAL + realign in a separate phase — don't decide ad-hoc | Victor: the docs/intent/order fix placement; a half-baked spec is a defect to flag, not a free choice | n/a (process) |
| 2026-08-02 | ux/nav | primary navigation axis | **co-primary dual-axis** — module dock (content home) + Spaces bar (cross-cutting overlays) | reconciles ADR-006/007 (Spaces overlays) + intake SP1 (Spaces first-class axis); Victor's call | costly (amends ADR-007:88; owed to Spaces ADR) |
| 2026-08-02 | ux/nav | UX-1 deliverable grain | design doc (`information-architecture.md`) + declarative code artifact (`apps/web/src/nav/module-map.ts`) | dual home reconstructed:72; "design/spec issue" is dep-graph sense, not doc-only | yes |
| 2026-08-02 | ux/nav | nav-map home | `apps/web/src/nav/` (per-app), NOT a shared package | platform-strategy §5 (routing is platform-specific); web-first; M4 revisit if consumer appears | yes |
| 2026-08-02 | ux/nav | Routines placement | **dock** (own cockpit), not inside Sessions | routines/identity.md:5-8 (active counterpart to Calendar; "Not a session engine"); harvest misread corrected by Victor audit | yes |
| 2026-08-02 | ux/nav | Check-ins / Gamification placement | Check-ins = secondary (Journal flow); Gamification = conditional dock (`feature_gamification`) | check-ins/identity.md:25 (Journal-surfaced); gamification/identity.md:8 (opt-in) | yes |
| 2026-06-27 | habits | streak semantics | consecutive scheduled occurrences, no grace; counters derive from ledger | one source of truth; cache never lies | yes |
| 2026-06-27 | finance | account balance source of truth | ledger-derived (opening_balance + Σ transactions) | balances can't drift; import-friendly | costly |
| 2026-06-28 | relationships | neural graph edges | contact↔network membership only, no contact↔contact table | matches Victor's model; less schema | yes |
| 2026-06-29 | constitution | extension-model principle | ZK core + guarded OPT-IN integrations; user owns the risk | resolves every external-data/AI tension at once | no (principle) |
| 2026-06-29 | projects | deliverables | dedicated table + multi-type measurement (financial/stats/3rd-party/logs/artifacts) | real 4-level hierarchy; deep progress picture | costly |
| 2026-06-30 | scope | v1 audit — dropped modules | KEEP all: Health, Duties, Skills(separated), Finance→Commitments, Projects→Investigations → Wave R | intent must be tracked, not silently cut | yes |
| 2026-07-01 | process | Routines re-sequenced to Wave 4; Learning split into 5 sub-contexts | document dependencies first; one context per pass | orchestrator needs its modules; token discipline | yes |
| 2026-07-02 | learning | Education hierarchy reframe | 8 levels: Institution/Self-taught→Program→Curriculum→Degree→Term→Subject→Module→Topic (optional depth) | flat courses ≠ envisioned academic structure | costly |
| 2026-07-03 | learning | grading + progress | grading_systems builder (weighted components, modality); progress = Projects measurement pattern FORGED separately | matches real professor practice; no cross-module data mixing | yes |
| 2026-06-07 | setup | toolkit initialized on existing repo | Generic Coding Session | wire up toolkit without regenerating existing CLAUDE.md | yes |
| 2026-06-07 | setup | rename Claude.md → CLAUDE.md | git mv | cross-platform memory loading (case-sensitive CI) | yes |
| 2026-06-08 | build | declare cross-package imports as deps | `@vida/types: workspace:*` in core | tsc --noEmit resolves bare specifiers via node_modules, not tsconfig references | yes |
| 2026-06-08 | core | unlockVault return value | return `keyChain.vault_key` not `_vaultKey` | avoid null-widening of module-level mutable across call boundary | yes |
| 2026-08-01 | delivery-structure | tracker hierarchy model | Initiative=Vida · Project=build-tier (M1–M4) · Milestone=slice · Issue=sprint (ADR-016) | fixes the db-10 STRUCTURAL failure; matches Linear entities + tracker mechanism | costly |
| 2026-08-01 | delivery-structure | db-10 (dogfood seed) dependency | → M1.4, blocked-by ALL 26 modules | the "needs the whole OS" dep was unencoded → false-ready head; now impossible by construction | yes |
| 2026-08-01 | delivery-structure | reconstruction = re-organize, not re-tier | preserve every LIF id + slug; only re-home Project/Milestone; modules become first-class issues | tracker identity is the foundation; no churn/rename | no |
| 2026-08-03 | frontend/source-of-truth | where frontend truth lives (DS/UI/UX) | **documented intent (ADRs/specs/design.md), realized code-first**; community Figma file built later via Figma MCP + scripter (NOT Tokens Studio, paid); **no ADR** — a doc re-shape, not a decision-between-alternatives | Figma-first impossible now (no products); Tokens Studio heavy sync is paid; drift is a discipline outcome, not inevitable | yes |
| 2026-08-03 | frontend/phasing | when the Figma community file ships | **release-gated M4 `P2-⑦`** (first public release — "users can use it"); deps ← DS-2…DS-5 + UI-* (all M1, disrupts no edge) | M3 = encryption gate but still solo-localhost (no external users); Post-M4 P3-⑦ builds *with* the DS so must follow it | yes |
| 2026-08-03 | frontend/gate | approving visual frontend work | **Frontend Visual Gate**: preflight → critique(+quality-gate-design) → `pnpm preview:tokens` render → **Victor's visual approval**; applies to visual issues only (plumbing gets the normal gate) | a written spec can't convey a rendered look; the render is generated from shipped code so "seen == shipped" | yes |
| 2026-08-03 | frontend/enforcement | stop forward specs drifting from the direction | **mechanical guard** `pnpm check:frontend-source-model` (fail-loud) requires `## 0. Source model` on every DS-3/4/5 + UI-* spec — NOT a prose convention | DS-1's B2 doctrine (enforce by construction); unenforced conventions are the v1 failure mode | yes |
| 2026-08-03 | ds-2/pipeline | typography + shadow don't fit createTokens' 5 categories | **aux namespaces** (font*/shadow) → `variables.css` + `fonts.ts`, **skipped** from `tokens.ts`/`themes.ts` (incl. aux-referencing semantics); B9 | Tamagui fonts = `createFont` (separate); a font primitive would trip B3 fail-loud in both emitters | yes |
| 2026-08-03 | ds-2/pipeline | encode parallel dark values (§XI) without rewriting the leaf format | **`semantic.dark.json` overlay** loaded BY FILENAME (NOT in the SD `source` glob → no phantom rank −1 layer); `source`→explicit 3-file list | reuses light paths intentionally; keeps checkLayers/B1 intact; maps 1:1 to Figma variable modes | yes |
| 2026-08-03 | ds-2/values | the DS-2 palette + type | **indigo brand / slate neutral / emerald+red signals + Space Grotesk/Inter** — accessible AA both modes; ⚠ **provisional placeholder, NOT Vida's brand** | unblock DS-3→UI without waiting on brand work; brand pass swaps VALUES only + re-runs the visual gate | yes (values) |

## documentation-blueprint — completed 2026-07-19

The foundational documentation effort for vida-platform. Built a discovery-driven **Levels × Aspects** framework, then documented the entire platform against it and locked the architecture in ADRs.

**Delivered:**
- **21 documented contexts** (19 modules + sub-contexts), each as the canonical 5 aspect docs (`identity · business-rules · contract · structure-data · conventions`) under `docs/features/`.
- **15 ADRs, all Accepted** (`docs/core/decisions/ADR-001…015`) — this session added ADR-011 (Universal Measurability), ADR-012 (Points Economy & Consequence Engine), ADR-013 (ZK Notification Delivery), ADR-014 (External Data Ingestion under ZK), ADR-015 (AI/LLM under ZK). ADR-014/015 are the two standing EX-2 ZK-integration ADRs — closing that constitution loop.
- **The constitution** (`docs/core/business-rules.md`) and **the owed-tables ledger** (ADR-002 §5.20 — the single scoped input for the build phase: all ADR tables + the 21-module target schema).

**Key decisions / patterns established:**
- Feature docs describe **intent**; ADRs decide **cross-cutting mechanism** — the discipline that kept the modules coherent.
- **Every gated ADR ran an independent adversarial critique.** It caught a ZK-honesty overclaim in **five consecutive ADRs** (011–015) plus a prompt-injection security hole — the gate is load-bearing on this project.
- Doc-only throughout: **`packages/` diff = 0** across the entire task. The build phase (schema consolidation from §5.20) is the next stone.

## Build Roadmap — completed 2026-07-20
Set the whole platform's **buildable deliverables** as a phased, clustered dependency map (`docs/roadmap.md`), then projectized it into Linear (initiative `vida-platform`).

**Delivered:**
- **`docs/roadmap.md`** — 3 phases (1 Local dogfood · 2 Venues+release · 3 Personality), the 5-layer Structural Foundation (① Database · ② Architecture · ③ Design System · ④ UI · ⑤ UX), a tiered dependency map, Phase-1 module sub-slices (1a–1d), the integration register (6 defined / 16 undefined-by-design), and sequencing rules.
- **35 Phase-1.0 issues in Linear** (LIF-61…95) · 5 Projects · 14 milestones · corrected acyclic blocks-graph. Enhanced the toolkit tracker first (milestones + project descriptions).
- **Reusable scenario** `project-foundation/scenarios/build-roadmap.md` (crystallized from this task).

**Key decisions / patterns established:**
- **Database Layer leads.** Technical track (DB→AR) is the critical path; the shorter experience track (UX→DS→UI) blocks on Architecture — a single-track bottleneck, not balanced parity.
- **Single-user localhost web needs NO server + NO sync** — sync/SRP/relay/mobile/desktop defer wholesale to Phase 2; Phase 1 only scaffolds `_sync_*`/`sync_queue` (write, never flush). Caveat: the HLC *encoding* is F10-coupled, so DB-2 carries a deferred decision, not a free one.
- **Gate the roadmap AND its dependency graph before the outward push.** The Step-7 foundation gate (run late, after the Linear push) found a BLOCKER **dependency inversion** (AR-2 adapter declared below the DB-6 repository it sits above) that forced a Linear re-sync — an independent adversarial critic caught it by cross-checking every edge against the code, not the roadmap prose. The scenario now encodes gate-before-push.
- **The tracker's relation sync is add-only** — it can't prune a removed/inverted edge, so an inversion would create a Linear cycle. Filed as a §XXVI toolkit follow-up (needs `issueRelationDelete` + diff-reconcile).
- Planning-only: **`packages/` diff = 0**. The build phase (Phase-1.0 ① Database Layer, DB-1) is the next stone.

## DB-1 schema primitives (LIF-61) — completed 2026-07-22
- Rebuild storage FROM ZERO: v1 `schema.ts` is ~60% stale vs the documented v2 target (retire ~22 · missing ~90-110 · divergent ~9 · carry ~40); no deployed data → zero migration cost.
- DB-1 = P0 primitives only: `schema/` dir + `_shared.ts` (baseColumns, syncColumns[6], typed helpers, `enumText`) + `_registry.ts` (entity_type) + barrel. Additive — v1 monolith stays reference-only.
- **DDL model:** hand-written SQL migrations (ADR-002 §5) + Zod (DB-9); Drizzle is the query-only type mirror (no drizzle-kit). The Drizzle `enumCheck` helper was removed as architecturally wrong. The dual-authoring-vs-drizzle-kit fork is logged for ADR-016.
- Boundaries held: `_sync_field_ts` deferred to DB-2; no table authored. Campaign uses per-table gating (each table = its own Per-Step Build Gate).
- Verified: tsc green on core/web/server; committed b234e85 on `feat/db-1-schema-primitives`.

## storage-master-plan (ADR-016 + master ledger) — completed 2026-07-22
- **ADR-016** ratifies the from-zero storage rebuild: fresh `schema/` authored per-table from the docs; DDL = hand-written SQL migrations, Drizzle query-only, **no drizzle-kit** (fork A; B's revisit trigger — before DB-3 at volume — preserved); three-part enum model (SQL CHECK + Zod + `enumText`); per-table build gate. Realizes ADR-002 §5.20; resolves ADR-001's migration-gen silence.
- **storage-build-plan.md** = the master table ledger: ~130-150 tables, disk-keyed (24 structure-data docs, NOT §5.20's stale 19) + §5.20 Stream-i, FK-ordered across phases P0→P-final, ✓/⏳/↔, with the DB-2…DB-11→phase map, per-table spec template, row-state lifecycle, count reconciliation.
- Governs the campaign; every table = its own Per-Step Build Gate, ordered by FK-deps. Next executable: DB-2 (P0.5 sync cols) then P1 (Notes/Tags/Spaces hub).

## build-roadmap-resequence (foundation-realignment campaign) — completed 2026-07-25

The `build-roadmap-resequence` task was reframed into a 3-part **foundation-realignment campaign** and completed end-to-end, each part double-gated with an independent adversarial critic + a domain quality-gate + Victor acceptance.

- **Part 1 — Documentation realignment.** All 34 docs (24 context + 8 arch) realigned to ADRs 004–017; capability-framework authored; 34/34 aligned, corpus-wide zero forward-stale.
- **Part 2 — Repository structure → ADR-018.** Re-derived `@vida/core` from the realigned docs: `foundation/` substrate tier (12 dirs incl `effects/`) + kept `services/` per-module tier (governed by `data-flow.md`); `models/` dissolved into `@vida/types`; v1 `schema.ts` monolith + `001_initial.ts` quarantined to `db/_legacy/` and unwired (`runner.ts` registry emptied); dead `web-adapter.ts` → `Old/`. Structure only (ADR-017); build 8/8 + typecheck 10/10 green.
- **Part 3 — Build roadmap resequence → ADR-019.** Rewrote `docs/roadmap.md` features-first as **M1→M4**: M1 whole-OS-manual + internally-integrated (unencrypted) → M2 external integrations + security boundary (co-built, against the seam) → M3 whole-OS encryption pass (release gate) → M4 venues/multi-device. Schema per-feature (ADR-016); encryption/sync/auth deferred; old Phase-3 integrations pulled to M2, old Phase-2 venues → M4. Every deliverable re-mapped via a per-deliverable ledger (none dropped). **Key verified decision:** integrations precede encryption-at-rest (M2 before M3) is ZK-safe because ZK-1 is server-blindness (L3/sync = M4); encryption gates release.

**RP = Real Product** (resolved). **Follow-on:** `linear-projectize` (U3) — its own gated task to re-scope LIF-61…95 onto the M1→M4 clusters. Commits: Part 2 f63786e/e45a081/56d56c5; Part 3 257bd6f/994f2b9; merges 90550fa/d453301. Linear LIF-96 Done.

## linear-projectize (U3) — completed 2026-07-26

Re-projectized Linear from the old substrate-first five-layer structure (①–⑤, LIF-61…95) onto the features-first **M1→M4** roadmap (ADR-019).
- **Created Projects:** M1.0 Boot & Connective Base (+5 milestones), M1.4 Internal-Integration Hardening, M2 External Integrations & Security Boundary, M3 Whole-OS Encryption & Security Pass, M4 Venues / Multi-Device (+milestones).
- **Re-homed 33 existing issues** to final M-homes by existing LIF id (no duplication): 30 boot/foundation → M1.0; DB-5/AR-3 → M3; DB-11 → M1.4.
- **Created split/head issues** (decision: separate issues): ar-9b-sync-activate (LIF-98, M4), db-8b-blind-index (LIF-99, M3), provider-selection (LIF-100, M2 head), ux-5b-vault-unlock (LIF-101, M3).
- **Old ①–⑤ emptied** (0 issues) → the 5 empty Linear Projects should be archived in the UI (tracker_sync creates/updates but does not delete Projects).
- **Net-new module/integration/venue issues remain create-at-gate** (roadmap rule — created as each M-phase begins, not up front).
- **Gotchas recorded:** Linear Project description cap = 255 chars (multi-byte → / ① inflate byte-count); `--approve-cluster` from a dry-run short-circuits later syncs → use `--sync --allow-new-clusters`. Linear LIF-97 Done.

## m1.0-delivery-plan (Milestone Delivery Planning) — completed 2026-07-26
- **current-* doc home** = per-context level-home (`docs/core|infrastructure|ui|editor|features`), NOT a new `docs/modules/` tree — aspect docs + current-* share one home (I2 rule).
- **DOC spine per issue** = the real 3-level hierarchy (`/document-context` baseline+currency · `/documentation-component` forward · `/layer-docs`), woven into §XXVI/§XXVII — "document in the proper way AS you build", enforced not aspirational.
- **DB-3/DB-4 = streaming issues** (schema lands per-substrate/per-module, ADR-016 §3.5), tracked but not one-shot builds.
- **Dependency graph authority:** the tracker's gated blocked-by OUTRANKS a fresh plan derivation — but can carry stale pre-resequencing edges; reconcile against the sequencing ADR. Fixed 2 stale edges (DB-6←DB-5 crossed M1.0→M3 violating ADR-017; AR-9←DB-2 parked) on BOTH sides (add-only sync would else re-add).
- **New toolkit scenario:** `project-foundation/scenarios/milestone-delivery-planning.md` (crystallized from build-roadmap.md) — the repeatable manual for every later milestone's delivery planning.
- Not a Linear issue (strategy meta-task). Artifact: `docs/roadmap/m1.0-delivery-plan.md`.

## AR-2 DatabaseAdapter + web-adapter — completed 2026-07-27
- **Async driver over wa-sqlite** (reversed an initial sync plan). wa-sqlite@1.0.0's Factory API is async-only, so a
  sync driver is impossible; adopted the delivery plan's "async Drizzle proxy" (`drizzle-orm/sqlite-proxy`).
  `DrizzleDb` is `'async'`; `repository.ts` + `migrations/runner.ts` async-propagated. No new ADR — ADR-001 (wa-sqlite)
  governs and never required sync.
- **Optional `sqlCipher` config seam** — the DB opens plain in M1.0; passing a config activates SQLCipher at M3. A
  config change, not a code change.
- **Repository encrypt/decrypt seam stays DB-6** — AR-2 only async-propagated the consumer to keep the build green.
- **Items 1&2 (browser open/persist) verification deferred to LIF-103** (Playwright + OPFS/worker harness), a net-new
  shared-infra dependency surfaced by the completeness audit; AR-2 closed on contract (5/7 DoD).

## m1.0-dep-graph-validation (LIF-105) — completed 2026-07-28
- **Graph edges are build-order blockers, not runtime feeds.** A ready-frontier needs "B must exist before A is
  built"; the delivery-plan §5 had conflated feeds/implements (esp. the UX design track). New rule in §5.1.1.
- **db-8 ← db-4, db-7 (not db-6).** FTS5 tables are DDL via the runner; the db-6 populate path is gated on a
  vault-unlock that is M3 → an illegal M1.0←M3 edge (same class as the retired DB-6←DB-5 and the ux-5←ar-3 below).
- **ux-5 ← ux-1 (ar-3 removed).** An M1.0 design issue cannot be build-blocked by M3 crypto; vault-unlock impl is
  carved to ux-5b/M3.
- **UX track (ux-2..6) blockers are design-time (ux-1/ux-3), not the downstream shell/services they feed.**
- **db-10 ← +db-9** (seed needs canonical enums); **ds-4 ← +ds-3** (Tamagui animations config); **ar-8 ← ar-6**
  (owns entity_links; ar-2 transitive).
- **Streaming loop model:** db-3/db-4 are schema-slices folded into each consumer's gate, never standalone ready heads.
- **Method:** census → per-edge derivation → independent adversarial ADR-critique (caught db-8←db-6) → write
  identically to task files + Linear (7 mutations) + §5; --verify clean (47 live). Reversible: yes (edges).

## AR-5 Sessions base — completed 2026-07-28 (commit f045ac1, merged 4956c81; LIF-107)
- **Grain = Option 1 (structure + contract types + thin registry).** AR-5 ships the `sessions` spine +
  integration-contract STRUCTURE (session_type_registry, session_attachments) + 5 canonical enums + a thin
  SessionRegistry. The effect-firing rail, lifecycle-transition engine, and scheduler DEFER to AR-7/later.
- **AR-5/AR-7 effect-rail boundary (not a fork).** plan §5:120-122 + §5.1.1 (build-order≠runtime-feed) +
  ADR-004 §3.2.5 ("owner"=spec-owner) already fix it: AR-5 = contract surface + effect-catalogue vocabulary;
  AR-7 (← AR-5) = the firing rail. "ridden by sessions" is a runtime feed, not a build edge.
- **EFFECT_TYPE = 12 members** (ADR-004 §3.2.2 base 8 + ADR-012 amendment 4: grant_currency/lock_currency/
  move_money/surface_notification). award_xp retained (ADR-012 generalizes, does not retire it).
- **sub_type/purpose OPEN (no SQL CHECK), registry-validated** — a hard CHECK breaks SS-5 user-extensibility;
  status/scheduling_mode/level are FIXED SQL CHECKs; EFFECT_TYPE is Zod-validated (JSON, no CHECK).
- **session_type_registry uses id PK + sub_type UNIQUE** (not sub_type PK) so the db-6 generic Repository
  (id-keyed) drives persistence; user types enqueue to sync_queue; shipped types are in-memory (SS-4).
- **BR-4 containment = effects ⊆ allowed_effects ⊆ shipped envelope** (post-impl critique fix).
- Method: full §XXVI double-gate + 3 independent critiques (each caught a real defect); typecheck 10/10,
  core 110/110. Reversible: yes (additive migration 002).

## AR-6 Spaces substrate — completed 2026-07-29
- Scope is mechanical (capability-framework §3): SP1–SP7 (ADR-006) + V1–V5 (ADR-007) — not a "grain" choice.
- entity_links shape = decided `(page_id, entity_type, entity_id, context)` (cross-module-integration §3.2 + security-model), page-anchored, open target registry, no FK; NOT source-polymorphic (a retracted invention).
- Types placement follows the built-substrate convention (AR-5): @vida/types = enum vocab only; row types = schema $inferSelect; service types in core/foundation.
- M1.0 = empty-[E] pass-through (ADR-017:20); [E] marks are the M3 target.
- Junctions idempotent (findWhere-before-insert) + resolve-then-soft-delete; tag/space nesting cycle-guarded.
- Deferred by the docs (not chosen): capability registry/block_instances→AR-7; effect rail→AR-7; backlink resolver→AR-8; predicate-DSL/layout/resolution-surface→build-time; page_tags retirement→N&P (M1.1).

## DB-7 migrations runner + app_state — completed 2026-07-29
- Reconcile+extend (NOT from-zero): the runner + engine (runMigrations/get/setSchemaVersion) already existed with migrations 001/002/003 live. db-7 authored the ONE missing piece.
- Closed a latent bug: getSchemaVersion swallows the missing table (→0), but setSchemaVersion INSIDE the loop INSERTs into app_state (adapter.ts:231) — no production migration created it, so migrate() threw at real web boot (worker.ts:23); masked only by 4 test fixtures.
- app_state = documented infra (ADR-002 §5.0 `key TEXT PK, value TEXT NOT NULL`; §9.1 schema_version). NOT an architectural decision — Victor corrected a manufactured "option A/B" fork; the docs already decide. See memory read-architecture-before-implementing.
- Bootstrap is pre-loop (ensureInfra, idempotent CREATE IF NOT EXISTS) not a versioned migration — it is the version store, so it can't be version-gated. Mechanically forced, not a choice.
- Home = schema/foundation/app-state.ts (DB-6 sync_queue precedent), NOT the build-plan's stale schema/infra.ts → ledger amended.
- Forward-only preserved (no down(); inherited divergence from ADR-002 §9.2, rationale ADR-016:17 — reconcile at DB-11).
- resetDev dev-only (import.meta.env.DEV read type-safely, fails closed; not barrel-exported).
- Method: full §XXVI double-gate + 3 independent critiques (all SHIP; gate-1 caught a 4th fixture + BR-5 mechanism). typecheck 10/10, @vida/core 131/131, @vida/web 6/6. Reversible: yes (additive). commit d7aa1e0, LIF-69 Done.

## AR-4 State/Routing/Forms — completed 2026-07-30 (LIF-75)
- **ADR-020: Zustand store placement = per-app React hooks** (`apps/web/src/stores/`), NOT vanilla-in-`packages/core`. Resolves the long-deferred ADR-001:286; revisit at M4 if a cross-platform store consumer appears.
- **Code homes** = the architecture docs (`stores/`·`hooks/`·`routes.tsx`·`App.tsx`·`lib/`·`db/`), over the delivery-plan §149 `{stores,router,forms}` shorthand.
- **Routing** = code-based central `routes.tsx` + `lazyRouteComponent` code-split (not file-based; not per-module self-registration).
- **Grain** = mechanism + one reference per plane; per-module hooks/stores/forms land in each module's later wave.
- **D5 main↔worker binding** = a main-thread `SqliteDriver` proxy (`db/client.ts`) over the worker postMessage RPC — the app-facing binding AR-2 assigned to AR-4. `values`/`batch` (Drizzle path) are a declared deferred seam.
- **Library APIs verified (context7)**: TanStack Form v1 takes a Zod schema directly (Standard Schema; no adapter pkg); Router uses `lazyRouteComponent`.

## qa-1-e2e-harness-opfs (LIF-103) — completed 2026-08-04
- **Head chosen by strict `#` global build order** (Victor): QA-1 (#8) over `--next`'s ux-3 and the TASKS.md DS-5 prose. The `#` column in `reconstructed-structure.md` is authoritative; `--next` is a dependent-count convenience.
- **QA-1 reframed scaffolding → FOUNDATION** (Victor): it's the shared browser-E2E foundation (reusable `db` fixture + OPFS-reset + documented extension points), AR-2 verification is the first consumer. Grounded in a downstream sweep (25+ consumers) + docs — not built in isolation.
- **Zero-throwaway rule**: item-2 OPFS persistence is proven against the DURABLE `app_state` table via a probe row (shipped `run`/`query`), NOT a synthetic `fixture` table and NOT `schema_version` (which `migrate()` always restores → can't discriminate persistence). The literal "write via Drizzle" over the worker is a deferred seam → **UI-3/M1.1+** (reuses this `db` fixture); the Drizzle contract stays Node-proven.
- **New scenario `E2E Test Harness`** authored under the `add-backend-component` profile (the API-route `Default` scenario didn't fit test infra) — profile stays Backend (DF-8-fixed, standards match), scenario differs.
- **Backdoor via a bare dev-only entry** (`harness.html`+`.ts`), NOT `App.tsx` (which auto-opens `'vida'`, destroying the item-1 first-run baseline). Clean OPFS = explicit `beforeEach` wipe, NOT Playwright context isolation (Playwright doesn't reset OPFS — #29901).
- **Config at the web-app ROOT** (`testDir:'./e2e'`) so `playwright test` (CWD=apps/web) discovers it and doesn't scan the `src/` Vitest files. `PW_EXECUTABLE_PATH` escape hatch drives a system Chromium (Brave) on Playwright-unsupported OSes (macOS 12); unset in CI.
- **Pre-existing CI reds flagged on owners** (not QA-1's to fix): `@vida/server` no-tests → **P2-1 (#79, M4.0 Venues)** which builds the server; repo-wide Prettier drift → a new standalone Planned hygiene task.
