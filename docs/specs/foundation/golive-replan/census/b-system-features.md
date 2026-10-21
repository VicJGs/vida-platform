# G1 census — batch B: system features

> Auditor: G1 debt-census (read-only). Units: fe-settings · fe-notifications · fe-onboarding · fe-gamification ·
> fe-session-hud · fe-session-runtime. Audited against `golive-replan/process.md` ELC-1…9 (§2.5, §3, §5).
> Schema: `census/_schema.md`. Worktree `golive-replan`, 2026-10-21.

**Baseline facts (apply to every unit below)**
- The composition root registers **only `notes` + `journals`** `[FACT: apps/web/src/db/composition-root.ts:34-37,77]`.
  `preferences`, `notifications`, `gamification` and `sessions` are not constructed, so every leg over them is STUB (ELC-3 unmet).
- The worker `values`/`exec`/`batch` seam that every unit below gives as the reason for its deferral is **now live**
  `[FACT: apps/web/src/db/client.ts:155-166]` (data-plane-wiring). The precondition has cleared, but no unit was re-wired.
  The queue that would have carried them, `module-go-lives.md` #2–#5, is **SUPERSEDED** `[FACT: .claude/tasks/module-go-lives.md:2,32-38]`,
  so these deferrals have no live issue. They are ORPHAN until golive-replan G2–G4 homes them.
- Each service and the deps it needs to register:
  - `createPreferencesService({db, deviceId})` `[packages/core/src/services/preferences/service.ts:229-232]`. No upstream deps.
  - `createSessionsService({db, deviceId, registry, rail, entityRegistry})` `[sessions/service.ts:185-186]`.
  - `createGamificationService({db, deviceId, rail?, registry?, measurement?, enforcer?})` `[gamification/types.ts:30-37]`.
  - `createNotificationsService({db, deviceId, engine, sessions:Pick<'dueIn'>, preferences?})` `[notifications/types.ts:26-36]`.
    This **needs the #46 ZK delivery engine + the sessions service** registered first. That makes it the deepest dep chain of the batch.

---

## fe-settings (LIF-193, PR #137, archived)

### A. Data legs
| Leg | File:line | Status | Evidence |
|---|---|---|---|
| `usePreferences()` read (merged prefs → stores, `state`) | apps/web/src/settings/use-preferences.ts:22-28 | STUB | returns in-session Zustand values + hard `state:'success'`. No `getServices()`; needs `preferences.getMergedPreferences()` + `getNavPreferences()` + `getModuleVisibility()` |
| `useUpdatePreferences()` persist | use-preferences.ts:32-43 | STUB | `persist` is a documented no-op (:40-41). Needs `updatePreferences` / `updateNavPreferences` / `setModuleVisibility`, plus the `patchDashboardLayout` read-merge-write (seam-contract.md:60-68) |
| Theme selection (preset/mode/density) → `UIProvider` | apps/web/src/stores/theme-store.ts:26-33 · App.tsx:35,102 | STUB (live in-session only) | The app re-themes live, but `hydrate()` is never called and nothing persists (theme-store.ts:9-13). Needs `getMergedPreferences` + `updatePreferences({theme, compact_mode, dashboard_layout.theme})` |
| Home arrangement | apps/web/src/home/home-surface.tsx:25-27 | STUB | reads the in-session `preferences-store`. Not persisted (`dashboard_layout.arrangement`) |
| Module show/hide · rename · Feature Atlas · Sync-log | settings/modules-pane.tsx:43-45,108,146 · stores/preferences-store.ts:84-86 | STUB | store-only. Needs `setModuleVisibility` + `updatePreferences({dashboard_layout.moduleNames})` |
| Locale + Notification channels | settings/locale-pane.tsx:33,77 · notifications-pane.tsx:12,34 | STUB | store-only. Needs `updatePreferences({date_format,time_format,week_starts_on,notification_*})` |

### B. Interactions
| Interaction | Wired? | File:line |
|---|---|---|
| Preset/mode/density → whole-app re-theme | yes (in-session) | App.tsx:35,102 |
| Any setting survives reload | **no-op** | use-preferences.ts:40-41 |
| Module show/hide → the dock/nav hides the module | **missing**: nothing outside `settings/` reads `moduleVisibility` | grep: only settings/ + preferences-store.ts. module-dock.tsx:44 filters on `isFeatureEnabled` only |
| Module rename → nav label changes | **missing**: `moduleNames` has no consumer | same grep |
| Reduce motion → app motion gated | **no-op** (an admitted gap) | preferences-store.ts:18-19 |
| Locale (date/time/week-start) → app formatting | **missing**: no consumer of `dateFormat`/`timeFormat`/`weekStartsOn` | grep: only settings/ |
| Search → jump to category | yes | settings-surface.tsx:123-130 |
| Settings reach (Bar-1 + ⌘K) | yes | nav/module-map.ts:104,119 · command-bar/nav-commands.ts:7,14-27 |

