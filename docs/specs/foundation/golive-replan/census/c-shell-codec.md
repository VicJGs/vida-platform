# G1 census — shell + CODEC slice (c-shell-codec)

> Auditor scope: fe-shell (#14) · fe-shell-scope (#15) · fe-codec-seams (#13) · fe-codec-flow-session (#11) ·
> fe-codec-entity-facet (#6) · fe-codec-dashboard (#5) · fe-codec-collection (#4) + the old #69 RIDE-leg trace.
> Schema: `census/_schema.md`. Read-only audit of worktree `golive-replan` (2026-10-21). Every row cites `path:line`.
> CODEC units are N/A-by-role on their own legs (process.md §5); their wiring is recorded against the CONSUMER that owns it.

**Ground truth used throughout:** the composition root's `Services` exposes only `notes` + `journals`
`[apps/web/src/db/composition-root.ts:34-37]`. `spaces`, `backlinks`, `registry` are constructed only as NotesService
deps and are NOT exposed `[:69-72,77]`. No views / capability / templates / sessions / preferences / effects service is
registered.

---

## 1. fe-shell (#14, LIF-199, PR #118 merged)

### A. Data legs
| Leg | File:line | Status | Evidence |
|---|---|---|---|
| Panel placement persist-read (`nav_preferences` via `ShellPrefsRead`) | apps/web/src/shell/shell-prefs.ts:16 · apps/web/src/shell/app-shell.tsx:74-76,114 | STUB | `stubShellPrefs = () => Promise.resolve(DEFAULT_PLACEMENT)`. `routes.tsx:30-37` passes no `shellPrefs`, so the stub is always used. No write-back exists at all. |
| Modules panel BODY (grouped module nav) | apps/web/src/shell/app-shell.tsx:49,160 | STUB | `modules` → always `<PanelBodyPlaceholder>`. `ModuleDock` (`shell/module-dock.tsx:63`) has **0 mounts** in apps/web. |
| Frame / panels / overlay host / slots | apps/web/src/shell/app-shell.tsx · shell-panel.tsx | N/A-by-role | Presentational chrome. It has no data of its own. |

### B. Interactions
| Interaction | Wired? | File:line |
|---|---|---|
| System / Modules toggle open/close | yes | app-shell.tsx:109,283 |
| Dock ⇄ Float per panel | yes | shell-panel.tsx:138-149 → store |
| Edge rearrange L·R·T·B + dock-together | yes | shell-panel.tsx:156-165 · app-shell.tsx:187-209 |
| Float dismiss (Esc / scrim / re-toggle) + focus-return | yes | app-shell.tsx:362-366 · shell-panel.tsx:213-234 |
| Placement survives reload | **missing** (no write; read is a stub) | shell-prefs.ts:16 |
| Navigate to a module from the Modules panel | **missing** (placeholder body). It is reachable only via ⌘K nav commands (`command-bar/nav-commands.ts`) | app-shell.tsx:160 |

### C. Declared deferrals
| Deferral (quote) | Doc:line | Home named | Home status | Verdict |
|---|---|---|---|---|
| "live `nav_preferences` persistence = first real consumer (L5 stub now)" | fe-shell/delivery/slice-map.md:47 · envision.md:36 · seam-contract.md:69 | "first consumer". The only concrete owner seeded is `module-go-lives.md:32` (settings → `user_preferences`/`nav_preferences`) | module-go-lives SUPERSEDED (`module-go-lives.md:2`). fe-settings + mod-preferences are archived (done), and the preferences service is not registered | **BORROWED** → preferences entity ELC (no live unit yet; G2 must mint it) |
| "real panel bodies (module nav / #15)" ("separate re-home") | .claude/tasks/fe-shell.md:63 · fe-shell/delivery/sessions/PLAN-s3-docked-panel.md:45-50 · fe-shell-scope/delivery/slice-map.md:69 | "separate re-home" (no unit named) | the #15 half is done (systemPanelSlot). The Modules half has **no unit** | **ORPHAN** (Modules panel body) |
| "#15/#16/#17 contents" | slice-map.md:11-12 | #15 fe-shell-scope · #16 fe-session-hud · #17 fe-cmdk | #15 ✅ merged · #16 ✅ merged · **#17 `fe-cmdk`: no task file, never minted** (`g6-reshape-runbook.md:51`; grep `.claude/tasks` → 0). ⌘K runs on the reused UI-4 `CommandBar` (`routes.tsx:31`) | HOMED (#15/#16) · **ORPHAN (#17 as a unit; see the #69 trace)** |

### D. Envision conformance (12 ECs)
| EC | Type | Assertion | Status | Evidence |
|---|---|---|---|---|
| EC-1 | structural | Dock⇄Float per panel, header control | ✅ | shell-panel.tsx:131-149 |
| EC-2 | structural | Docked inline, no scrim/elevation, content beside | ✅ | shell-panel.tsx:2,198-204 · app-shell.tsx:182-209 |
| EC-3 | structural | Floating = scrim + L3 elevation, content keeps width | ✅ | shell-panel.tsx:4-5,213-218 · app-shell.tsx:337-344 |
| EC-4 | structural | Any edge, independent, dock-together, contained control | ✅ | shell-panel.tsx:47-52,156-165 · app-shell.tsx:187-209 |
| EC-5 | structural | Content-fit, axis by edge | ✅ | shell-panel.tsx:90 · regions.ts (panelAxis) |
| EC-6 | structural | Esc/scrim/re-toggle + focus return | ✅ | app-shell.tsx:362-366 |
| EC-7 | structural | Reserved top strip | ✅ | app-shell.tsx:103 · regions.ts:169 |
| EC-8 | structural | Overlay host above panels | ✅ | app-shell.tsx:391 · shell/command-bar.tsx:12,115 (Dialog) |
| EC-9 | structural | One responsive model, 1280-centered, no overflow | ✅ | app-shell.tsx:329 · breakpoints.ts:29 · VG ledger .claude/tasks/fe-shell.md:37 |
| EC-10 | structural | DS tokens, AA full matrix incl. warm-dark | ✅ | VG ledger fe-shell.md:37 (AA 4.94–6.03, axe 0) |
| EC-11 | feel | Preset identity | ✅ | ledger fe-shell.md:61-62 "live-gate-confirmed". The shell carries no data, so the running app is the live leg |
| EC-12 | feel | transform/opacity motion, reduced-motion | ✅ | shell-panel-styles.ts:19-26 |

**fe-shell — ELC: PARTIAL (N/A-by-role chrome + 2 own legs) · legs S2/P0/L0 · ORPHANs 2 · EC ✅12/❌0/⏳0/?0 · debt:
placement never persists (nav_preferences stub, no write), and the Modules panel is an empty placeholder with no
module nav (ModuleDock unmounted, no home).**

---

## 2. fe-shell-scope (#15, LIF-219, PR #125 merged)

### A. Data legs
| Leg | File:line | Status | Evidence |
|---|---|---|---|
| Space list for the scope selector (`SpacesScopeRead`) | apps/web/src/shell/spaces-scope.ts:25 · scope-selector.tsx:35 · global-bar-1.tsx:19 | STUB | `stubSpacesScope → []`. `routes.tsx:32-33` passes no `read`. **① gap:** `SpacesService` has no list/get method (`packages/core/src/foundation/spaces/service.ts` interface: create/update/delete only) and is not in `Services` |
| Active scope → filtered views | apps/web/src/stores/scope-store.ts:14-20 | STUB (emit-to-seam by design) | `activeSpaceId` has 0 readers outside the selector (grep) |
| 6 global surfaces nav | global-surfaces-strip.tsx · global-surfaces-list.tsx | N/A-by-role | Routing only, no data |

### B. Interactions
| Interaction | Wired? | File:line |
|---|---|---|
| Open the scope menu / pick a Space / All | yes (store). In prod the trigger is **disabled** (empty list) | scope-selector.tsx:53-60,68 |
| Surface nav (strip + panel list) | yes | global-surfaces-strip.tsx:66-76 · nav-link.tsx:74 |
| Search → ⌘K action | yes | global-surfaces-strip.tsx:37-43,69 · global-surfaces-list.tsx:54 |
| Scope actually filters anything | no-op (emit-to-seam) | scope-store.ts:9 |

### C. Declared deferrals
| Deferral | Doc:line | Home named | Home status | Verdict |
|---|---|---|---|---|
| "Live space-list read (`listSpaces`) → first-consumer pull (mod-spaces / fe-spaces-page)" (+ dangling-id reconcile) | fe-shell-scope/delivery/seam-contract.md:63-66 | mod-spaces / fe-spaces-page #20 | mod-spaces archived (done) **without** listSpaces. `fe-spaces-page.md` (LIF-220, planned) does **not** list this leg (`:1-16`) | HOMED⚠ (fe-spaces-page exists, but the leg is not recorded there and needs a ① listSpaces) |
| "Live view scoping → ViewProviderRegistry consumers (module build)" | seam-contract.md:67 | module ② tracks | open, per module | BORROWED (each module's ELC) |
| "ADR-006 amendment (formalize the global-scope selector surface) → tracked follow-up" | seam-contract.md:68 · envision.md:35 · slice-map.md:70 | "tracked follow-up" | no task / no ADR edit (grep `.claude/tasks`, `docs/core/decisions` → 0) | **ORPHAN** |
| "Space CRUD + the Spaces page → fe-spaces-page #20" | seam-contract.md:69 | fe-spaces-page | LIF-220 planned | HOMED |
| "Modules panel body (module nav) → separate re-home" | seam-contract.md:69 | none | — | ORPHAN (same item as fe-shell's; counted once) |
| "account deferred (→ fe-settings / a later System re-home)" | slice-map.md:28-31 | fe-settings | archived done; no account surface | **ORPHAN** |

### D. Envision conformance (8 ECs)
| EC | Type | Assertion | Status | Evidence |
|---|---|---|---|---|
| EC-1 | structural | Persistent `Spaces: <name>`/All switcher, list + All | ✅ | scope-selector.tsx:41-42,68 |
| EC-2 | structural | Degrade: empty→disabled All · loading busy · error offline `role=status` | ✅ | scope-selector.tsx:50-63 |
| EC-3 | structural | Strip: FULL all 6 icon-nav; **CONDENSED = Search + overflow** | ❌ | Condensed is **overflow-only**: Search folded into the More menu (`global-surfaces-strip.tsx:34-43,55-60`) per "fe-session-hud strip-budget decision (Victor 2026-10-18)". It was re-pinned in a code comment only, not in `fe-shell-scope/delivery/envision.md` §Gate (§2.5 rule 3) |
| EC-4 | structural | Panel body = scope + labeled surfaces + **account** | ❌ | No account affordance (`global-surfaces-list.tsx`). The drop was approved at Approval 1 (`slice-map.md:28-31`) but **not recorded in envision.md** (`:41` still says "ratified as-is") |
| EC-5 | structural | Bar 1 in both homes | ✅ | routes.tsx:32-33 · app-shell.tsx:160,293-294 |
| EC-6 | structural | Active-surface distinction | ✅ | nav-link.tsx:35,61-64 (brandEmphasis, a Victor-approved AA fix, TASKS.md:27) |
| EC-7 | feel | Reads as a scope switcher | ⏳ | In prod the selector is always a disabled "All" (stub). The switcher feel is unverifiable until Spaces are live |
| EC-8 | feel | AA full matrix incl. warm-dark | ✅ | VG ledger .claude/tasks/fe-shell-scope.md:39,50 (0 AA fails, real shell) |

**fe-shell-scope — ELC: STUB (its one data leg) · legs S2/P0/L0 · ORPHANs 2 (ADR-006 amendment · account) [+1 shared
with fe-shell] · EC ✅5/❌2/⏳1/?0 · debt: the scope selector can never show a Space (no ① listSpaces, stub read, emit-to-seam
scope). EC-3/EC-4 diverged by un-recorded re-pins.**

---

## 3. fe-codec-seams (#13, LIF-212, PR #119 merged) — N/A-by-role (Option A, decisions.md:1106-1108)

### A. Engine → consumer wiring ledger (process.md §5)
| Engine | Owning consumer (first) | Consumer exists? | Wired live? | Evidence |
|---|---|---|---|---|
| **SavedView** (ViewsService / ViewEngine) | fe-notes-and-pages #27, Notes collection | yes: `notes/notes-surface.tsx:24` → `collection/use-collection.ts:32` | **STUB**. Layout is local `useState`; filter/sort/new-view are `() => {}`; ViewsService is not in `Services` | use-collection.ts:8-12,33,38-41 · composition-root.ts:34-37 |
| **Capability/Block** (CapabilityRegistry / OfferedSet) | fe-home #18 (Dashboard), fe-notes S9 (add-menu) | HomeDashboard yes (`home/home-surface.tsx:86,91`). The **`toBlocks` adapter has 0 runtime consumers** (grep `dashboard/adapter` → only `seams/index.ts:19`) | **STUB**. `useHomeWidgets()` returns the constant `DEFAULT_HOME_WIDGETS` (`home/home-dashboard.tsx:77-79`). No registry in `Services` | home-dashboard.tsx:77-89 |
| **Template** (TemplatesService) | fe-notes #27 S8 (picker/save) | yes: `notes/use-templates.ts` · `notes/template-picker.tsx` | **STUB**. The list is a stub; apply/saveCurrent are no-ops. ① **instantiate/capture are unbuilt in `@vida/core`** (grep `instantiate|captureFromSpace` in `foundation/templates/service.ts` → 0) | use-templates.ts:1-13 |
| **Spaces** (SpacesService) | #15 scope selector (read) · #20 fe-spaces-page (CRUD + palette) | #15 yes (stub) · #20 **not built** (LIF-220 planned) | **STUB**. Constructed at composition-root.ts:70 but not exposed (:34-37) | spaces-scope.ts:25 |

### B. Interactions — N/A (renders nothing; envision.md:6).

### C. Declared deferrals
| Deferral | Doc:line | Home named | Home status | Verdict |
|---|---|---|---|---|
| "Live main-thread service bootstrap → UI-3/entity-CRUD/first consumer" | fe-codec-seams/delivery/slice-map.md:73-74 | first consumer | **DONE** by data-plane-wiring PR #148 (`db/CLAUDE.md:16`) | HOMED (closed) |
| "Template capture + instantiate EXECUTION → @vida/core templates S3–S5" | slice-map.md:75-76 | "@vida/core templates S3–S5" | no task file carries it (grep `.claude/tasks` → only fe-notes mentions) | **ORPHAN** |
| "Per-module ReadProvider implementations → each module's ② track" | slice-map.md:80-81 | module tracks | open | BORROWED (module ELCs) |
| "Per-surface live hooks (useCollection·useDashboard·useView) → first consumers (#20/#27+)" | slice-map.md:82-83 | #27 / #18 / #20 | #27 consumer exists (stub hook) · useDashboard **never built** · #20 planned | BORROWED (notes ELC · home ELC/HARD-1 · fe-spaces-page) |
| "scope selector → #15" · "Spaces page → #20" | slice-map.md:77-79 | #15 · #20 | done · planned | HOMED |

### D. Envision — no ECs (SKIP stated, envision.md:6-18). Count 0.

**fe-codec-seams — ELC: N/A-by-role · consumers: SavedView→notes (exists, STUB) · Capability→home (exists, STUB; adapter
unused) · Template→notes (exists, STUB + ① unbuilt) · Spaces→#15 (stub) / #20 (not built) · ORPHANs 1 · EC n/a · debt:
all four engines are unwired. None of view/capability/templates/spaces is in `Services`.**

---

## 4. fe-codec-flow-session (#11, LIF-210, PR #109 merged)

### A. Data legs (via consumers)
| Leg | File:line | Status | Evidence |
|---|---|---|---|
| Codec shell `FlowSessionView` | packages/ui/src/components/flow-session-view.tsx | N/A-by-role | presentational |
| Consumer #23 session runtime → `useFlowSession` | apps/web/src/flow/use-flow-session.ts:35-45,69+ · session-runtime/session-runtime-surface.tsx:42 | STUB | M1 = empty / `?sample`. `noopPort` (transition/attach only log). The sessions service is not in `Services` |
| **Effect-rail log** (applied_effects read) | apps/web/src/flow/adapter.ts:85-93 · flow-source.ts:79,102 | STUB + **① seam defect** | The adapter maps `AppliedEffectRow[]`, but `@vida/core` has **no read API** for applied effects: `EffectRail` exposes only `applyEffect` (`packages/core/src/foundation/effects/service.ts:26`). The sessions service has none either |
| Consumer: gamification rule-authoring Flow | apps/web/src/gamification/rule-authoring-flow.tsx:174 | (fe-gamification's census) | renders FlowSessionView with no effect/sync props |

### B. Interactions (exercised at #23)
| Interaction | Wired? | File:line |
|---|---|---|
| Mark done / require proof / attach | **no-op** (noopPort) | use-flow-session.ts:35-45 |

### C. Declared deferrals
| Deferral | Doc:line | Home | Home status | Verdict |
|---|---|---|---|---|
| "Live useFlowSession(sessionId) hook deferred to the first consumer (fe-session-runtime #23 / fe-check-ins / fe-onboarding)" | fe-codec-flow-session/delivery/slice-map.md:62-64 | #23 | #23 merged (archived) with the hook still a stub. Seeded as `module-go-lives.md:38` (sessions) | BORROWED → sessions entity ELC (G2 to mint) |
| "the 'stages' backend shape (design-intent ext → #23 / schema)" | slice-map.md:13,53,66 | #23 | #23 doc-resolved: generic single-stage, multi-stage "when a driving module supplies it" (`fe-session-runtime/delivery/interpretation.md:40-46,83`) | BORROWED (driving module tracks) |
| "effect WRITES + lifecycle engine → @vida/core sessions + AR-7 rail (O4)" | slice-map.md:90 | core | built (applyEffect). **The READ of the ledger is unhomed** | **ORPHAN** (applied-effects read API) |
| O1 HUD → #16 · O2 runtime page → #23 · O3 pomodoro widget | slice-map.md:88-89 | #16/#23/ui-2 | all merged | HOMED |
| "Per-consumer flow SURFACES → each owning module's ② track (O7)" | slice-map.md:93-94 | module tracks | open | BORROWED |

### D. Envision conformance (11 ECs)
| EC | Type | Assertion | Status | Evidence |
|---|---|---|---|---|
| EC-1 | structural | staged progression w/ fulcrum | ✅ (codec) | VG ledger .claude/tasks/fe-codec-flow-session.md:24. Not exercised live: #23 is single-stage |
| EC-2 | structural | current stage: deliverable + attach + mark-done + proof | ✅ | flow-session-view.tsx:169-179 |
| EC-3 | structural | done proof / upcoming faded / dot states | ✅ (codec) | ledger :24 |
| EC-4 | structural | calm chronological effect log, empty = EmptyState | ✅ (codec) | flow-session-view.tsx:81-82,272. Live it is always empty (no ① read) |
| EC-5 | structural | title-hero + HonestProgress + SyncStatus slot | ✅ | flow-session-view.tsx:8,57,61 |
| EC-6 | structural | per-stage state, aria-busy / role=status | ✅ | flow-session-view.tsx:125,134 |
| EC-7 | structural | 375→1440 no overflow, centered | ✅ | flow-session-view.tsx:95 · ledger :24 |
| EC-8 | structural | tokens, dark designed, preset accent flips | ✅ | ledger :24 |
| EC-9 | structural | single-stage reads sanely | ✅ | use-flow-session.ts sample · fe-session-runtime interpretation.md:46 |
| EC-10 | feel | stage advance feels immediate | ⏳ | Advance is a no-op in prod (noopPort), so it cannot be felt until sessions are live |
| EC-11 | structural | semantic type scale, no px | ✅ | ledger :24 |

**fe-codec-flow-session — ELC: N/A-by-role (consumer #23 STUB) · legs S2/P0/L0 (via consumer) · ORPHANs 1 (applied-effects read)
· EC ✅10/❌0/⏳1/?0 · debt: runtime page is display-only (no-op port). The effect-rail log has no `@vida/core` read API to wire.**

---

## 5. fe-codec-entity-facet (#6, LIF-209, PR #105 merged)

### A. Data legs (via consumers)
| Leg | File:line | Status | Evidence |
|---|---|---|---|
| Codec `EntityView` | packages/ui/src/components/entity-view.tsx | N/A-by-role | — |
| Consumer: Note entity page data | apps/web/src/notes/note-entity.tsx · notes/use-note-entity.ts:133 | LIVE | `(await getServices()).notes.getPage(id)` |
| Consumer: Home journal facet | apps/web/src/home/use-journal-entry.ts:68 | LIVE | `notes.ensureJournal(date)` |
| merged⇄tabbed per-instance MEMORY | apps/web/src/notes/note-entity.tsx:42,104-107 | STUB | `createInMemoryEntityModeStore('tabbed')`, lost on reload |

### B. Interactions
| Interaction | Wired? | File:line |
|---|---|---|
| merged⇄tabbed toggle | yes (session-only) | note-entity.tsx:105-107 · entity-view.tsx:165 |
| Home⇄Content tabs | yes | entity-view.tsx:4 (ui-1 Tabs) |

### C. Declared deferrals
| Deferral | Doc:line | Home | Home status | Verdict |
|---|---|---|---|---|
| "Live useEntity(entityType, entityId) hook deferred to the first consumer (module entity pages)" | fe-codec-entity-facet/delivery/slice-map.md:56-57 | module pages | notes realised it (`useNoteEntity` LIVE) | HOMED (realised for notes) |
| "Per-instance merged/tabbed MEMORY storage → design-pass-open (O4)" | slice-map.md:81 · interpretation.md:211 | "design-pass-open" | no unit (`note-open-behavior-preference.md` is about create/open, not facet mode) | **ORPHAN** |
| "Editor facet BODY → Canvas: Editor #7 (O1)" | slice-map.md:78 | fe-codec-canvas-editor | merged (TASKS.md:28) | HOMED |
| "per-module entity surfaces + data → module ② tracks (O5)" | slice-map.md:81 | module tracks | open | BORROWED |

### D. Envision conformance (8 ECs)
| EC | Type | Assertion | Status | Evidence |
|---|---|---|---|---|
| EC-1 | structural | merged stack + divider | ✅ | entity-view.tsx · VG ledger .claude/tasks/fe-codec-entity-facet.md:6 |
| EC-2 | structural | tabbed Home/Content (ui-1 Tabs) | ✅ | entity-view.tsx:4 |
| EC-3 | structural | page-less → no editor, no Content tab | ✅ | apps/web/src/entity/adapter.ts:33-34,64 |
| EC-4 | structural | aria-pressed mode toggle in header | ✅ | entity-view.tsx:76,165 |
| EC-5 | structural | per-facet state, calm role=status | ✅ | entity-view.tsx:104-109 |
| EC-6 | structural | 375→1440, centered | ✅ | entity-view.tsx:69 · ledger :6 |
| EC-7 | structural | serif title, tokens, dark, preset | ✅ | ledger :6 |
| EC-8 | feel | switch immediate; editor reads as a notebook | ⏳ | Needs the live notes page (now live). Not yet re-verified under the ELC |

**fe-codec-entity-facet — ELC: N/A-by-role (consumers notes/home LIVE) · legs S1/P0/L2 · ORPHANs 1 (mode memory) ·
EC ✅7/❌0/⏳1/?0 · debt: the merged/tabbed choice is not persisted. Everything else is live through notes.**

---

## 6. fe-codec-dashboard (#5, LIF-208)

### A. Data legs (via consumers)
| Leg | File:line | Status | Evidence |
|---|---|---|---|
| Codec `DashboardView` | packages/ui/src/components/dashboard-view.tsx | N/A-by-role | — |
| Consumer Home widgets (`useHomeWidgets` / `renderHomeWidget`) | apps/web/src/home/home-dashboard.tsx:77-89 | STUB | A constant widget set plus teaching-placeholder bodies |
| `toBlocks` / `useDashboard(spaceId)` over `block_instances` | apps/web/src/dashboard/adapter.ts:88-95 · dashboard/CLAUDE.md:23-26 | STUB (hook never built; adapter has 0 runtime consumers) | grep |

### B. Interactions
| Interaction | Wired? | File:line |
|---|---|---|
| Empty-dashboard "add" affordance | missing at the consumer (the `emptyAction` slot is never passed) | dashboard-view.tsx:190-198 · grep `emptyAction` in home → 0 |
| ⋯ per-block action | slot only; Home passes none | dashboard-view.tsx:40-41 |

### C. Declared deferrals
| Deferral | Doc:line | Home | Home status | Verdict |
|---|---|---|---|---|
| "Live useDashboard(spaceId) hook deferred to the first consumer (Home #18 / Finance)" | fe-codec-dashboard/delivery/slice-map.md:49-50 | Home #18 | #18 merged without it | BORROWED → HARD-1 (summary/dashboard, reconstructed-structure.md:176) + home ELC |
| "Placement EDIT (add/remove/drag/resize/reorder) → a Capability (O1)" | slice-map.md:70 · interpretation.md:203-204 | "a Capability" (unnamed) | no unit | **ORPHAN** |
| "The 11 standalone block WIDGETS + registry wiring → their own unit(s)/module ② tracks (O2)" | slice-map.md:71 | unnamed "own unit(s)" | no unit; Home renders placeholders | **ORPHAN** |
| "Per-module/per-Space block SETS + live data wiring → owning ② track (O3)" | slice-map.md:72 | module tracks | open | BORROWED |
| "Home arrangement toggle (O4) · Spaces page (O5) · other shells (O6)" | slice-map.md:73 | fe-settings / #20 / own units | done / planned / done | HOMED |

### D. Envision conformance (8 ECs)
| EC | Type | Assertion | Status | Evidence |
|---|---|---|---|---|
| EC-1 | structural | heterogeneous span grid, distinct sizes | ✅ | dashboard-view.tsx:28,79-82 |
| EC-2 | structural | Card + header (title + ⋯ slot) + divider | ✅ | dashboard-view.tsx:108-115,205 |
| EC-3 | structural | per-block 8-state | ✅ | dashboard-view.tsx:123-160 |
| EC-4 | structural | single column at 375 | ✅ | VG ledger .claude/tasks/fe-codec-dashboard.md:26 |
| EC-5 | structural | empty → EmptyState with add affordance | ✅ (codec slot) | dashboard-view.tsx:190-198. No consumer fills `emptyAction` (O1 orphan) |
| EC-6 | structural | lone span capped (maxWidth) | ✅ | dashboard-view.tsx:75-82 |
| EC-7 | feel | preset identity | ✅ | ledger fe-codec-dashboard.md:26 |
| EC-8 | structural | mobile-safe floors | ✅ | dashboard-view.tsx:79-82 (lg min 320) |

**fe-codec-dashboard — ELC: N/A-by-role (consumer Home STUB) · legs S2/P0/L0 · ORPHANs 2 (placement-edit Capability · the 11
standalone widgets) · EC ✅8/❌0/⏳0/?0 · debt: Home's dashboard is a constant set of placeholder cards. `useDashboard`
and the toBlocks adapter are unused.**

---

## 7. fe-codec-collection (#4, LIF-207, archived complete)

### A. Data legs (via consumer Notes #27)
| Leg | File:line | Status | Evidence |
|---|---|---|---|
| Codec `CollectionView` | packages/ui/src/components/collection-view.tsx | N/A-by-role | — |
| Rows (notes list) | apps/web/src/notes/use-notes-rows.ts:56 | LIVE | `notes.listPages()` (via NotesService, **not** ViewEngine) |
| View config (layout persist · filter · sort · new view) | apps/web/src/collection/use-collection.ts:33,38-41 | STUB | local state + `() => {}`. The file's comment "no composition root" (`:9-10`) is stale |
| `resolved.degraded` → declared non-error | apps/web/src/collection/adapter.ts:60-69 · notes/notes-surface.tsx:31 | STUB / defect | The adapter **drops** `degraded`. The consumer hardcodes `degraded: []` |

### B. Interactions
| Interaction | Wired? | File:line |
|---|---|---|
| Layout switch | yes (session-local, not persisted) | use-collection.ts:38 |
| Filter / Sort / `+` New view | **no-op** (rendered, live in prod) | notes-surface.tsx:46-48 → use-collection.ts:39-41 |

### C. Declared deferrals
| Deferral | Doc:line | Home | Home status | Verdict |
|---|---|---|---|---|
| "Filter / group / sort LOGIC → the View Engine / provider (O1)" | fe-codec-collection/delivery/slice-map.md:99 | View Engine | engine built (`foundation/views`), not registered | BORROWED → notes ELC (first consumer) |
| "SavedView persistence / clone / global-vs-Space → ViewsService (O4)" | slice-map.md:103 | ViewsService | built, not registered | BORROWED → notes ELC |
| "Entity writes (drag-to-move, inline edit) → a Capability (O2)" | slice-map.md:100 | "a Capability" | no unit | **ORPHAN** |
| "Per-module layout variants + concrete data wiring → owning module ② track (O3)" | slice-map.md:101-102 | module tracks | open | BORROWED |
| useCollection live hook → first consumer | apps/web/src/collection/CLAUDE.md:14-18 | #27 | consumer exists, still a stub | BORROWED → notes ELC |

### D. Envision conformance (8 bullet ECs, envision.md:38-57)
| EC | Type | Assertion | Status | Evidence |
|---|---|---|---|---|
| EC-1 | structural | 7 layouts in one switcher, active filled + aria-pressed | ✅ | collection-view.tsx:216-222 |
| EC-2 | structural | chrome persistent + active in every state | ✅ | collection-view.tsx:177-192 |
| EC-3 | structural | empty = EmptyState; calendar keeps grid | ✅ | collection-view.tsx:151 |
| EC-4 | structural | 375 switcher condenses to menu, ≥44 | ✅ | collection-view.tsx:141-143,201-209 |
| EC-5 | structural | calm error; **per-type `degraded` renders as a declared non-error** | ❌ | The error half holds. The `degraded` half is absent: `toCollectionChrome` never reads `resolved.degraded` (adapter.ts:60-69), CollectionView has no degraded prop (grep → 0), and the consumer hardcodes `[]` (notes-surface.tsx:31) |
| EC-6 | structural | label toolbar + `+` new view (entry points) | ✅ (codec) | collection-view.tsx:192,216. At the consumer the entry points are no-ops (§B) |
| EC-7 | feel | switch instant + calm, reduced-motion | ⏳ | needs live views |
| EC-8 | feel | hover/active consistent | ✅ | VG ledger .claude/tasks/archive/fe-codec-collection.md:29,35 |

**fe-codec-collection — ELC: N/A-by-role (consumer Notes PARTIAL) · legs S2/P0/L1 · ORPHANs 1 (entity-write Capability) ·
EC ✅6/❌1/⏳1/?0 · debt: the notes collection shows live rows, but Filter/Sort/New-view are no-ops, the layout isn't
persisted, and `degraded` is silently dropped.**

---

## Old #69 RIDE-leg trace (FE-shell-integration-wiring)

Source: the 11 legs are listed at `docs/specs/foundation/backend-intent/decomposition-p6.md:15`. They are
dispositioned at `backend-intent/PLAN-p6-frontend-track.md:104-119` and in `traceability-p6.md:206-214,227,229`. The
row is at `delivery-structure-reconstruction/reconstructed-structure.md:145`. The split is at
`frontend-replan/g6-edge-ledger.md:33` (#14 · #15 · #16 · #17).

**Key finding:** #69's wiring Goal was copied verbatim into `fe-shell`'s task Goal ("Wires the built M1.0 UI (⌘K search ·
export dialog · MD/PDF/DOCX serializers · neural-graph · Spaces add-menu · view degradation)…",
`.claude/tasks/fe-shell.md:13`). It was **never carried into fe-shell's slice-map** (`fe-shell/delivery/slice-map.md:8-12`
scope = frame/panels/slots only). #15 and #16 don't carry it, and **#17 `fe-cmdk` was never minted** (no task file;
`g6-reshape-runbook.md:51`). The DB-8 → consumer edge still points at the superseded row
(`reconstructed-structure.md:178` "FE-shell-integration-wiring [live-search completion]").

| # | Leg | Landed (unit · file:line) | State | Home | Verdict |
|---|---|---|---|---|---|
| 1 | XCU-BSE-14 FTS5 ranked query (backend-intent/parts/xcut-backlinks-search-export.md:45) | engine: `packages/core/src/services/search` (DB-8). UI: ⌘K search mode `apps/web/src/shell/command-bar.tsx:77` | STUB (`stubSearchProvider`) | DB-8 (LIF-70, planned) | BORROWED (DB-8) |
| 2 | XCU-BSE-15 SearchProvider seam + SearchResult (:46) | `apps/web/src/command-bar/search-provider.ts` · `shell/use-command-search.ts:10-33` | Seam built. Provider STUB | The UI swap was #69's; DB-8's task has no command-bar line (grep `db-8-fts5-search.md` → 0), and its Blocks edge targets the dead #69 | **ORPHAN** (consumer swap) |
| 3 | XCU-BSE-16 search terminal states (:47) | `shell/command-bar.tsx:8-9,79-80,157` (`SearchStatusRegion`, `search-unavailable`) | LIVE-honest (states rendered). Results UI = "DB-8 seam, FOLD-2" | — | landed (UI-4) |
| 4 | XCU-BSE-19 Markdown serializer (:50) | `packages/editor/src/serializers/to-markdown.ts` (exported `packages/editor/src/index.ts:12`) | Built, **0 app consumers** | none | **ORPHAN** |
| 5 | XCU-BSE-20 PDF serializer (:51) | `packages/editor/src/serializers/to-pdf.tsx` (index.ts:16) | Built, 0 consumers | none | **ORPHAN** |
| 6 | XCU-BSE-21 DOCX serializer (:52) | `packages/editor/src/serializers/to-docx.ts` (index.ts:19) | Built, 0 consumers | none | **ORPHAN** |
| 7 | XCU-BSE-22 Export dialog (:53) | `packages/ui/src/components/export-dialog.tsx` (index.ts:68) | Built, **mounted nowhere** in apps/web (grep `ExportDialog` → 0) | none (fe-notes slice-map has no export slice) | **ORPHAN** |
| 8 | XCU-BSE-23 neural-graph data-prep (:54) | `/graph` route `apps/web/src/app/graph/index.tsx:9` | STUB (`nodes={[]} state="empty"`) | HARD-3 (LIF-114, planned; process.md §3 graph → HARD-3) | BORROWED (HARD-3) |
| 9 | XCU-BSE-24 graph terminal states (:55) | `app/graph/index.tsx:9` · `packages/ui/src/components/neural-graph.tsx:211` | LIVE-honest (empty/error states render) | HARD-3 for live data | landed (UI-4 S5) |
| 10 | XCU-SP-29 Space standalone add-menu palette enforcement (parts/xcut-spaces.md:49) | not landed. No `enabled_blocks`/palette consumer in apps/web or packages/editor (grep → 0). fe-notes S9 took only the page-level CAP-12/13 (`fe-notes-and-pages/delivery/slice-map.md:32`) | ABSENT | Natural home is fe-spaces-page #20, but `fe-spaces-page.md` does not list it | **ORPHAN** |
| 11 | views:XCU-14 layout↔field compatibility / view degradation (parts/xcut-views.md:27) | not landed. The ViewEngine has no field-declaration ("gap: field-declaration not in built engine", :27). Collection adapter drops `degraded` (adapter.ts:60-69). Viewmodes defers it "upstream" (`fe-codec-viewmodes/delivery/seam-contract.md:22`) | ABSENT | none | **ORPHAN** (ties to fe-codec-collection EC-5 ❌) |

**#69 summary:** of 11 legs, 2 landed honest (BSE-16, BSE-24), 2 are BORROWED to real homes (BSE-14 → DB-8, BSE-23 →
HARD-3), and **7 are ORPHAN**: BSE-15 consumer swap · BSE-19/20/21 serializers · BSE-22 export dialog · SP-29 · XCU-14.
The serializers and export dialog are fully built in packages but no surface uses them, so a user can't export a note.

---

## ORPHAN list (all units, de-duplicated)
1. Modules panel body / module nav (`ModuleDock` unmounted). fe-shell slice-map.md:47 + PLAN-s3:45-50 · fe-shell-scope seam-contract.md:69
2. #17 `fe-cmdk` never minted as a unit (g6-reshape-runbook.md:51; no task file)
3. ADR-006 amendment for the global-scope selector. fe-shell-scope seam-contract.md:68
4. Account affordance (dropped from #15 → "fe-settings / later System re-home"). fe-shell-scope slice-map.md:28-31
5. Template instantiate/capture EXECUTION (`@vida/core` S3–S5). fe-codec-seams slice-map.md:75-76
6. Applied-effects READ API (effect-rail log has no source). fe-codec-flow-session adapter.ts:85 vs core effects/service.ts:26
7. Entity-facet merged/tabbed memory storage (O4). fe-codec-entity-facet slice-map.md:81
8. Dashboard placement-edit Capability (O1). fe-codec-dashboard slice-map.md:70
9. The 11 standalone integration-block widgets + registry wiring (O2). fe-codec-dashboard slice-map.md:71
10. Collection entity-write Capability (drag-to-move / inline edit, O2). fe-codec-collection slice-map.md:100
11–17. #69 legs: BSE-15 consumer swap · BSE-19 MD · BSE-20 PDF · BSE-21 DOCX · BSE-22 export dialog · SP-29 Space add-menu · XCU-14 view degradation

**Total ORPHAN: 17** (10 unit-level + 7 #69 legs).

## EC divergence list (❌)
1. **fe-shell-scope EC-3**: "CONDENSED (≤375) = Search + overflow". Built: overflow-only, with Search folded into the menu
   (global-surfaces-strip.tsx:34-43). Victor's 2026-10-18 strip-budget decision is recorded only in a code comment, not
   re-pinned in envision.md.
2. **fe-shell-scope EC-4**: "System panel body = scope + labeled surfaces + an **account** affordance". There is no account.
   The drop is recorded in slice-map.md:28-31, not in envision.md §Gate (which still says "ratified as-is", :41).
3. **fe-codec-collection EC-5**: "a per-type `degraded` outcome renders as a declared non-error". `degraded` is dropped by
   the adapter (adapter.ts:60-69), has no CollectionView prop, and is hardcoded `[]` at the consumer (notes-surface.tsx:31).

(#1–2 are re-pins that weren't recorded (§2.5 rule 3). Victor either records them in envision.md or the build reverts.)

**EC totals (55 ECs): ✅ 48 · ❌ 3 · ⏳ 4 · ? 0.** (fe-shell 12/0/0 · shell-scope 5/2/1 · seams n/a · flow 10/0/1 ·
facet 7/0/1 · dashboard 8/0/0 · collection 6/1/1.)

## Cross-unit notes
- **Composition root:** `SpacesService` is built (composition-root.ts:70) but not exposed in `Services` (:34-37). Exposing
  it is the cheapest first step for the #15/#20 Spaces legs, but a ① `listSpaces` must land first (service has no read).
- **notes ELC (fe-notes-and-pages)** owns three CODEC legs as first consumer: the SavedView view-config (filter/sort/new-view
  no-ops, layout not persisted), the `degraded` render (collection EC-5 ❌ is fixed in fe-codec-collection's adapter
  + CollectionView), and Templates (list stub + apply/save no-op).
- **home ELC / HARD-1** owns the Capability engine: `useHomeWidgets` is a constant (home-dashboard.tsx:77-79), and `toBlocks` /
  `useDashboard` are unused.
- **sessions ELC** owns `useFlowSession` + `noopPort` (#23) and the HUD's `use-active-session.ts`. The applied-effects
  read is a **① CODEC/core defect** that blocks flow EC-4 going live.
- **preferences ELC** owns `nav_preferences` (shell placement persistence) alongside the settings legs.
- **Stale comments** (should be fixed by whichever ELC touches them): `collection/use-collection.ts:8-10` and
  `flow/use-flow-session.ts:4-5` still say "no composition root / worker `values` seam throws". Both are false since PR #148.
- **DB-8 edge** `reconstructed-structure.md:178` targets the superseded #69. G3 must re-point it to the ⌘K consumer
  (CommandBar, currently owned by no live unit).
- **fe-shell task Goal** (`.claude/tasks/fe-shell.md:13`) claims #69's wiring scope that its slice-map never built. The task
  file misstates what shipped.
