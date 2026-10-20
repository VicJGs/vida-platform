# Fix Unit — notes-dataplane-orphan-deferral

> **Type:** bug (triage diagnosis — planning/documentation drift) · **Status:** diagnosed — resolution PROPOSED, pending Approval (STRUCTURAL)
> **Created:** 2026-10-13 · **Profile:** Generic Coding Session (triage) · **Linear:** unfiled (remedy = mint the owning unit)
> **Classification:** 🔴 STRUCTURAL (planning layer)
> The STUB itself is correct M1 scaffolding. The defect is a MISSING OWNER + a phantom home — a planning drift, not a code bug. No fix applied here.

## 0. Source model
N/A — planning/documentation + runtime-wiring deferral; corrected via the roadmap/docs + a minted tracker unit.

## 1. Identity — defect, root cause, facets, files

**Defect.** Notes/journal CRUD cannot persist: the apps/web data plane is stubbed, and the deferral is homed to a unit that does not own the scope and is already closed — so no tracked unit owns building it.

**Root cause (one sentence).** Notes/journal CRUD can't persist because the data plane (worker-side Drizzle `values`/`batch`/`exec` + the apps/web `createNotesService`/`createJournalsService` composition root) was intentionally stubbed but parked against a non-existent owner — "UI-3 / M1.1+", where UI-3 (LIF-88, `@vida/editor`) is a CLOSED unit that doesn't own this scope — **not** because the stub is wrong or `fe-notes` under-delivered.

**Facets.**
- *Symptom vs cause.* Symptom = opening Vida, you can't create/persist a note or journal. Cause = the data-plane build is orphaned (no owning unit), not a code failure. [FACT: `apps/web/src/db/client.ts:154-162` `values()`/`batch()` throw the AR-4 seam error; `grep createNotesService apps/web` → 0 instantiations]
- *The stub is grounded (NOT a drift from its own specs).* [FACT: `docs/specs/foundation/ar-4-state-routing-forms/sessions/PLAN-2026-07-29-…:76-81` D5 defers `values`/`batch`; `docs/specs/foundation/fe-notes-and-pages/.../PLAN-s1-notes-collection.md:10-22` D2 declares the data leg a stub]
- *The home is a phantom.* [FACT: `reconstructed-structure.md:86` "29 | ✅UI-3 | Vida editor (@vida/editor, TipTap) | … DONE+MERGED 2026-08-16 (LIF-88, PR #24)"] UI-3 is a closed editor package; it does not own the apps/web worker-RPC seam or any service composition root.
- *No real owner.* [FACT: `docs/roadmap/m1.1-delivery-plan.md:105-110` — the 6 M1.1 issues (MOD-notes/prefs/journals/spaces/sessions/checkins) scope UI surfaces, none owns "build the worker-side Drizzle seam + composition root"]
- *Known failure mode.* [FACT: `reconstructed-structure.md:47` DF-12 "cited deferrals had no proven issue HOMES (orphan-deferral risk)" — fixed elsewhere by minting #85 CAP-authoring; never applied here]
- *Repro.* Open `/notes` or `/` → honest-empty; "create note" no-ops/can't persist; `?sample` shows layout only.

**Files involved.** `apps/web/src/db/client.ts:12,154-162` · `packages/core/src/db/CLAUDE.md:16` · `docs/roadmap/MVP-PATH.md` (3 "UI-3/M1.1+" homing strings) · `apps/web/src/notes/{use-notes-rows,use-note-entity,use-journal-summary}.ts` · `apps/web/src/home/{home-dashboard,journal-page-region,journal-contribution}.tsx`.

## 2. Violated invariant
The repo's own anti-orphan-deferral rule (DF-12): **every cited deferral must have a proven, concrete issue HOME.** The notes/journal data-plane deferral has none — it points to a closed, out-of-scope unit (UI-3), violating the invariant the repo already enforced elsewhere.

## 3. Resolution contract (what a fix MUST / MUST NOT do)
- MUST mint a concrete, tracked unit (Linear issue + task file) in a real milestone owning: (a) worker-side Drizzle `values`/`batch`/`exec` ops, and (b) the apps/web `createNotesService`/`createJournalsService` composition root.
- MUST replace every phantom "UI-3 / M1.1+" homing string with the new unit id.
- MUST NOT change the stub code itself (it is correct M1 scaffolding) — this fix HOMES the work, it does not BUILD it.
- MUST NOT alter the `fe-notes` acceptance (it correctly declared the stub).

## 4. Acceptance (verification once the fix is applied)
- A concrete tracked unit exists (Linear id + `.claude/tasks/<slug>.md`) owning the data plane, homed to a real milestone (candidate: M1.1.3 or M1.4).
- `grep -r "UI-3 / M1.1+"` over `db/client.ts`, `db/CLAUDE.md`, `MVP-PATH.md` → 0 phantom homes (all point to the new id).
- MVP-PATH's "real unbuilt unit" phrasing resolves to a named issue.

## 5. PROPOSED resolution (NOT applied — pending Approval, STRUCTURAL)
- Mint the data-plane unit (`/task-new` + `/track-setup`/`track-sync` or surgical Linear create per the orphan-create guard) in a real milestone.
- Re-home the three phantom strings to the new id.
- Leave the actual BUILD to that unit (Victor: "1b is another task — we don't touch the build").

## UNKNOWN (labeled, No-Guessing)
- The correct milestone for the new unit (M1.1.3 vs M1.4) is a planning decision for Victor. [UNKNOWN: needs Victor's milestone call]
