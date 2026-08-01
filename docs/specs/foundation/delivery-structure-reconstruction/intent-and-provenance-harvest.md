# Intent & Provenance Harvest — the grounded DRAFT (hierarchical)

> **Sole objective (Victor, 2026-07-31):** ORGANIZE all existing information into the shape **Project > Milestone >
> Issue**, so the *real* structure can then be created — with **issue-level granularity** and **file-deliverables
> matching the repository structure + the established architecture (ADRs) + the established documentation**. This
> draft decides NO new structure; it gathers and arranges the raw material (intents, milestones, deliverables,
> related docs, dogfood, repo homes) so the reconstruction has everything it needs.
>
> **Method.** 4 parallel ripgrep passes over `docs/` + `.claude/` (exact-line) + the db-10 triage. **No-Guessing:**
> `[FACT: path:line]`; recorded relationships quoted as-found; corrections are `[DEFECT-FLAG]` (resolved in
> reconstruction). **Immutable inputs** (not open): built CODE (9 shipped units) + ADRs 001–020. **Dogfood** = the
> legacy plan, mined as input, not carried forward as structure.
>
> **Hierarchy semantics:** Project = Vida · **Milestones = the intents, transformed** · Issues = granular
> deliverables, each with a relationship layer (granular deps) + a proper outcome.
> **⚠ Framing to confirm:** milestones organized as INT-1→**M1**, INT-2→**M2**, INT-3→**M3**, INT-4→**M4**
> (the four intents = the four milestones); INT-0 = the Project. Correct if you carve them differently.

---

# ▓▓ PROJECT — Vida ▓▓

## Overview
Vida is a **zero-knowledge, local-first, multiplatform life-management OS**. All user data lives encrypted on the
user's device, syncs through the server only as opaque encrypted blobs, and decrypts client-side with keys only the
user holds. Single-user, multi-device; offline-resilient. 8 modules + additional domains, unified by a **Notes &
Journals integration layer** that is the daily dashboard and connective tissue. `[FACT: CLAUDE.md platform overview]`

## Information — architecture, repo, documentation (the "already established" the issues must match)

**Architecture (ADR-governed).** 20 ADRs at `docs/core/decisions/` govern: ADR-001 tech stack · ADR-002 data model
(3-layer encryption, ~60 tables) · ADR-003 sync (HLC LWW + Yjs) · ADR-004 sessions/effects · ADR-005 study-method ·
ADR-006 spaces/tags · ADR-007 views · ADR-008 capability registry · ADR-009 templates (seed bundles) · ADR-010
capability-authoring security · ADR-011 universal measurability · ADR-012 points-economy · ADR-013 ZK notifications ·
ADR-014 external ingestion · ADR-015 AI/LLM · ADR-016 storage rebuild (per-feature schema) · ADR-017 features-first
resequencing · ADR-018 repo structure · ADR-019 build sequencing (M1→M4) · ADR-020 Zustand placement. `[FACT: C1,C6,C10]`

**Repository structure (ADR-018 — the file homes deliverables must match).** `[FACT: CLAUDE.md monorepo structure; ADR-018]`
```
vida-platform/
├── packages/
│   ├── types/  src/                     # @vida/types — enum tuples (DB-9), Zod-less contracts
│   ├── core/   src/db/{schema,migrations,repository,adapter}   # DB spine
│   │           src/foundation/{sessions,spaces,views,capability,measurement,economy,effects}  # substrates (AR-5/6/7)
│   │           src/services/<module>/   # module-owned engines (summary(date) ∈ services/journals, etc.)
│   │           src/{encryption,sync,validators}
│   ├── editor/ src/                      # @vida/editor — TipTap (UI-3)
│   └── ui/     src/{themes,components}   # @vida/ui — Tamagui (DS-*/UI-1/2)
├── apps/
│   ├── web/    src/{stores,routes,hooks,lib,db}  # client runtime (AR-4); e2e/ (QA-1)
│   ├── mobile/ · desktop/ · server/
├── docs/{core/decisions(ADRs), core/architecture, intake, features, modules, roadmap, infrastructure, specs, ui}
└── tools/
```

