# MVP Path — from today's state to a usable OS

> **Last updated:** 2026-10-12
> **Purpose:** the single view of *what is built*, *what each remaining issue makes usable*, and *the
> minimal dependency-closed path to a daily-usable single-device OS*. Derived from the live Linear
> dependency graph (initiative `vida-platform`) reconciled against the merged-PR oracle.
>
> **🟢 MILESTONE (2026-10-12): MVP-0 is build-complete** — every planned MVP-0 *issue* is merged.
> `fe-notes-and-pages` (LIF-191) merged (PRs #128/#129), joining the last of its CODEC-canvas prereqs.
> The first feature surface — the notes/journal **screens, patterns and UI wiring** — now exists in the
> app. ⚠️ **It is not yet usable for real data:** the local data-plane is still a documented stub
> (`apps/web/src/db/client.ts` — the worker-side Drizzle `values`/`batch`/`exec` seam **throws**; no
> `createNotesService`/`createJournalsService` composition root is wired in `apps/web`), so you can open
> and navigate the screens but **cannot yet persist a note or journal entry.** Making CRUD live is the
> remaining work (the data-plane seam, homed at UI-3 / M1.1+ — see § 4 · MVP-0 below).
> The frontend "usable layer" (M1.2.2) has opened at 1/6. Also shipped since the last refresh:
> `fe-onboarding` guided setup (LIF-216) and the `fe-notifications` ② surface (LIF-192).
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

Two large, well-built halves — now **joined at the first seam** (notes/journal); the rest still awaits wiring:

- **Backend engine (`@vida/core`) — ~complete.** Full XS foundation (M1.1.1) + 15 feature-module
  services (M1.1.2): finance, gamification, habits, knowledge, books, learning-education, projects,
  notifications, purposes, relationships, notes, prefs, journals, sessions, check-ins. Tested, **headless**.
- **Design system (`@vida/ui` CODEC) — ~complete.** theme, patterns, viewmodes, collection, dashboard,
  entity-facet, flow-session, seams, home, canvas-graph, canvas-reader, **canvas-board**, **canvas-editor**,
  **shell** + primitives/controls refinement. Lives in Storybook, **data-less**.
- **App plumbing (`apps/web`).** Live local SQLite (worker + wa-sqlite + OPFS), guided onboarding (first-run
  + opt-in module/theme setup), app-shell chrome + shell-scope, ⌘K.
- **🟢 First wired feature surface — `fe-notes-and-pages` (LIF-191).** The notes collection, note pages,
  backlinks, `[[` picker, `/summary` block, metadata/attachments, search UI and block menu are all built
  and merged. This is the surface that **invents the reusable `useCollection` live-hook pattern** every
  later `fe-*` surface copies — so the hardest *UI* wiring is now done once. (⚠️ The live DB data-plane is
  **not** wired yet: the worker-side Drizzle `values`/`batch`/`exec` seam still throws and there is no
  service composition root in `apps/web`, so notes/journal CRUD does not persist. The UI hooks are
  swap-ready; the worker-side seam is a real unbuilt unit — homed UI-3 / M1.1+.)

> **The gap (narrowed):** MVP-0 is joined. What remains for "daily driver" is the wired `fe-*` module
> surfaces (M1.2.2 / M1.2.3) and M1.4 integration — and most of those now *copy* the notes pattern rather
> than invent it. The hard architectural work is done; what remains is mostly repetition.

---

## 3. Milestone census (true, archived-inclusive — 2026-10-12)

| Milestone | Done / Total | State |
|---|---|---|
| M1.0 — Boot & Connective Base | 31/31 | ✅ closed |
| M1.1.1 — Hub & Foundation · Backend | 11/11 | ✅ closed |
| M1.1.2 — Feature Modules · Backend | 15/17 | 🟡 2 left (`mod-tasks`, `mod-routines`) |
| M1.1.3 — Depth & Recovered · Backend | 0/5 | 🔴 not started |
| M1.2.1 — Hub & Foundation · Frontend | 20/27 | 🟡 ~7 backlog |
| M1.2.2 — Feature Modules · Frontend | 1/6 | 🟡 **opened** ← the usable layer |
| M1.2.3 — Depth & Recovered · Frontend | 0/10 | 🔴 not started |
| M1.4 — Internal-Integration Hardening | 0/8 | 🔴 not started |
| M2.0 / M3.0 / M4.0 | 0/8 · 0/6 · 0/9 | 🔴 post-MVP |

> Cancelled issues in M1 are reshape artifacts (renamed/folded during the backend-replan, ADR-021), not
> lost work. The orphan-create duplicates (LIF-223/224/225/226) were retired → **Canceled** in the
> 2026-10-12 reconcile (they were logged as canceled earlier but the write never stuck — see Maintenance).

---

## 4. The MVP tiers — status · usability · difficulty

Difficulty: 🟢 Low · 🟡 Medium · 🟠 High · 🔴 Very High. Difficulty tracks **whether the pattern exists
yet**, not raw size: the first wired surface *invents* the `useCollection` live-hook pattern (hard);
every surface after it *copies* it (easy).

### ✅ MVP-0 — "notes & daily journal on my device" — **BUILD-COMPLETE (2026-10-12)** · ⚠️ data-plane stubbed (not yet live)

| Issue | Status | What you can DO | Difficulty |
|---|---|---|---|
| fe-codec-canvas-editor (LIF-234) | ✅ done | The writing surface — block editor as a CODEC canvas (PR #123) | 🟠 High |
| fe-codec-canvas-graph (LIF-205) | ✅ done | Backlink / neural view | — |
| fe-shell (LIF-199) | ✅ done | Real navigation + spaces bar | — |
| fe-home (LIF-187) | ✅ done | Daily journal dashboard | — |
| fe-shell-scope (LIF-219) | ✅ done | Scope the shell to a Space/context (PR #125) | 🟢 Low |
| **fe-notes-and-pages (LIF-191)** | ✅ **done (PRs #128/#129)** | **Create, edit, read & link your own notes** — first real feature; built the reusable `useCollection` hook | 🟠 High (pattern-maker) |

→ **Landed (build): every MVP-0 issue is merged — the screens, the `useCollection` pattern, and the UI
wiring all exist.** ⚠️ **Not yet landed (runtime): real journaling / note-taking does not work.** The data
plane is a documented stub: `apps/web/src/db/client.ts` throws on the Drizzle `values`/`batch`/`exec` path,
and no `createNotesService`/`createJournalsService` composition root is wired into `apps/web` (all data
hooks return empty by design — `use-notes-rows.ts`, `use-note-entity.ts`, `use-journal-summary.ts`). To
*preview* the populated layouts today, the routes accept a `?sample` dev param. Making it real = building
the worker-side Drizzle-proxy seam + the composition root (homed UI-3 / M1.1+). This is a genuine build,
**not** a one-line hook swap: the UI hooks are swap-ready, but the worker-side seam is unimplemented.

### 🟡 MVP-1 — "life-management daily driver"

| Issue | Status | What you can DO | Difficulty |
|---|---|---|---|
| fe-habits (LIF-182) | · ready | Track habits, streaks & completion (backend ✅) | 🟢 Low |
| fe-check-ins (LIF-179) | · ready | Daily morning/evening check-ins, mood/energy (backend ✅) | 🟢 Low |
| fe-gamification (LIF-181) | · ready | XP, levels, achievements (backend ✅) | 🟢 Low |
| fe-projects (LIF-194) | · ready | Projects, milestones, progress (backend ✅) | 🟡 Medium |
| fe-calendar (LIF-203) | ✅ done (canvas-board done) | Month/week calendar of your data | 🟡 Medium |
| fe-purposes-and-goals (LIF-195) | 🟢 ready (canvas-board done) | Life purposes, goals, metrics (backend ✅) | 🟡 Medium |
| **mod-tasks (LIF-201 backend)** | · ready | *(backend)* the tasks engine — aggregates tasks across modules | 🟠 High (aggregator hub) |
| fe-tasks | · (⛔ mod-tasks) | Create/track tasks & sub-tasks | 🟡 Medium |

→ **Lands: tasks + habits + check-ins + projects + calendar + purposes + journaling = the core daily loop.**
After the notes pattern exists, most of these are 🟢 — the only 🟠 is the `mod-tasks` backend.

### 🟠 MVP-2 — "full M1, integrated"

| Issue | Status | What you can DO | Difficulty |
|---|---|---|---|
| mod-routines | · ready | *(backend)* routines engine | 🟡 Medium |
| mod-health-core / -nutrition / -training | · ready | *(backend)* health tracking | 🟡 Medium ×3 |
| mod-skills | · ready | *(backend)* skills tracking | 🟡 Medium |
| mod-languages | · ready | *(backend)* language learning (vocab, sessions) | 🟠 High (many sub-entities) |
| fe-finance / books / knowledge / relationships / learning-education / sessions / routines / health / skills | · | Wired screens for the rest (backends mostly ✅) | 🟢 Low each (copy pattern) |
| hard-1-summary-registry | · | **The real Home** — daily dashboard pulling from *every* module | 🟠 High |
| hard-2-rollups | · | Auto-rolled progress/measurement across modules | 🟡 Medium |
| hard-3-graph-backlinks | · | Full neural graph + bidirectional backlinks across everything | 🟡 Medium |
| db-8-fts5-search | · | **Search everything** (⌘K full-text) | 🟡 Medium |
| db-10-seed / db-11-reconcile / mig-1-v1-retire | · | Seed data, schema reconcile, retire v1 (plumbing) | 🟢 Low each |
| hard-4-polish | · | Final M1 polish — closes M1 | 🟡 Medium |

→ **Lands: every module live and cross-linked — the complete single-device OS.**

### 🔴 Beyond MVP (not needed to use it solo)

| Milestone | What it gives you | Difficulty |
|---|---|---|
| M2 (8) | External feeds — bank import, calendar, AI, health wearables, fiscal rule-packs | 🟠 High |
| M3 (6) | **Zero-knowledge encryption + vault unlock** — the privacy promise; release gate before any 2nd person (`ar-3-crypto-vault-keymgmt` is the keystone) | 🔴 Very High |
| M4 (9) | **Sync across devices** + desktop (Tauri) + mobile (Expo) + self-host + ZK-cloud | 🔴 Very High |

---

## 5. Dependency notes — what unblocks what

The remaining frontend work is a **funnel**: dozens of surfaces each depend on a few shared CODEC canvas
renderers, then every surface drains into `hard-4-polish` (the "M1 frontend complete" gate, which unblocks
desktop/mobile).

- `fe-codec-canvas-editor` → `fe-notes-and-pages`, `fe-home`
- `fe-codec-canvas-graph` (✅) → `fe-notes-and-pages`, `fe-knowledge`, `fe-finance`, `fe-relationships`, `fe-skills`, `fe-feature-atlas`
- `fe-codec-canvas-board` (✅) → `fe-purposes-and-goals`, `fe-calendar`
- `fe-shell` (✅) → `fe-shell-scope`, `fe-session-hud`
- `mod-tasks` → `fe-tasks`, `mod-routines`, `mod-projects` + M1.4 (**24 transitive downstream — highest-leverage open issue**)
- `hard-1`/`db-10`/`db-11`/`mig-1` ⛔ the 7 remaining backends (`mod-tasks`, `mod-routines`, `mod-health-*`, `mod-skills`)

**Critical path to MVP-0:** ✅ **cleared** — all CODEC-canvas prereqs + `fe-notes-and-pages` are merged.
**Next critical path (MVP-1):** the funnel is now the per-module frontends — most are 🟢 (they copy the
notes `useCollection` pattern); the one 🟠 remaining is the `mod-tasks` backend (24 transitive downstream,
the highest-leverage open issue), which unblocks `fe-tasks`, `mod-routines`, and the M1.4 hardening tier.

---

## 6. Deliberately deferred (ADR-017)

M1 is the **real product**, built features-first with the three hardest cross-cutting layers **off but
seam-ready**:

- **Encryption OFF → M3.** SQLCipher runs empty-passphrase; `encryptRow`/`decryptRow` is a pass-through
  seam; the `[E]` field set is empty.
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
