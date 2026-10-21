# MVP Path — from today's state to a usable OS

> **Last updated:** 2026-10-21
> **Purpose:** the single view of *what is built*, *what each remaining issue makes usable*, and *the
> minimal dependency-closed path to a daily-usable single-device OS*. Derived from the live Linear
> dependency graph (initiative `vida-platform`) reconciled against the merged-PR oracle.
>
> **🟡 STATE (2026-10-21): the data plane is LIVE, but only notes + journal are wired to it.**
> `data-plane-wiring` shipped (PR #148): the worker-side Drizzle seam works, `apps/web/src/db/composition-root.ts`
> builds the services after the DB-ready gate, and `initVault()` runs at startup. Three follow-up PRs made the
> first entity usable on real OPFS: **notes list / open / create / write-body** (#149 `fe-notes-golive`, #150
> `notes-entity-usability`) and **today's journal entry on Home** (#151 `home-journal-go-live`). Only `notes` +
> `journals` are registered in `Services` today.
> ⚠️ **Everything else that shipped is still a stub or only partly wired.** The G1 debt census
> ([debt-census.md](../specs/foundation/golive-replan/debt-census.md) §1) audited the 24 shipped `fe-*` units
> against the new **Entity Live Close**: of the **10 feature surfaces, 0 fully meet it** (4 PARTIAL, 6 STUB); the
> 14 CODEC units are N/A-by-role (they go live through their consumers). The repair is homed as milestone
> **M1.2.4** (7 debt units, not yet minted in Linear). See [§ 2.5](#25-the-entity-live-close-2026-10-21).
>
> **How to refresh (important):** Linear archives completed issues, and its default `issues` query
> **excludes archived** — so `tracker_sync.py --plan`/`--next` are *forward-looking* (what's left), never a
> completion census. For a true "how far along" count you MUST query with `includeArchived: true`. The
> oracle for "done" is a **merged PR** (TASKS.md ✅ Completed), which outranks Linear status, which
> outranks the local `# Status:` line. See [§ Maintenance](#maintenance).

---

## 1. The shape — 4 projects, one hard-ordered chain

```
M1 — Whole Manual OS .............. local-only, no-sync, no-auth usable single-device app
M2 — External Integrations ........ bank/calendar/AI/health feeds (against the encryption seam)
M3 — Whole-OS Encryption Pass ..... zero-knowledge encryption + vault unlock   ← RELEASE GATE
M4 — Venues / Multi-Device ........ sync engine + server + desktop + mobile + self-host + ZK-cloud
```

Hard sequencing (ADR-017): **M1 → M2 → M3 (release gate) → M4.** Nothing reaches a second person until
M3; nothing is multi-device until M4. The MVP described here lives entirely in **M1** and needs none of
M2–M4.

---

## 2. What is built today (and the honest caveat)

Two large, well-built halves, now **joined by a working data plane**, but wired together for only one entity:

- **Backend engine (`@vida/core`) — ~complete.** Full XS foundation (M1.1.1) + 16 of 17 feature-module
  services (M1.1.2), including `mod-tasks` (PR #145). Only `mod-routines` remains (paused at S3 of 8 on its
  branch). Tested, and **mostly headless**: only `notes` and `journals` are constructed in the app.
- **Design system (`@vida/ui` CODEC) — complete for Wave 0.** theme, patterns, viewmodes, collection, dashboard,
  entity-facet, canvas-editor/graph/reader/board, flow-session, seams, and primitives/controls refinement.
- **App plumbing (`apps/web`) — live.** Worker + wa-sqlite + OPFS; **the Drizzle seam and the service
  composition root work** (PR #148), with `initVault()` at startup. Shell, shell-scope, ⌘K and guided
  onboarding are mounted.
- **🟢 Live on real data:** notes list / open / create / body-write (#149/#150) and today's journal entry on
  Home (#151). Verified live on real OPFS in Brave.
- **🟠 Shipped but not live:** every other surface. Per the G1 census, the **10 shipped feature surfaces** are:
  **PARTIAL** (4): fe-notes-and-pages, fe-home, fe-onboarding, fe-shell · **STUB** (6): fe-settings,
  fe-notifications, fe-gamification, fe-session-hud, fe-session-runtime, fe-shell-scope. Four of them also need
  `@vida/core` reads that **don't exist yet** (`findActiveSession`, a gamification ledger read, `listSpaces`,
  an applied-effects read; debt-census §2.3).

> **The gap (re-measured):** the earlier assumption was "the hard part is done; what remains is repetition."
> It was half right. The *pattern* exists, but units were marked Done while **"done" ≠ "usable"**. Each
> shipped surface still owes its live wiring. M1.2.4 pays that debt **before** the next surfaces are built, and every
> new surface now closes live (§ 2.5), so the debt stops growing.

---

## 2.5 The Entity Live Close (2026-10-21)

**What "done" means now.** An entity is Done for M1 only when it passes the **Entity Live Close (ELC-1…9)**:
the service is merged and registered in the composition root, the hooks are live, the interactions are wired,
the states are honest, the Visual Gate's live leg passes **in the running app on real OPFS**, the docs are current, and
every Envision checkpoint is re-verified live. Definition: [process.md §2](../specs/foundation/golive-replan/process.md).
The backend ① and frontend ② tracks no longer close separately: the **entity** closes once, as one unit.

**"Go-live" is retired as a unit type** (process.md §3). The ad-hoc `module-go-lives` queue is superseded.
New surfaces close live under the ELC, and the shipped-surface debt goes into one milestone:

**M1.2.4 — Live Close: shipped-surface debt** (7 units, profile *Add Frontend Component → `entity-rescope`*;
plan: [debt-plan.md](../specs/foundation/golive-replan/debt-plan.md), order:
[g3-order.md](../specs/foundation/golive-replan/g3-order.md)). Every unit `← data-plane-wiring ✅ (#148)`.

| Wave | Units | Why here |
|---|---|---|
| **L1** (parallel) | `preferences-rescope` (the hub; absorbs onboarding writes) · `notes-rescope` (incl. the #31/ui-3 root + templates/views backend slices) · `sessions-rescope` (+ 2 backend reads) | no debt blockers |
| **L2** (parallel) | `gamification-rescope` (+ ledger read) · `shell-rescope` (X-CUT: dock, placement, #69 export/search orphans) · `notifications-rescope` (constructs the built #46 engine) · `journals-rescope` (slices before the dashboard) | ← preferences · notifications ← sessions · journals ← notes + preferences |
| **late** | `journals-rescope·dashboard` **sub-issue**: EC-4 personalized grid + 11 widget bodies + the **journals ENTITY CLOSE** | ← **HARD-1** (M1.4), so it waits on the summary providers |

Existing issues absorb the rest of the debt instead of new ones being minted: fe-spaces-page (+ `listSpaces`), HARD-1, HARD-3,
DB-8, fe-tasks / fe-projects, fe-books, fe-purposes-and-goals (debt-plan §2). `fe-sessions` keeps the sessions
ENTITY CLOSE. **HARD-4 gains `← every M1.2.4 unit`**, so M1 cannot close over the debt (a G4 edge, not yet written).
The longest debt chain is **2 units** after the data plane (g3-order §3).

---

## 3. Milestone census (true, archived-inclusive — 2026-10-21)

Counts are Linear `state.type == completed` over non-canceled issues, cross-checked against merged PRs.

| Milestone | Done / Total | State |
|---|---|---|
| M1.0 — Boot & Connective Base | 31/31 | ✅ closed |
| M1.1.1 — Hub & Foundation · Backend | 11/11 | ✅ closed (+1 canceled: `mod-spaces` folded into XS) |
| M1.1.2 — Feature Modules · Backend | 16/17 | 🟡 1 left: `mod-routines` (paused, S3/8 on branch) |
| M1.1.3 — Depth & Recovered · Backend | 0/5 (+ `data-plane-wiring` ✅ #148) | 🔴 health×3 · skills · languages not started. `data-plane-wiring` (LIF-237) belongs here per its header but sits outside the M1 project in Linear (drift, see Maintenance) |
| M1.2.1 — Hub & Foundation · Frontend | 23/27 | 🟡 left: fe-calendar (**in flight**, S4/7) · fe-spaces-page · fe-sync-log · fe-feature-atlas |
| M1.2.2 — Feature Modules · Frontend | 2/6 | 🟡 notes · gamification shipped; tasks · habits · projects · check-ins left |
| M1.2.3 — Depth & Recovered · Frontend | 0/10 | 🔴 not started (schema-gated Wave 2b) |
| **M1.2.4 — Live Close: shipped-surface debt** | **0/7 (+1 dashboard sub-issue)** | ⚪ **planned, not minted**: homed at G2/G3; created in Linear at G4 |
| M1.4 — Internal-Integration Hardening | 0/8 | 🔴 not started |
| M2.0 / M3.0 / M4.0 | 0/8 · 0/6 · 0/9 | 🔴 post-MVP |

> **Frontend tier = the 42-unit surface order** (frontend-replan G5/G6,
> [g6-reshape-runbook.md §2](../specs/foundation/frontend-replan/g6-reshape-runbook.md)). Wave 0 CODEC #1–13 +
> Wave 1 shell/cross-cutting #14–26 → M1.2.1 · Wave 2a #27–32 → M1.2.2 · Wave 2b #33–42 → M1.2.3. Two units have
> no Linear issue by design (#12 `fe-codec-system` was ratified by consumption; #17 ⌘K shipped by reusing UI-4/UX-2), and
> M1.2.1 also carries 3 non-surface issues (primitives/controls refinement, `fix-entity-view-header`), so 27 + 6 +
> 10 issues ≠ 42. **By the 42-unit order: 24 built (#1–18, #23–27, #32; #12 and #17 without an issue) · 1 in flight (#19)
> · 17 not started.** *Built* means merged, not live: see § 2.5.
>
> Cancelled issues in M1 are reshape artifacts (renamed, folded or retired during the backend-replan / frontend-replan
> reshapes, ADR-021), not lost work. The orphan-create duplicates LIF-223/224/225/226 stay Canceled.

---

## 4. The MVP tiers — status · live state · difficulty

Difficulty: 🟢 Low · 🟡 Medium · 🟠 High · 🔴 Very High. **Live** column (from debt-census §1): **LIVE** = meets
the ELC · **PARTIAL** = some legs live · **STUB** = renders, persists nothing · *N/A* = CODEC unit, goes live through its consumer.

### 🟡 MVP-0 — "notes & daily journal on my device" — **built; partly live**

| Issue | Status | Live | What you can DO | Difficulty |
|---|---|---|---|---|
| fe-codec-canvas-editor (LIF-234) | ✅ merged (#123) | N/A | The writing surface (block editor as a CODEC canvas) | 🟠 High |
| fe-codec-canvas-graph (LIF-205) | ✅ merged (#112) | N/A | Backlink / neural view (live backlinks → HARD-3) | — |
| fe-shell (LIF-199) | ✅ merged (#118, #142) | **PARTIAL** | Navigation + panels; placement never persists, Modules panel empty | — |
| fe-shell-scope (LIF-219) | ✅ merged (#125) | **STUB** | Space/context scope selector; no `listSpaces` read yet | 🟢 Low |
| fe-home (LIF-187) | ✅ merged (#121) + #151 | **PARTIAL** | **Today's journal entry persists**; inline blocks / "/" hint and the personalized dashboard do not | — |
| data-plane-wiring (LIF-237) | ✅ merged (#148) | — | The worker Drizzle seam + composition root + `initVault()` (the shared root) | 🟠 High |
| **fe-notes-and-pages (LIF-191)** | ✅ merged (#128/#129) + #149/#150 | **PARTIAL** | **List, open, create and write notes for real.** Metadata, attachments, `[[` picker, templates, view-config, rename/delete are still stub or DEV-only | 🟠 High (pattern-maker) |

→ **Lands today:** writing notes and today's journal entry on real OPFS. **Still owed** (M1.2.4 `notes-rescope` +
`journals-rescope`): the rest of the notes entity, the inline-block journal, and the dashboard (← HARD-1).

### Shipped system surfaces (M1.2.1 Wave 1 / M1.2.2) — **built; not live**

| Issue | Status | Live | Debt home (M1.2.4) |
|---|---|---|---|
| fe-onboarding (LIF-216) | ✅ merged (#130) | **PARTIAL** | preferences-rescope (selections persist, `EmptyState` consumers) |
| fe-settings (LIF-193) | ✅ merged (#137) | **STUB** | preferences-rescope (nothing persists yet) |
| fe-notifications (LIF-192) | ✅ merged (#132) | **STUB** | notifications-rescope (construct the built #46 engine) |
| fe-gamification (LIF-181) | ✅ merged (#140) | **STUB** | gamification-rescope (+ `listConsequences` read) |
| fe-session-hud (LIF-217) | ✅ merged (#144) | **STUB** | sessions-rescope (+ `findActiveSession`) |
| fe-session-runtime (LIF-218) | ✅ merged (#143) | **STUB** | sessions-rescope (mark-done / attach / proof are no-ops) |

### 🟡 MVP-1 — "life-management daily driver"

| Issue | Status | What you can DO | Difficulty |
|---|---|---|---|
| **M1.2.4 debt units (7)** | · planned (L1 → L2) | Make every shipped surface above usable live | 🟡 Medium each |
| mod-tasks (LIF-142) | ✅ merged (#145) | *(backend)* the tasks engine — aggregates tasks across modules | 🟠 High (done) |
| fe-tasks (LIF-201) | · ready (all blockers Done) | Create/track tasks & sub-tasks; also owns the notes RIDE overviews (← notes-rescope) | 🟡 Medium |
| fe-habits (LIF-182) | · ready | Track habits, streaks & completion (backend ✅) | 🟢 Low |
| fe-check-ins (LIF-179) | · ready | Daily morning/evening check-ins, mood/energy (backend ✅) | 🟢 Low |
| fe-projects (LIF-194) | · ready | Projects, milestones, progress (backend ✅); also owns notes RIDE overviews | 🟡 Medium |
| fe-calendar (LIF-203) | 🔵 **in flight**: S1–S4 built on branch `fe-calendar` (unpushed; S4 `60dfde9`), S5–S7 left; S7 closes under the ELC | Month/week/year calendar of your data | 🟡 Medium |
| fe-purposes-and-goals (LIF-195) | · ready in Linear; ⛔ schema-gated (Wave 2b, M1.2.3, `purposes-values-contributions`) | Life purposes, goals, metrics; absorbs canvas-board EC-2 | 🟡 Medium |

→ **Lands: tasks + habits + check-ins + projects + calendar + purposes + journaling = the core daily loop.**
`mod-tasks` is no longer the bottleneck. Each new surface now closes **live** under the ELC, not just built.

### 🟠 MVP-2 — "full M1, integrated"

| Issue | Status | What you can DO | Difficulty |
|---|---|---|---|
| mod-routines (LIF-138) | ⏸ paused (S1–S3 of 8 on branch) | *(backend)* routines engine | 🟡 Medium |
| mod-health-core / -nutrition / -training | · ready | *(backend)* health tracking | 🟡 Medium ×3 |
| mod-skills | · ready | *(backend)* skills tracking | 🟡 Medium |
| mod-languages | · ready | *(backend)* language learning (vocab, sessions) | 🟠 High (many sub-entities) |
| fe-finance / books / knowledge / relationships / learning-education / sessions / routines / health / skills | · | Wired screens for the rest (Wave 2b, schema-gated) | 🟢–🟡 each (copy pattern + live close) |
| fe-spaces-page / fe-sync-log / fe-feature-atlas | · | Spaces page (+ `listSpaces`), sync log, feature atlas | 🟡 Medium |
| hard-1-summary-registry | · | **The real Home**: daily dashboard pulling from *every* module (→ journals-rescope·dashboard) | 🟠 High |
| hard-2-rollups | · | Auto-rolled progress/measurement across modules | 🟡 Medium |
| hard-3-graph-backlinks | · | Full neural graph + bidirectional backlinks (absorbs notes backlinks) | 🟡 Medium |
| db-8-fts5-search | · | **Search everything** (⌘K full-text) | 🟡 Medium |
| db-10-seed / db-11-reconcile / mig-1-v1-retire | · | Seed data, schema reconcile, retire v1 (plumbing) | 🟢 Low each |
| hard-4-polish | · | Final M1 polish — closes M1 (← every surface + every M1.2.4 unit) | 🟡 Medium |

→ **Lands: every module live and cross-linked — the complete single-device OS.**

### 🔴 Beyond MVP (not needed to use it solo)

| Milestone | What it gives you | Difficulty |
|---|---|---|
| M2 (8) | External feeds — bank import, calendar, AI, health wearables, fiscal rule-packs | 🟠 High |
| M3 (6) | **Zero-knowledge encryption + vault unlock** — the privacy promise; release gate before any 2nd person (`ar-3-crypto-vault-keymgmt` is the keystone) | 🔴 Very High |
| M4 (9) | **Sync across devices** + desktop (Tauri) + mobile (Expo) + self-host + ZK-cloud | 🔴 Very High |

---

## 5. Dependency notes — what unblocks what

The remaining work has two shapes: the **debt** (M1.2.4, short and wide) and the **funnel** (new surfaces →
`hard-4-polish`, the "M1 frontend complete" gate that unblocks desktop/mobile).

- `data-plane-wiring` ✅ → every M1.2.4 unit
- `preferences-rescope` → `gamification-rescope`, `shell-rescope`, `journals-rescope`, `note-open-behavior-preference` (soft → notifications, notes)
- `sessions-rescope` → `notifications-rescope`, `fe-sessions` (which holds the sessions ENTITY CLOSE)
- `notes-rescope` → `journals-rescope`, `fe-tasks`, `fe-projects`
- `hard-1-summary-registry` → `journals-rescope·dashboard`. HARD-1 is ⛔ by the **6** unbuilt backends (`mod-routines`, `mod-health-*` ×3, `mod-skills`, `mod-languages`)
- `fe-codec-canvas-graph` (✅) → `fe-notes-and-pages`, `fe-knowledge`, `fe-finance`, `fe-relationships`, `fe-skills`, `fe-feature-atlas`
- `fe-codec-canvas-board` (✅) → `fe-purposes-and-goals`, `fe-calendar`
- `mod-tasks` ✅ (#145) → `fe-tasks`, `mod-routines` (now unblocked) · `mod-routines` → `fe-routines`, HARD-1

**Critical path (debt):** `data-plane ✅ → preferences-rescope → {shell · gamification · journals}` and
`sessions-rescope → notifications-rescope`, at most 2 units deep (g3-order §3).
**Critical path (M1 close):** finish the 6 backends → HARD-1 → the journals dashboard, while the Wave 2a/2b
surfaces drain into HARD-4. **Parallel tracks keep running:** mod-routines and fe-calendar (S5–S7).

---

## 6. Deliberately deferred (ADR-017)

M1 is the **real product**, built features-first with the three hardest cross-cutting layers **off but
seam-ready**:

- **Encryption OFF → M3.** SQLCipher runs empty-passphrase; `encryptRow`/`decryptRow` is a pass-through
  seam; the `[E]` field set is empty. (`initVault()` now runs at startup, but it only loads libsodium
  (`await sodium.ready`). It takes no secret, so it is not the M3 vault.)
- **Sync OFF → M4.** `sync/{resolver,crdt,queue}.ts` stubbed; `_sync_*` columns written-never-flushed
  (`SyncNotActivated`).
- **Auth / SRP / vault-unlock OFF → M3/M4.** No server; onboarding's "vault" step is a confirmation, not
  a key creation.

The privacy thesis is *deferred, not tested up front* — the feature phase runs unencrypted and
single-device until the hardening pass.

---

## Maintenance

Refresh this doc when module status changes materially. To regenerate the census + dependency edges:

1. Query Linear **with `includeArchived: true`** for all projects in the `vida-platform` initiative
   (via `linear_client.py`, key in `~/dev-toolkit/.env`). Group by `projectMilestone`, count
   `state.type == 'completed'`.
2. Build the unblock graph from each issue's `relations` (type `blocks` → `relatedIssue`) and
   `inverseRelations`.
3. Reconcile status against the merged-PR oracle in `TASKS.md` (✅ Completed). A merged PR beats Linear
   status beats the local `# Status:` line.

Linear status reconciled 2026-10-10 — `fe-shell` (LIF-199), `fe-codec-canvas-board` (LIF-204),
`fe-codec-canvas-graph` (LIF-205) and `fe-codec-canvas-editor` (LIF-234) all pushed to **Done** via GraphQL
`issueUpdate`. If future drift appears, prefer surgical `issueUpdate` over `tracker_sync.py --sync` while
parallel sessions are in flight (see memory `tracker-sync-orphan-create-guard`).

**Reconcile 2026-10-12** (merged-PR oracle vs live Linear, `includeArchived:true`, all 80+ merged feature
branches swept). Of ~45 merged units only one was status-drifted: `fe-onboarding` (LIF-216) Backlog → **Done**
(merged PR #130). Four orphan-create duplicates — `fe-health` LIF-223, `fe-home` LIF-224, `fe-settings`
LIF-225, `fe-shell` LIF-226 — were **Canceled** with pointer comments to their canonicals (LIF-183/187/193/199);
a prior session had *logged* this cancel but the write never stuck, so re-verify cancellations against live
Linear, not the session log. Local `.tracker-map.json` also lagged *behind* Linear (205/207 stale) — drift
cuts both directions. Everything else (all MOD backends, XS foundation, CODEC units, ui/ux/ds) was already
correctly Done. `frontend-track` (LIF-202) stays **In Progress** — it's the campaign umbrella; per-module
`fe-*` tracks remain legitimately Backlog. Do not "fix" it.

**Reconcile 2026-10-21** (golive-replan G3; **read-only**, so nothing was written to Linear). Queried
182 issues across every `vida-platform` initiative project (`includeArchived:true`, paginated), grouped by
`projectMilestone`; swept 143 merged branches on `origin/main` (`3b0ecc8`, through PR #151) against issue
titles; read blocked-by relations for fe-tasks/habits/check-ins/projects/purposes/routines/sessions/spaces-page,
mod-routines, HARD-1 and HARD-4. Counts are in § 3. **Drift found (listed, not fixed; the fixes go in the G4 ledger):**
- `data-plane-wiring` **LIF-237 = Backlog**, but PR #148 is merged → should be Done. It is also mis-homed: it sits in
  the **General** project under an ad-hoc milestone ("M1 / M1.1.3 … DERIVED, not chosen"), not in M1 → M1.1.3.
- `notes-entity-usability` **LIF-239 = Backlog**, but PR #150 is merged → should be Done (no milestone; General project).
- `fe-notes-golive` (#149) and `home-journal-go-live` (#151) are merged with **no Linear issue at all**. They were
  out-of-structure go-lives (golive-replan `_index.md` F4); G4 decides whether to record or absorb them.
- `fe-calendar` **LIF-203 = Backlog**, while S1–S4 are built on an unpushed branch (local `# Status: in_progress`).
  No PR yet, so the oracle can't settle it; Linear is behind the work.
- `mod-routines` **LIF-138 = Backlog**, local status `paused` with S1–S3 on its branch; same shape as fe-calendar.
- Stale local `# Status:` lines: `data-plane-wiring.md` ("planning … nothing built") and `notes-entity-usability.md`
  ("PR pending"); `.tracker-map.json` still records LIF-237/239 as BACKLOG.
- `hard-4-polish` (LIF-115) blocked-by still lists the 4 canceled duplicates and has **no** M1.2.4 edges yet (G4 action).
- **No reverse drift:** every Linear-Done `fe-*`/`mod-*`/`xs-*` issue maps to a merged PR (the five without a
  same-named branch shipped via `worktree-*` branches: #75, #76, #78, #94/#95, #101).
- Earlier versions of this doc listed `mod-tasks` as LIF-201 (that id is `fe-tasks`; `mod-tasks` is LIF-142, Done via #145) and
  marked `fe-calendar` ✅. Both are corrected above.