**Documentation established (per-context, the intent + rules each issue realizes).** `[FACT: C9,C12; docs/README.md]`
- `docs/intake/<module>.md` (24) — raw intent per module. `docs/features/<module>/` — 5-aspect specs (identity ·
  business-rules · contract · structure-data · conventions), Waves 0→R complete.
- `docs/{modules,infrastructure,core/spaces}/…/current-{spec,business-rules}.md` — durable §XXIX currency docs
  (database-layer, web-client-runtime, spaces, sessions-and-scheduling) — kept current with the built code.
- Conventions: `docs/core/conventions.md` + CLAUDE.md (UUIDv7 PKs, Unix-ms ts, cents money, `[E]` field marks, the
  6 `_sync_*` columns, per-feature hand-written SQL migrations).

## Legacy / migration provenance — the v1 "life-os" version this was migrated FROM
v2 (this repo) is a **from-zero rebuild** of v1 (`life-os`), not an in-place migration: the intent/features were
harvested from v1 into the ADRs + intake docs, and v1's code/schema/docs were **quarantined reference-only** (kept,
not deleted — "nothing left behind" applies to the migration too). Three classes: `[FACT: ADR-016/017/018; docs/_legacy/README; Old/README; db/_legacy/README]`
- **In-repo quarantined v1 CODE (reference-only; outside every `tsconfig`; 0 importers):**
  - `packages/core/src/db/_legacy/schema.v1.ts` — the v1 **monolith (81 tables, ~60% stale)**; superseded by the
    per-feature `db/schema/` dir (ADR-016); **deleted at parity** (a migration milestone the reconstruction must track).
  - `packages/core/src/db/_legacy/001_initial.v1.ts` — v1 80-table DDL migration; superseded by per-feature migrations.
  - `Old/web-adapter.ts` — the v1 wa-sqlite/OPFS `DatabaseAdapter` (~473 LOC real OPFS work, dead); the **reference
    seed** AR-2 rebuilt from. `[FACT: Old/README; roadmap.md:83]`
  - `Old/README.md` · `packages/core/src/db/_legacy/README.md` (quarantine notes). *(`packages/core/dist/db/_legacy/*`
    = compiled artifacts, ignore.)*
- **In-repo quarantined legacy DOCS** (`docs/_legacy/`, quarantined Part 1.0 2026-07-23, superseded — do NOT treat as
  current): `architecture.md` (the old Multiplatform Guide v2, superseded on 5 axes) · `sync-protocol.md` ·
  `encryption.md` · `editor-blocks.md` · `README.md`. `[FACT: docs/_legacy/README; [[authoritative-docs]]]`
- **Out-of-repo v1 SOURCE project** `../life-os/` — the migrated-from codebase; the ADRs cite it for `[FACT]` (e.g.
  `../life-os/src/types/notifications.ts`; `.../onboarding/constants/{achievementDefinitions,levelConfig}.ts`), and
  module feature-specs were **harvested from "ADR-002 + `@vida/types` + legacy life-os"**. `[FACT: docs/README.md:124;
  ADR-012:77,80; ADR-013:59]` See `[[v1-failure-lessons]]` (why v1 failed → what v2 must enforce).

## Immutable inputs (preserved; NOT open in reconstruction)
Built code — the 9 shipped M1.0 units (AR-1/DB-1/AR-2/AR-4/DB-6/DB-7/DB-9/AR-5/AR-6) with their tests + currency
docs + commits — and the 20 ADRs. Everything about tracker/plan STRUCTURE (naming, granularity, homes, relationships)
is open. **The quarantined v1 residue above is reference-only** (not carried into the new structure except as
retire-at-parity tracking). `[FACT: TASKS.md Completed; .claude/tasks/archive/*]`