### C. Declared deferrals
| Deferral (quote) | Doc:line | Home named | Home status | Verdict |
|---|---|---|---|---|
| "Hydrate-on-boot + persistence = deferred seams … live-activated when the worker `values` seam lands" | fe-settings/delivery/seam-contract.md:19-23 · decisions.md:9 | worker `values` seam / first consumer | the seam landed (client.ts:155-166) but data-plane-wiring did not carry prefs; module-go-lives #2 SUPERSEDED | **ORPHAN** |
| (undeclared) module visibility/rename never consumed by the nav | — | none | — | **ORPHAN** |
| "this app-pref override's live effect is persistence-gated" (reduce-motion) | apps/web/src/stores/preferences-store.ts:18-19 | none (persistence won't add a motion consumer) | — | **ORPHAN** |
| (undeclared) locale prefs never consumed | — | none | — | **ORPHAN** |
| "the start/end time inputs are a follow-up" (quiet hours) | apps/web/src/settings/CLAUDE.md:38-39 | "follow-up" | no issue | **ORPHAN** |
| Feature Atlas / Sync-log toggles: the surfaces themselves | slice-map.md:74 | fe-feature-atlas LIF-215 · fe-sync-log LIF-221 | planned (open) | BORROWED |
| Account/Security + Data import-export "a later release" | slice-map.md:75 | Auth/Account M3 · Data/Sync M3/M4 | milestone owners | BORROWED |
| ⌘K command registration → fe-cmdk | slice-map.md:73 | UI-4/fe-cmdk | done (nav-commands derives Settings) | HOMED |

### D. Envision conformance (envision.md EC-1…12, plus D-ENV-1 → EC-3)
| EC | Type | Assertion | Status | Evidence |
|---|---|---|---|---|
| EC-1 | structural | two-pane rail + search-topped pane | ✅ | settings-surface.tsx:69-105,109-115 |
| EC-2 | structural | option-row label/control/hairline | ✅ | option-row.tsx:18-27 |
| EC-3 | structural | `Switch` everywhere for booleans (D-ENV-1) | ✅ | appearance-pane.tsx:94 · notifications-pane.tsx:34 · modules-pane.tsx:146 |
| EC-4 | structural | all 7 controls present **+ wired** | ❌ | All present, but show/hide, rename, Feature Atlas, Sync-log and reduce-motion change nothing outside the pane (B rows above). The preset list also omits `game` (appearance-pane.tsx:16-20 vs theme-resolution.ts:30) |
| EC-5 | structural | live re-theme via the theme store | ✅ | App.tsx:35,102 · theme-store.ts:26-33 (in-session) |
| EC-6 | structural | one index drives search + grouping; calm no-match | ✅ | settings-search.ts · settings-search-results.tsx:39 |
| EC-7 | structural | loading skeleton · read-error → defaults read-only · optimistic + "Saved on this device" + revert | ❌ | no `loading` branch (settings-surface.tsx:117-133). The error branch replaces the pane with a message instead of showing read-only defaults (:117-122). No "Saved on this device" string and no revert path (grep: 0 hits) |
| EC-8 | structural | Bar-1 + ⌘K reach; escape hatch | ✅ | module-map.ts:104,119 · nav-commands.ts:14-27 · settings-model.ts:37,44-45 |
| EC-9 | structural | delegated "a later release" placeholders | ✅ | delegated-pane.tsx:24,36 |
| EC-10 | structural | 375 single column | ✅ | settings-surface.tsx:75,83 (`$tablet` row); VG PASS (archive/fe-settings.md:22) |
| EC-11 | feel | editorial voice, AA | ⏳ | live only |
| EC-12 | feel | inline-rename feel | ⏳ | affordance present (modules-pane.tsx:81-85, Enter/Esc + save/cancel); feel is live-only |

**fe-settings — ELC: STUB · legs S6/P0/L0 · ORPHANs 5 · EC ✅8/❌2/⏳2/?0 · Debt: register `preferences`, add the hydrate + persist path (read-merge-write `dashboard_layout`), make the nav consume module visibility/names, wire reduce-motion and locale to their consumers, and build EC-7's loading/saved/revert states.**

---

## fe-notifications (LIF-192, PR #132, archived)

### A. Data legs
| Leg | File:line | Status | Evidence |
|---|---|---|---|
| `useNotifications()` rows + counts | apps/web/src/notifications/use-notifications.ts:121-130 | STUB | `[]` + `?sample`/`?force` only. Needs `notifications.list()` + `unreadCounts()` |
| Anticipations ("above now") | use-notifications.ts:10-13 | STUB | `upcoming:[]`. Needs `sessions.dueIn(range)` (another entity's data → BORROWED) |
| Lifecycle: markRead / archive / markAllRead | notifications-surface.tsx:109-132 | STUB | session-only overlay `Set`s. Needs `markRead` / `archive` / `markAllRead` |
| Lens preference | use-notification-lens.ts:12,37-54 | LIVE-local (by pin) | localStorage, as pinned by EC-1 ("persisted locally at M1"). Not debt |

### B. Interactions
| Interaction | Wired? | File:line |
|---|---|---|
| Lens switch (persists) | yes | use-notification-lens.ts:45-52 |
| Status filter All/Unread/Archived | yes (over stub rows) | notifications-surface.tsx:183 |
| Mark read / archive / mark all read | **no-op** (resets on reload) | notifications-surface.tsx:130-132 |
| Constellation: tap an area → its alerts | **missing**: the copy says "Select an area…" but no handler exists | lens-constellation.tsx:36,96 |
| Open an alert's `action_url` | ? not found in the lenses (no link rendering seen) | lens-margin.tsx:65-89 |

### C. Declared deferrals
| Deferral | Doc:line | Home | Home status | Verdict |
|---|---|---|---|---|
| "Live React-Query→`service.list()/unreadCounts()` swap documented, deferred (first-consumer)" | fe-notifications/delivery/interpretation.md:57-58 · slice-map.md:61 | first-consumer composition root | module-go-lives #3 SUPERSEDED; not registered | **ORPHAN** |
| "Writes are deferred-live — markRead/archive/markAllRead" | seam-contract.md:54-55 | same root | same | (folded into the row above) |
| "Live drill-down (tap area → its alerts) deferred with the data plane" | apps/web/src/notifications/CLAUDE.md:34-36 | data plane | landed; drill-down not built | **ORPHAN** |
| NOT-25 "At M1 (no live subject lookup) a row flagged `_dangling` … is honored" | apps/web/src/notifications/attention-model.ts:120-127 | none | — | **ORPHAN** |
| Anticipations = Sessions `dueIn` | use-notifications.ts:12-13 | sessions entity ELC | not registered | BORROWED (sessions) |
| Digest / push / email delivery | slice-map.md:62 | M2 (NF-15) | milestone | BORROWED (M2 / p2-2-zk-notifications) |
| Lens → `user_preferences` "a later concern" | use-notification-lens.ts:7 | — | EC-1 pins local storage at M1 | not debt |

### D. Envision conformance (EC-1…9)
| EC | Type | Assertion | Status | Evidence |
|---|---|---|---|---|
| EC-1 | structural | one route + lens switcher, local pref, default Margin | ✅ | routes.tsx:99-102 · use-notification-lens.ts:12-13 |
| EC-2 | structural | Margin: spine + now-line, anticipations above / settled below | ✅ | lens-margin.tsx:3-5,107 |
| EC-3 | structural | Dispatches: serif briefing in narrative groups | ✅ (nit) | lens-dispatches.tsx:79-81. The label reads "Today" where the pin says "This morning" (minor copy drift) |
| EC-4 | structural | Constellation (NeuralGraph): hubs + badges + "you" + **tap area → alerts** | ❌ | no tap/drill handler (lens-constellation.tsx:36,96). It is CSS/SVG rather than NeuralGraph (a §XXVIII deviation, CLAUDE.md:34-36) with no re-pin in envision.md §Approval (§2.5 rule 3) |
| EC-5 | structural | quiet severity, warm only for error/warning, AA | ✅ | attention-model.ts (warm flag) · VG AA (CLAUDE.md "title 15.8–17.3") |
| EC-6 | structural | NOT-25 dangling → "no longer available" in **every** lens, never a dead link | ❌ | Dangling is detected only from a sample `_dangling` flag (attention-model.ts:120-127), so a live row with a deleted subject renders as a live link. Constellation renders no per-alert row at all |
| EC-7 | structural | 8-state in every lens + lifecycle | ✅ (UI) | notifications-surface.tsx:90-99,143-174. The lifecycle is session-only (see B) |
| EC-8 | structural | serif display preloaded + AA titles on warm dark | ? | AA passed at VG (CLAUDE.md). Only `spectral-400` is preloaded (index.html:10); reading the code cannot tell whether the title face/weight is covered |
| EC-9 | feel | calm, reduced-motion safe | ⏳ | live only |

**fe-notifications — ELC: STUB · legs S3/P0/L0 (+1 local-by-pin) · ORPHANs 3 · EC ✅5/❌2/⏳1/?1 · Debt: blocked behind sessions + the #46 delivery engine. Once those are up: register `notifications`, flip list/counts/lifecycle, read live dangling subjects, and build Constellation's drill-down.**

---

## fe-onboarding (LIF-216, archived)

### A. Data legs
| Leg | File:line | Status | Evidence |
|---|---|---|---|
| First-run marker (`app_state`) | apps/web/src/onboarding/first-run-repo.ts:11-27 | LIVE | raw `driver.query/run` on device-local KV (no service needed) |
| Module enable-set `commit` | use-module-selection.ts:36 | STUB | `Promise.resolve()`. Needs `preferences.setModuleVisibility` (or a feature-flag store) |
| Theme `commit` | use-theme-selection.ts:39 | STUB | no-op. The preview does reach `theme-store` (App.tsx:39), so persistence rides fe-settings' `updatePreferences` |
| Live theme preview | App.tsx:39 · guided-setup-mount.tsx:27,33 | LIVE (in-session) | drives the shared theme-store |

### B. Interactions
| Interaction | Wired? | File:line |
|---|---|---|
| Post-first-run invitation (reach a) | yes | App.tsx:50-53 · guided-setup-store.ts:22 |
| `EmptyState.guidedSetup` slot (reach b) | **missing**: `GuidedSetupSlotButton` has 0 consumers | guided-setup-entry.tsx:48-58 (grep: no imports) |
| Continue / Skip step / Skip setup / Enter Vida | yes | guided-setup.tsx:96-109 |
| Module picks change the dock | **no-op** | use-module-selection.ts:36 |
| Theme pick survives reload | **no-op** | use-theme-selection.ts:39 |

### C. Declared deferrals
| Deferral | Doc:line | Home | Home status | Verdict |
|---|---|---|---|---|
| "Live module-enablement persistence → M1.1 `nav_preferences`/feature-flags" | fe-onboarding/delivery/slice-map.md:85 · PLAN-s4-reach-mount.md:43 | "M1.1" (a milestone label) | no issue; feature-flags.ts:9-12 is still a fail-closed stub | **ORPHAN** |
| "Live theme-persist → the deferred theme-switcher store" | slice-map.md:86 · PLAN-s3:46 | theme store (fe-settings S2) | the store exists, but its persistence is fe-settings' ORPHAN | BORROWED (fe-settings / preferences) |
| "slot's consumption by each real module surface → those surfaces' own units" | PLAN-s4-reach-mount.md:41-42 | unnamed "surfaces' own units" | no unit lists it | **ORPHAN** |
| Vault / passphrase / unlock | slice-map.md:87 | AR-3 / M3 | ar-3-crypto-vault-keymgmt.md open | HOMED |

### D. Envision conformance (EC-1…10)
| EC | Type | Assertion | Status | Evidence |
|---|---|---|---|---|
| EC-1 | structural | opt-in from ≥2 paths (invitation + EmptyState slot) | ❌ | Only path (a) is live. Path (b) is registered nominally (guided-setup-reach.ts:12-16), but no surface renders the slot (0 consumers) |
| EC-2 | structural | never a wall; persistent "Skip setup →" | ✅ | guided-setup.tsx:102-109 |
| EC-3 | structural | LEFT-rail vertical stage indicator | ✅ | guided-setup.tsx:38,53 · step-rail.tsx:49 |
| EC-4 | structural | module picker, grouped by `ModuleGroup` | ✅ (UI) | modules.ts:9-20 · guided-setup-mount.tsx:31. The commit is a stub (A) |
| EC-5 | structural | THEME_PRESETS swatches with live preview | ✅ | theme-picker.tsx:10 · App.tsx:39 |
| EC-6 | structural | honest "You're set" + Enter Vida | ✅ | guided-setup-steps.ts:41 · guided-setup.tsx:99 |
| EC-7 | structural | copy honesty (lintCopy) | ✅ | guided-setup-steps.ts:3-4 · guided-setup-entry.tsx:2 |
| EC-8 | structural | responsive 375/768/1440 | ✅ | guided-setup.tsx:38,53 (horizontal rail < tablet); VG PASS (archive/fe-onboarding.md:55,81,95) |
| EC-9 | structural | AA full matrix | ✅ | VG ledger, archive/fe-onboarding.md:55,95,121 |
| EC-10 | feel | calm, instant under reduced motion | ⏳ | live only |

**fe-onboarding — ELC: PARTIAL · legs S2/P0/L2 · ORPHANs 2 · EC ✅8/❌1/⏳1/?0 · Debt: wire the slot into empty module surfaces (EC-1). Commits ride the preferences/feature-flag persistence.**

---

## fe-gamification (LIF-181, PR #140 merged `8c1070d`; task file still says in_review)

### A. Data legs
| Leg | File:line | Status | Evidence |
|---|---|---|---|
| Overview (`useGamification`) | apps/web/src/gamification/use-gamification.ts:8-17,137 | STUB | fresh-System default + `?sample`. Needs `getProfile` / `getLevel` / `getBalances` / `listCurrencies` / `getUserAchievements` |
| Currencies + `+ New currency` | use-currencies.ts:10-12,46,101-103 | STUB | create is optimistic-local. Needs `listCurrencies` + `getBalances` + `defineCurrency` |
| Achievements | use-achievements.ts:6,14,102 | STUB | empty. Needs `listAchievements` × `getUserAchievements` (+ `seedAchievements` at init) |
| Rules + Flow create/enable/disable/delete | use-rules.ts:5-16,78 | STUB | optimistic-local. Needs `listRules` / `createRule` / `enableRule` / `disableRule` / `deleteRule`, plus the measurement registry (empty-seam pinned) |
| Activity (consequence ledger) | use-activity.ts:6-15,113 | STUB | **the ① read does not exist**: no `listConsequences` on `GamificationService` (gamification/types.ts:66-100) |
| Persona → reward copy | use-persona.ts:9-10,34 | STUB | always `neutral`. Needs `preferences` persona/`motivation_style`; **Settings has no persona control** |
| Reach (dock + ⌘K) | shell/feature-flags.ts:9-12 · module-dock.tsx:44 · command-bar.tsx:74 · module-map.ts:102 | STUB | `feature_gamification` fails closed, so the surface is reachable only by typing `/gamification` |

### B. Interactions
| Interaction | Wired? | File:line |
|---|---|---|
| Mode switch (5 tabs) | yes | gamification-surface.tsx |
| `+ New currency` | **no-op** (session-only) | currencies-mode.tsx:59-87 |
| Rule enable/disable/delete, `+ New rule` → Flow create | **no-op** (session-only) | rules-mode.tsx:5 · use-rules.ts:5-6 |
| Open /gamification from the dock or ⌘K | **missing** (flag fail-closed, no flag store) | feature-flags.ts:9-12 |
| Pick the `game` preset in Settings | **missing** (only in onboarding) | appearance-pane.tsx:16-20 |

### C. Declared deferrals
| Deferral | Doc:line | Home | Home status | Verdict |
|---|---|---|---|---|
| "live hooks … data STUBBED … live swap is one binding at the first composition root" | fe-gamification/delivery/slice-map.md:11-13 | first composition root | module-go-lives #4 SUPERSEDED | **ORPHAN** |
| "F-S5-1: enriched ledger-history read = unbuilt ①-tier first-consumer-pull seam" | slice-map.md:66 | first-consumer pull on mod-gamification | mod-gamification archived (done); no issue | **ORPHAN** |
| persona read: "the setter is `fe-settings` LIF-193" | apps/web/src/gamification/CLAUDE.md:18-19 · .claude/tasks/fe-gamification.md:24 | fe-settings | fe-settings closed without a persona control | **ORPHAN** |
| `feature_gamification` flag source "built at M1.1" | apps/web/src/shell/feature-flags.ts:4-7 | "M1.1" (a milestone label) | no issue | **ORPHAN** |
| quests/challenges = Spaces, INTENDED-later, OUT | slice-map.md:74 | Spaces | by design | BORROWED (Spaces) |
| Dream earmark (Purposes read) | envision.md:31 | Purposes | fe-purposes-and-goals open | BORROWED |

### D. Envision conformance (EC-1…12)
| EC | Type | Assertion | Status | Evidence |
|---|---|---|---|---|
| EC-1 | structural | `game` global preset, AA L/D | ✅ | packages/ui/src/theme-resolution.ts:30; G0 VG PASS (task file) |
| EC-2 | feel | reads as a manhwa "System" | ⏳ | live only |
| EC-3 | structural | 5-mode switcher, no routed detail | ✅ | gamification/CLAUDE.md:28,67-69 |
| EC-4 | structural | level/XP hero (bar vs ring) + balances + recent | ✅ | xp-hero.tsx · gamification-overview.tsx |
| EC-5 | structural | currencies grouped by 3 kinds, 🔒, **paginated**, `+ New` | ✅ | currencies-mode.tsx:4-6,59-87 (paging in use-currencies.ts) |
| EC-6 | structural | achievements by category × tier + progress, **paginated** | ❌ | no pagination: 0 `pag` hits in achievements-mode.tsx / use-achievements.ts. CollectionView does not page (achievements-mode.tsx:121-139) |
| EC-7 | structural | rules + enable/disable/delete, **paginated**, `+ New rule` | ❌ | no pagination: 0 hits in rules-mode.tsx / use-rules.ts (rules-mode.tsx:72-82) |
| EC-8 | structural | ledger history, paginated | ✅ (UI) | activity-mode.tsx:71-128. Its ① read is missing (A) |
| EC-9 | structural | Flow: condition (registry, honest empty) → reward (+ Dream) | ✅ | rule-authoring-flow.tsx · CLAUDE.md:31-38 |
| EC-10 | structural | persona → copy only | ✅ (mechanism) | reward-copy.ts. The persona read is stubbed to neutral (A) |
| EC-11 | structural | lucide icons, no emoji; compose, don't rebuild | ✅ | CLAUDE.md:43,51,62 |
| EC-12 | structural | 8 states, 375–1440, both presets, no overflow | ✅ | VG ledger S5: AA 4.88–6.53, 0 overflow (slice-map.md:68) |

**fe-gamification — ELC: STUB · legs S7/P0/L0 · ORPHANs 4 · EC ✅9/❌2/⏳1/?0 · Debt: register `gamification` (with rail/registry/measurement), build the ① `listConsequences` read, paginate Achievements and Rules, give the feature flag a real source so the dock/⌘K can reach the surface, and add the persona and `game` preset controls to Settings.**

---

## fe-session-hud (#16, PR #144, archived)

### A. Data legs
| Leg | File:line | Status | Evidence |
|---|---|---|---|
| `useActiveSession()` read | apps/web/src/session-hud/use-active-session.ts:152-160 | STUB | `{kind:'hidden'}` + `?sample`. Needs ① `findActiveSession()`, which **does not exist** on SessionsService (sessions/service.ts:120-174; nearest is `findOpenSessionForEntity`) |
| Countdown truth (endAt/phase/pausedAt) | use-active-session.ts:16-19 | STUB | needs a ② shared focus-runtime store (not built) |
| Pause/resume port | use-active-session.ts:33-45 | STUB | no-op. Needs `sessions.pauseFocus` / `resumeFocus` (service.ts:146-147) |

### B. Interactions
| Interaction | Wired? | File:line |
|---|---|---|
| Pill → `/sessions/$id` | yes (sample only; prod shows nothing) | session-hud.tsx:147,163 |
| Pause / resume | **no-op** | use-active-session.ts:33-45 · session-hud.tsx:155,200 |
| Idle "Begin a session" | hidden by pin (answer 1); start flow belongs to fe-sessions #34 | envision.md:4-5 |

### C. Declared deferrals
| Deferral | Doc:line | Home | Home status | Verdict |
|---|---|---|---|---|
| "F-HUD-1 = the ① `findActiveSession` read (MOD-sessions first-consumer)" | fe-session-hud/delivery/findings.md:6-15 · slice-map.md:43-44 | MOD-sessions | archived (closed); method never built; no issue | **ORPHAN** |
| "The shared focus-runtime client store → the first live timer driver" | slice-map.md:45 · findings.md:16-20 | "first live timer driver" (unnamed) | no issue | **ORPHAN** |
| "Live `ActiveSessionRead`/port binding → data plane (UI-3/M1.1+)" | slice-map.md:43 | UI-3/M1.1+ | phantom (the process.md §3 "UI-3/M1.1+" case) | (folded into F-HUD-1) |
| Session start flow → `fe-sessions` #34 | slice-map.md:46 | fe-sessions LIF-198 | planned (open, blocked-by fe-session-hud) | HOMED |
| Focus Mode → its own INTENDED surface | slice-map.md:46-47 | pomodoro/identity.md INTENDED | no issue; not a stub of this unit | BORROWED (informational) |
| ① interval-start persistence amendment, "NOTED, not assumed" | findings.md:21-26 | future decision | — | not debt |

### D. Envision conformance (13 ECs)
| EC | Type | Assertion | Status | Evidence |
|---|---|---|---|---|
| EC-1 | structural | persistent hard-right `hudSlot` on every route | ✅ | routes.tsx:34-36 |
| EC-2 | structural | idle/running/paused (5 forms); no phantom session | ✅ | session-hud.tsx (5 forms); idle hidden in prod per pinned answer 1 (envision.md:4-5) |
| EC-3 | structural | ring + tabular time + eyebrow + title; one link | ✅ | session-hud.tsx:147,163,169 |
| EC-3b | structural | countdown only for timed focus; count-up otherwise | ✅ | use-hud-clock.ts:10-26 |
| EC-3c | structural | zero-cross holds 00:00 + DONE; paused stays frozen | ✅ | use-hud-clock.ts:10-12,25-26 |
| EC-3d | structural | phase eyebrow (focus/break) | ✅ | session-hud/types.ts · session-hud.tsx |
| EC-4 | structural | paused = muted tokens + PAUSED + resume | ✅ | session-hud.tsx:200 |
| EC-5 | structural | one ghost control ≥768; the HUD never writes | ✅ | session-hud.tsx:155 · port no-op (A) |
| EC-6 | structural | ≤375 ring + time only, co-fit | ✅ | session-hud.tsx:32,155; VG PASS (archive/fe-session-hud.md:38,44) |
| EC-7 | structural | M1 = stub hook (honest-empty + `?sample`) | ✅ (pinned) | The pin itself makes this a stub state. Under ELC it is the debt (F-HUD-1) |
| EC-8 | structural | link aria-label; digits not aria-live; polite change announcements | ✅ | session-hud.tsx:163,209 |
| EC-9 | feel | alive but calm, reduced motion | ⏳ | live only (unreachable in prod until data is live) |
| EC-10 | feel | AA on dark/warm-dark | ⏳ | measured at VG (0/108 fails); still feel-typed |

**fe-session-hud — ELC: STUB · legs S3/P0/L0 · ORPHANs 2 · EC ✅11/❌0/⏳2/?0 · Debt: register `sessions`, build ① `findActiveSession`, build the ② focus-runtime store, and bind pause/resume. In prod the HUD renders nothing.**

---

## fe-session-runtime (#23, LIF-218, PR #143, archived)
*Has no `envision.md` of its own. It inherits fe-codec-flow-session EC-1…11 as ratified (interpretation.md:90-93; slice-map.md:11-12).*

### A. Data legs
| Leg | File:line | Status | Evidence |
|---|---|---|---|
| `useFlowSession(id)` session + attachments + effects | apps/web/src/flow/use-flow-session.ts:70-84 | STUB | `source:null, state:'empty'` + `?sample`. Needs `sessions.getSession` + `resolveTargets`, plus an `applied_effects` read. [UNKNOWN which method: none on SessionsService (service.ts:120-174); the header sketch says "+ applied_effects"] |
| Mark done → `transition(id,'complete')` | use-flow-session.ts:34-39 · adapter.ts:115 | STUB | no-op port. Needs `sessions.transitionSession` / `completeSession` |
| Attach | session-runtime-surface.tsx:77-78 · adapter.ts:117-120 | STUB | `attachTarget: () => undefined`, so attach is silently skipped. Needs `sessions.attach` + a `deliverable_note` target |
| Require proof | session-runtime-surface.tsx:79 | STUB | `onProof: () => {}` |

### B. Interactions
| Interaction | Wired? | File:line |
|---|---|---|
| Mark done | **no-op** | adapter.ts:115 → noopPort |
| Attach doc/photo/audio | **no-op** (button renders, press skipped) | session-runtime-surface.tsx:78 · flow-session-view.tsx:179 |
| Require proof | **no-op** | session-runtime-surface.tsx:79 |
| Open `/sessions/$id` | yes (always "No session open" in prod) | routes.tsx:91-95 · surface:63-71 |

### C. Declared deferrals
| Deferral | Doc:line | Home | Home status | Verdict |
|---|---|---|---|---|
| "the data leg is DEFERRED … live swap zero-signature-change". This unit **was** the named first consumer (R3) and re-deferred | fe-session-runtime/delivery/slice-map.md:30,37-44 · seam-contract.md:43 | repo-wide data-leg deferral (BR-6) | data plane landed; `sessions` not registered; no issue | **ORPHAN** |
| attachTarget / onProof: "the proof-capture flow is a driving module's" | sessions/PLAN-2026-10-15-s2-runtime-page.md:26-28,63 | driving modules | fe-sessions LIF-198 / fe-routines LIF-197 (planned) | BORROWED |
| Multi-stage per-module assembly (O7) | slice-map.md:86 | each module's ② track | open fe-* tasks | BORROWED |
| Per-module effect handlers + scheduler (#46/MOD-*) | slice-map.md:44 · seam-contract.md:40 | #46 / MOD-* | #46 = foundation/notifications delivery engine (notifications/types.ts:29); MOD-* ① tracks | BORROWED |

### D. Envision conformance (inherited fe-codec-flow-session EC-1…11)
| EC | Type | Assertion | Status | Evidence |
|---|---|---|---|---|
| EC-1 | structural | staged progression; single-stage default | ✅ | flow-source.ts (single stage); VG PASS (archive/fe-session-runtime.md:20) |
| EC-2 | structural | deliverable + description + attach + mark-done/proof | ✅ (UI) | flow-session-view.tsx:169-179 (handlers always passed). **All three are no-ops** (B) |
| EC-3 | structural | done proof / upcoming faded / dot states | ✅ | flow-session-view.tsx:146; VG |
| EC-4 | structural | effect log; empty = teaching | ✅ | session-runtime-surface.tsx:81-89 |
| EC-5 | structural | title hero + HonestProgress + SyncStatus + ⋯ | ✅ | CODEC shell; VG PASS |
| EC-6 | structural | per-stage independent states | ✅ | CODEC shell; surface:44-72 page-level ladder |
| EC-7 | structural | 375→1440, no overflow | ✅ | VG PASS 3×2×3 (archive:20) |
| EC-8 | structural | serif title, direct tokens, preset accent flips | ✅ | VG PASS |
| EC-9 | structural | single stage reads sanely | ✅ | use-flow-session.ts:56-63 (sample) · VG |
| EC-10 | feel | stage advance feels immediate | ⏳ | unverifiable: mark-done is a no-op (PLAN-s2:87, "live-deferred") |
| EC-11 | structural | semantic type scale | ✅ | VG PASS |

**fe-session-runtime — ELC: STUB · legs S4/P0/L0 · ORPHANs 1 · EC ✅10/❌0/⏳1/?0 · Debt: register `sessions`, flip `useFlowSession`, resolve the applied-effects read, and wire mark-done/attach/proof. Shares the `sessions` registration with fe-session-hud.**

---

## ORPHAN list (17)
1. fe-settings: preferences hydrate + persist (seam-contract.md:19-23; decisions.md:9). The home seam landed and nobody carried it.
2. fe-settings: module show/hide + rename never consumed by the dock/nav (undeclared).
3. fe-settings: reduce-motion pref has no motion consumer (preferences-store.ts:18-19).
4. fe-settings: locale prefs (date/time/week-start) have no consumer (undeclared).
5. fe-settings: quiet-hours start/end inputs, "a follow-up" (settings/CLAUDE.md:38-39).
6. fe-notifications: live `list`/`unreadCounts` + lifecycle writes (interpretation.md:57-58; seam-contract.md:54-55).
7. fe-notifications: Constellation drill-down, "deferred with the data plane" (notifications/CLAUDE.md:34-36).
8. fe-notifications: NOT-25 live subject lookup (attention-model.ts:120-127).
9. fe-onboarding: module-enablement commit → "M1.1" (slice-map.md:85).
10. fe-onboarding: `EmptyState.guidedSetup` slot consumption by module surfaces (PLAN-s4:41-42).
11. fe-gamification: all hooks stubbed, "first composition root" (slice-map.md:11-13).
12. fe-gamification: F-S5-1, the ① `listConsequences` read (slice-map.md:66); mod-gamification is closed.
13. fe-gamification: persona read homed to fe-settings, which shipped no persona control (CLAUDE.md:18-19).
14. fe-gamification: the `feature_gamification` flag source "M1.1" (feature-flags.ts:4-7) leaves the surface unreachable from the dock/⌘K.
15. fe-session-hud: F-HUD-1, ① `findActiveSession` (findings.md:6-15); MOD-sessions is closed.
16. fe-session-hud: the ② shared focus-runtime client store, homed to "the first live timer driver" (slice-map.md:45).
17. fe-session-runtime: the live `useFlowSession` leg, re-deferred by the unit that was itself the named first consumer (slice-map.md:30,37-44).

## EC divergence list (7 ❌)
- **fe-settings EC-4**: "All 7 controls present + wired". Show/hide, rename, Feature Atlas, Sync-log and reduce-motion have no effect outside the pane, and the preset list lacks `game`.
- **fe-settings EC-7**: "loading skeleton · read-error → defaults read-only … · optimistic + 'Saved on this device' + revert-on-error". There is no loading branch, no defaults on error, and no saved/revert path.
- **fe-notifications EC-4**: "Constellation … the NeuralGraph … tap an area → its alerts". There is no drill-down. The CSS/SVG substitution was never re-pinned.
- **fe-notifications EC-6**: "NOT-25 dangling subject → quiet 'no longer available' in every lens … never a dead link". Detection is sample-flag-only, and Constellation shows no per-alert row.
- **fe-onboarding EC-1**: "reachable opt-in from ≥2 paths: (a) invitation, (b) the `EmptyState.guidedSetup` slot". Path (b) has 0 consumers.
- **fe-gamification EC-6**: "ALL achievements by category × tier … paginated". Not paginated.
- **fe-gamification EC-7**: "ALL rules + enable/disable/delete; paginated". Not paginated.

## Cross-unit notes
- **Shared registration.** fe-session-hud and fe-session-runtime both need `sessions`. fe-notifications needs `sessions` + the #46 delivery engine (+ `preferences` optionally). fe-gamification's persona read and fe-onboarding's commits both need `preferences`. Suggested G2 order: **preferences → sessions → gamification → notifications** (the dep chain in notifications/types.ts:26-36).
- **fe-settings ← fe-gamification.** GM-16 says `game` is "applied via the Preferences/Onboarding theme picker" (fe-gamification/envision.md:37). The Settings picker omits it (appearance-pane.tsx:16-20); only onboarding offers it. The fix belongs in fe-settings.
- **fe-settings ← fe-gamification.** The D-REG-2 persona/`motivation_style` setter was assigned to fe-settings (fe-gamification.md:24), but Settings has no such control.
- **Shell (fe-shell / UI-4).** `isFeatureEnabled` is still the M1.0 fail-closed stub (shell/feature-flags.ts:9-12). The only flagged module (gamification) cannot be reached except by typing its URL. The real flag store also blocks the dock half of fe-onboarding's module picker and fe-settings' show/hide.
- **CODEC (fe-codec-flow-session).** `bindFlowIntents` silently drops attach when `attachTarget` returns undefined, while the button still renders (adapter.ts:117-120; flow-session-view.tsx:179). This is a dead affordance at any consumer without a target. Fix it in the CODEC: render-when-target, or report the miss honestly.
- **Tracker drift.** `.claude/tasks/fe-gamification.md:2` still says "in_review / PR #140 open", but #140 is merged (`8c1070d`).