## Core-source registry (documents cited AS A WHOLE — referenced by name in the milestones below)
| # | Document | Core source OF |
|---|----------|----------------|
| C1 | `ADR-019-build-sequencing-*.md` | **The intent in full** — M1→M4 spine + whole-OS-manual/nothing-left-behind (§1,§3.2,§5) |
| C2 | `docs/roadmap.md` | Current phase structure M1.0–M1.4 (74–127) + Done-when + hard edges (62–71,175–179) |
| C3 | `docs/roadmap/m1.0-delivery-plan.md` | The ONLY issue-level contract — §5 roster (146–197), §5.1 dep-reconcile (232–256). **M1.0-only** |
| C4 | `part-3-build-roadmap/_index.md` | §2.1 M-home ledger (72–105) + M1 build order (111–127) — resequencing truth |
| C5 | `part-3-build-roadmap/{IMPLEMENTATION-PLAN,linear-rescope-map}.md` | Roadmap-rewrite steps + LIF→M-home rescope (35) |
| C6 | `ADR-016 / ADR-017 / ADR-018` | Per-feature schema · features-first deferral · repo homes |
| C7 | `capability-framework.md` | Capability→predicate map incl. seed-bundle T1 + terminal-states T5 (133,137) |
| C8 | `m1.0-dep-graph-validation/{_index,derived-graph}.md` | Per-edge dep graph (LIF-105) + illegal-edge corrections |
| C9 | `docs/intake/<module>.md` + `docs/features/<module>/` | Full intent + rules of every M1.1–M1.3 module |
| C10 | `ADR-002 … ADR-013` | Per-domain data-model + framework ADRs |
| C11 | `.claude/tasks/* + archive/* + _index.md + TASKS.md` | Per-issue task files + tracker mirror |
| C12 | `current-state-baseline/baseline.md` | 35-deliverable status census |
| C13 | `packages/core/src/db/_legacy/*` · `Old/*` · `docs/_legacy/*` | **In-repo quarantined v1 residue** (reference-only) — v1 schema monolith + DDL, v1 web-adapter seed, superseded legacy docs |
| C14 | `../life-os/` (out-of-repo) | **The v1 source project migrated FROM** — cited by ADRs for `[FACT]`; module specs harvested from it |

---

# ▓▓ MILESTONE M1 — INT-1: Whole OS · manual · internally integrated · localhost · unencrypted ▓▓

## Information
The first Real-Product cut: the entire OS, every module operable by hand, unified by the internal connective layer,
running on localhost with encryption/sync/auth off (seam pass-through). **Done-when:** *"every module is manually
operable **and** the OS is internally coherent."* `[FACT: roadmap.md:76-78; ADR-019:20]` Currently sub-sliced into
build phases **M1.0** (boot & connective base) → **M1.1** (hub + foundation modules) → **M1.2** (feature modules) →
**M1.3** (depth/recovered) → **M1.4** (internal-integration hardening → M1 done). `[FACT: roadmap.md:80-104]`

## Intent
**INT-1** (`[FACT: ADR-019:20]`) + **INT-1a — nothing left behind** (*"a pile of disconnected CRUD screens is not the
Real Product"* `[FACT: ADR-019:54]`) + **INT-1b — manual-first, integrations optional** (`[FACT: ADR-014:74 EX-1]`).
Dogfood target: *"I open Vida daily on localhost and run my life in it — by hand."* `[FACT: roadmap.md:21]`

## Related documents + dogfood (for M1)
- **Intent/architecture:** C1 (ADR-019 §1/§3.2/§5), C2 (roadmap M1 74–104), C4 (part-3 M1 order 111–127), C6.
- **Per-deliverable spec:** C9 (24 intake + 5-aspect module docs), C10 (ADR-002…013), the per-unit spec dirs
  `docs/specs/foundation/<unit>/`, currency docs in `docs/{infrastructure,modules,core/spaces}/…/current-*`.
- **Dogfood (mine as input, not structure):** C3 (the M1.0-only delivery-plan), C5 (linear-rescope), C8 (dep-graph
  validation), C11 (task files + `TASKS.md`), C12 (baseline census).

## Deliverables (issues) — each: repo home · architecture(ADR) · established docs · status · relationship layer · outcome-evidence

### M1 · build-phase M1.0 — Boot & DB spine
| ID | Deliverable | Repo home | Arch (ADR) | Docs | Status | Recorded deps (as-found) | Flags |
|----|-------------|-----------|-----------|------|--------|--------------------------|-------|
| AR-1 | Monorepo topology | repo root, `turbo.json` | 001/018 | — | ✅ | — (root) | — |
| DB-1 | Schema primitives | `packages/core/src/db/schema/` | 002/016 | spec dir · db-layer current-* · **supersedes C13 `schema.v1.ts` (retire at parity)** | ✅ | ← AR-1 | — |
| AR-2 | DatabaseAdapter + web-adapter | `apps/web/src/db`, `core/src/db/adapter.ts` | 001/002/016 | `specs/components/ar-2` · db-layer current-* · **rebuilt from C13 `Old/web-adapter.ts` seed** | ✅ (5/7 DoD) | ← AR-1, DB-1 | items 1&2 → QA-1 |
| AR-4 | State + routing + forms | `apps/web/src/{stores,routes,hooks,lib,db}` | 001/020 | spec dir · web-client-runtime current-* | ✅ | ← AR-1 | `[DF-7]` plan:149 home shorthand `{stores,router,forms}` ≠ real |
| DB-6 | Repository (encrypt/decrypt seam, pass-through) | `core/src/db/repository.ts` | 002/016/017 | task · PLAN · db-layer current-* | ✅ | ← AR-2 | — |
| DB-7 | Migrations runner | `core/src/db/migrations/` | 016/002 | spec dir · db-layer current-* | ✅ | ← AR-2 | — |
| DB-9 | Canonical enums + Zod | `packages/types/src/`, `core/src/validators` | 002 | spec dir · types CLAUDE.md | ✅ | ← DB-1 | — |
| DB-3 | Stream-(i) substrate schema | `core/src/db/schema/<substrate>` | 016 §3.5 | task · plan:150 | ⏳ streaming | ← DB-1 `[derived-graph:11]` | rides AR-5/6/7 gate — not a standalone head |
| DB-4 | Stream-(ii) per-domain schema | `core/src/db/schema/<domain>` | 016 §3.5 | task · plan:151 | ⏳ streaming | ← DB-1, DB-3 `[derived-graph:12]` | rides each M1.1+ module gate |
| DB-8 | FTS5 tables | `core/src/db`, `services/search` | 002 (FTS5) | task · plan:154 | ⏳ blocked | ← **DB-4, DB-7** `[derived-graph:13; plan:248]` | **`[DF-2]`** same shape as db-10 (populate needs domain tables); self-gates via ←DB-4 |
| DB-10 | **Dogfood seed vault** | `core/src/db/` (seed) → `packages/core/src/db/seed/` | 016 (+**009 seed-bundle / 019 dogfood — uncited**) | task(PARKED) · PLAN-2026-07-31(dogfood) · plan:156 | ⏸ PARKED | ← **DB-6, DB-7, DB-9** `[plan:156,249; task:17-19]` — **diagram plan:119 omits DB-9** | **`[DF-1 — TRIGGER]`** deps = write-machinery only; charter (seed whole manual OS = INT-1) needs **every module's tables** — unencoded. Ledger left "M1" (no `(tail)`); derivatives → M1.0; `--next` surfaced it ready. `[part-3:84; roadmap:85; linear-rescope:26]` |
| QA-1 | Playwright + OPFS E2E harness | `apps/web/e2e/` | AR-2 audit | task · plan:157 | ⏳ blocked | ← AR-2 `[plan:157,256]` | net-new; no §5 row until added |

### M1 · build-phase M1.0-a2 — Substrates (`foundation/`)
| ID | Deliverable | Repo home | Arch | Status | Recorded deps | Flags |
|----|-------------|-----------|------|--------|---------------|-------|
| AR-5 | Sessions base | `core/src/foundation/sessions` | ADR-004 | ✅ | ← DB-6, DB-9 | `[DF-5]` LIF-107 dup of LIF-76 |
| AR-6 | Spaces + tags/links + Views | `core/src/foundation/{spaces,views}` | ADR-006/007 | ✅ | ← DB-6, DB-9 | unblocks AR-7/AR-8 |
| AR-7 | Capability + measurability + effect rail | `core/src/foundation/{capability,measurement,economy,effects}` | ADR-011/012/004 | ⏳ | ← AR-5, AR-6, DB-6, DB-9 | terminal substrate |
| AR-8 | Foundation services (search/backlink/export/graph-prep) | `core/src/services/{search,export}` | 002/001 | ⏳ | ← DB-8, AR-6 | module-owned engines excluded |
| AR-9 | Sync scaffolding (no-flush; M1 queue-writes) | `core/src/sync` | 003/017 | ⏳ | ← DB-6 | `[DF-3]` stale AR-9←DB-2 deleted; activate→M4 |

### M1 · build-phase M1.0-b/c/d — Design System · UI · UX
| ID | Deliverable | Repo home | Arch/Docs | Deps (final) | Flags |
|----|-------------|-----------|-----------|--------------|-------|
| DS-1..5 | Token pipeline → foundations → motion → Tamagui+dark → primitive contracts | `packages/ui/src/{themes,components}` | ADR-001, STANDARDS design/motion/components | DS-1 root → chain | DS-1 ✅ built + PARKED off-sequence `[DF-6]` |
| UI-1..4 | Primitives→composites · platform views · @vida/editor · app shell | `packages/ui/src/components`, `packages/editor/src`, `apps/web/src` | ADR-001; UI-3 serialization-spec = 0-byte stub | UI-1←DS-5 · UI-2←UI-1 · UI-3←UI-1,AR-4 · UI-4←UI-1,UX-3 | UI-4↔UX-3 inversion corrected `[DF-7 historic]` |
| UX-1..6 | IA · command-bar · shell layout · state conventions · onboarding · Home=Journal | `apps/web/src`, `docs/core/architecture` | ADR-001; UX-6 ← journals docs | UX-1 root; UX-2/3/4/5←UX-1 · UX-6←UX-3 | UX-5←AR-3 removed (illegal M1.0←M3) |

### M1 · build-phases M1.1 / M1.2 / M1.3 — the MODULES  `[DF-4: specified in full, but NEVER made into issues]`
| Phase | Deliverable | Repo home (ADR-018) | Arch (ADR) | Docs (C9) | Placement / ordering `[FACT]` |
|-------|-------------|---------------------|-----------|-----------|-------------------------------|
| M1.1 | Notes & Pages (in-degree-14 HUB) | `core/src/services/notes`, schema `pages/*` | ADR-002 §5.2 | intake/notes-and-pages + features | roadmap:94 FIRST; before all note-storers `[roadmap:63]` |
| M1.1 | Preferences | `core/src/services/preferences` | ADR-002 | intake/preferences | roadmap:94 (after Notes) |
| M1.1 | Journals (daily dashboard) | `core/src/services/journals` | ADR-002 | intake/journals | roadmap:94; owns `summary(date)`→M1.4 |
| M1.1 | Spaces (module surface) | `apps/web` surfaces over `foundation/spaces` | ADR-006–010 | intake/spaces | roadmap:94; over AR-6 |
| M1.1 | Sessions & Scheduling (Pomodoro=sub-type) | `core/src/services/sessions` over `foundation/sessions` | ADR-004 | intake/sessions-and-scheduling | roadmap:94; over AR-5 |
| M1.1 | Check-ins | `core/src/services/checkins` | ADR-002 | intake/check-ins | roadmap:94 (independent) |
| M1.2 | Tasks · Habits · Finance · Relationships | `core/src/services/{tasks,habits,finance,relationships}` | ADR-002 | intake/{…} | roadmap:97 Wave-1 |
| M1.2 | Projects · Books · Knowledge (+review engine, Flashcards svc) | `core/src/services/{projects,books,knowledge}` | ADR-005/002 | intake/{…} | roadmap:97 Wave-2 |
| M1.2 | Learning: Education (ICS module surface) | `core/src/services/learning` | ADR-002 | intake/learning-education | roadmap:97; **surface=M1, live feed=M2** `[part-3:107]` |
| M1.2 | Routines (orchestrator) | `core/src/services/routines` | ADR-002 | intake/routines | roadmap:97; needs sequenced modules first |
| M1.2 | **Purposes & Goals** (measurability capstone) | `core/src/services/purposes` | ADR-011 | intake/purposes-and-goals | roadmap:66-67,97; **rolls up EVERY module → last** |
| M1.2 | Gamification (economy engine) | `core/src/services/gamification` | ADR-012 | intake/gamification | roadmap:97; observes all |
| M1.2 | Notifications (in-app/local) | `core/src/services/notifications` | ADR-013 | intake/notifications | roadmap:67,97; **dead-last leaf** |
| M1.3 | Health: Core · Training · Nutrition | `core/src/services/health/*` | ADR-002 | intake/health | roadmap:100 (recovered) |
| M1.3 | Skills | `core/src/services/skills` | ADR-002 | intake/skills | roadmap:100 (recovered) |
| M1.3 | Finance → Commitments | `core/src/services/finance` (sub-context) | ADR-002 | intake/finance | roadmap:100; no entity; composition |
| M1.3 | Projects → Investigations | `core/src/services/projects` (sub-context) | ADR-002 | intake/projects | roadmap:100; no entity; composition |

### M1 · build-phase M1.4 — Internal-integration hardening (→ M1 done)
| Deliverable | Repo home | Arch | Docs | Recorded deps |
|-------------|-----------|------|------|---------------|
| `summary(date)` provider registry (Journals-owned) | `core/src/services/journals` | ADR-002 + roadmap §55 | intake/journals | wired to read EVERY module `[roadmap:102-104]` |
| Measurability + economy rollups live | `foundation/{measurement,economy}` | ADR-011/012 | purposes + gamification features | end-to-end across all modules |
| Neural-graph + backlinks complete | `foundation/spaces` (links) + `services/…` (resolver) + UI-2 (view) | ADR-006 + AR-8 | notes-and-pages | entity_links(AR-6)+resolver(AR-8)+view(UI-2) |
| Polish | (distributed) | — | all module docs | final tail → M1 done |
| DB-11 · ADR-002 §5/§7/§8 reconciliation | `core/src/db` (doc) | ADR-002 | task | **M1.4 tail** — the correctly-homed tail sibling; **db-10's model** `[part-3 DB-11; linear-rescope:63]` |

---

# ▓▓ MILESTONE M2 — INT-2: External integrations + security boundary ▓▓

## Information
The integration layer, co-built with its ADR-014/015 ingestion guard, against the encryption seam so M3 is a verified
flip. Head = provider-selection (choose the ~16 undefined vendors first). `[FACT: roadmap.md:110-125; ADR-019:21]`

## Intent
**INT-2** — establish working external integrations for localhost dogfood, before encryption, but built against the
seam + guard. `[FACT: ADR-019:21,28]`

## Related documents + dogfood
C1 (ADR-019 §3.3), C2 (roadmap M2 110–125), **ADR-014** (external ingestion), **ADR-015** (AI/LLM), the integration
register (roadmap:123-125), C4 §2.1 P3 rows.

## Deliverables (issues)
| ID | Deliverable | Arch | Recorded placement |
|----|-------------|------|--------------------|
| P3-① | **Provider-Selection Pass** (head) | ADR-014/015 | M2 head — choose ~16 undefined vendors `[roadmap:115]` |
| P3-② | Integrations — Financial (CSV/OFX, aggregator, prices/FX) | ADR-014 | M2 `[roadmap:116]` |
| P3-③ | Integrations — Health & Wearables (Apple/Google Health, BLE, food DB, barcode) | ADR-014 | M2 `[roadmap:117]` |
| P3-④ | Integrations — AI/LLM (askModel runtime, on-device, BYO-cloud, OCR/TTS) | ADR-015 | M2 `[roadmap:118]` |
| P3-⑤ | Integrations — Fiscal rule-packs | ADR-014 | M2 `[roadmap:119]` |
| P3-⑥ | Integrations — Calendar & Extraction (live ICS `ical.js`, syllabus extraction, webhooks) | ADR-014 | M2 `[roadmap:120]` |
| (boundary) | Security boundary co-built (ingestion guard, `external_in/out_ok`, egress guard, leak decisions) | ADR-014/015 | M2 `[roadmap:121]` |

> Integration register: 22 integrations · 6 DEFINED · 16 UNDEFINED-provider (→ P3-①). `[FACT: roadmap.md:123-125]`

---

# ▓▓ MILESTONE M3 — INT-3: Whole-OS encryption pass ▓▓

## Information / Intent
Turn on L1 SQLCipher-at-rest + L2 field-`[E]` across ALL data (manual + integration); finalize the DB-5 boundary;
re-verify the ingestion guard live. **Gates any release beyond solo-localhost.** `[FACT: ADR-019:22,39; roadmap:131]`

## Related documents + dogfood
C1 (ADR-019 §3.4 release gate), ADR-002 §4 (3-layer model), C5 (IMPLEMENTATION-PLAN:30 M3 section), the deferred rows
in C3 §5.1 (:280).

## Deliverables (issues) — re-homed OUT of M1 by ADR-017/019
| ID | Deliverable | Repo home | Arch | Recorded placement |
|----|-------------|-----------|------|--------------------|
| AR-3 | Crypto/vault/key-mgmt | `core/src/encryption` | ADR-001/002 | **M3** `[part-3:88; linear-rescope:38]` |
| DB-5 | Encryption boundary map (`[E]`/SQLCipher) | `core/src/db` | ADR-002 §4 | **M3**; DB-6←DB-5 edge removed (illegal M1.0←M3) |
| DB-8b | Blind index (keyed BLAKE2b) | `core/src/db` | ADR-002 | **M3** (needs encryption key) |
| UX-5b | Vault-unlock flow | `apps/web/src` | ADR-017 | **M3/M4** (auth-coupled) |
| (pass) | SQLCipher activation + ingestion-guard re-verify + release gate | cross-cutting | ADR-019 §3.4 | **M3** |

---

# ▓▓ MILESTONE M4 — INT-4: Venues / multi-device ▓▓

## Information / Intent
Sync (ADR-003) → auth (SRP) → desktop/mobile → self-host → ZK-cloud. Needs a second device, hence last. `[FACT:
ADR-019:23; roadmap M4]`

## Related documents + dogfood
C1 (ADR-019 §1 M4), ADR-003 (sync protocol), C4 §2.1 P2 rows, the AR-9 M4-activation split, DB-2 (re-homed M4).

## Deliverables (issues)
| ID | Deliverable | Arch | Recorded placement |
|----|-------------|------|--------------------|
| P2-①..⑥ | Sync/server · ZK-notify Tier-3 · desktop · mobile · self-host · ZK-cloud+billing | ADR-003 | **M4** `[part-3:` P2 row] |
| AR-9b | Sync engine ACTIVATION (flush the queue; LWW/HLC/Yjs) | ADR-003 | **M4** (split from AR-9) `[LIF-98]` |
| DB-2 | `_sync_*` metadata columns + HLC representation | ADR-002/003 | **M4** (cols land M1; activation M4) `[DF-3]` |

---

# ▓▓ STRUCTURAL DEFECT REGISTER (cross-cutting — reconstruction must resolve) ▓▓
- **DF-1 — db-10 mis-homed + under-depended (trigger).** Whole-OS deliverable in the M1.0 spine w/ machinery-only
  deps; real "needs every module's tables" dep unencoded; ledger "M1"→derivatives "M1.0"→`--next` ready. `[part-3:84;
  plan:119,156; roadmap:85; linear-rescope:26]`
- **DF-2 — DB-8 latent same-shape.** Populate needs domain tables; self-gates via ←DB-4. In M1.0 roster, really tail.
- **DF-3 — recurring stale/illegal cross-milestone edges** (caught piecemeal): DB-6←DB-5, AR-9←DB-2, UX-5←AR-3,
  DB-8←DB-6. The structure never encodes "when does the depended-on thing exist." `[plan:223,248; derived-graph:30]`
- **DF-4 — the delivery instrument covers only M1.0.** ~25 module deliverables (bulk of INT-1) live only as roadmap
  prose — no issues/homes/deps/outcomes; INT-1a "nothing left behind" unverifiable. `[C3 M1.0-only]`
- **DF-5 — identity/naming drift.** LIF-107 vs LIF-76 dup; "M1" vs "M1.0" grain-collapse; four sources disagree.
- **DF-6 — off-sequence build** (DS-1 built then parked).
- **DF-7 — home shorthand ≠ real path** (plan:149 `{stores,router,forms}`; plan:156 `core/src/db/` vs `packages/…`).
- **DF-8 — profile per issue not stable** (db-10 generic-coding vs Add Backend Component).
- **DF-9 — v1 retire-at-parity not a tracked deliverable.** The quarantined v1 residue (C13: `schema.v1.ts`,
  `001_initial.v1.ts`, `Old/web-adapter.ts`, `docs/_legacy/*`) is slated for deletion "at parity" but that retirement
  is only prose in the `_legacy` READMEs + ADR-016/018 — no issue/outcome owns it. "Nothing left behind" (INT-1a)
  cuts both ways: the migration is not *done* until v1 residue is cleanly retired, and that must be an explicit
  deliverable with an outcome. `[FACT: db/_legacy/README "Deleted at parity (DB-6/7)"; ADR-016:19]`

---

# ▓▓ WHAT THIS DRAFT FEEDS (the reconstruction — not decided here) ▓▓
Using Project + Milestones (INT-1..4) + the organized deliverables above, the reconstruction creates the REAL
**Project > Milestone > Issue** structure: granular issues whose **file-deliverables match the repo homes** (ADR-018)
+ the **architecture** (ADRs) + the **established docs** (C9/C10), each with a **corrected relationship layer**
(resolving every DF) and an explicit **outcome**. Every deliverable must land under a milestone, carry ≥1 relationship
(or be a declared root/leaf), map to a repo home, and define an outcome — so an orphan like db-10 is impossible.

## Change Log
| Date | Change |
|------|--------|
| 2026-07-31 | Initial flat harvest (§0–§3). |
| 2026-07-31 | **Restructured to the hierarchy (Victor):** PROJECT (overview + architecture/repo/docs info) → MILESTONES M1–M4 (each: information · intent · related docs+dogfood · deliverables with repo-home + ADR + docs) → defect register. Sole objective clarified: organize so the real granular issue structure (file-deliverables matching repo/architecture/docs) can be built. |
| 2026-07-31 | **Added legacy/migration provenance (Victor):** the v1 "life-os" version migrated FROM — in-repo quarantined residue (C13: `db/_legacy/*`, `Old/*`, `docs/_legacy/*`) + out-of-repo source `../life-os/` (C14); tagged DB-1/AR-2 legacy seeds; DF-9 (v1 retire-at-parity untracked). |
