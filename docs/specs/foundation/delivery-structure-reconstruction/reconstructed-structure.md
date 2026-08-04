# Reconstructed Delivery Structure — Vida (Initiative → Project → Milestone → Issue)

> **Phase V of `delivery-structure-model` (LIF-110).** Re-organizes the malformed structure to the model the toolkit work
> (T0 realign-cluster-to-project + T1 ADR-016) established, from `intent-and-provenance-harvest.md`.

## 1. The 4 tracked levels (Linear entities — ADR-007:54,101 + ADR-016)
| Level | = Linear | Definition | In Vida |
|-------|----------|-----------|---------|
| **INITIATIVE** | Initiative | logical product / repo (ADR-007:16,36) | **Vida** (1) |
| **PROJECT** | Project | a **build TIER** — a horizontal front (ADR-016) | **M1 · M2 · M3 · M4** (the 4 intents) |
| **MILESTONE** | ProjectMilestone | a **delivery-SLICE** of a tier — showcase-able (ADR-016) | **M1.0 … M1.4**, M2.0, M3.0, M4.0 |
| **ISSUE** | Issue | a **sprint** = one deliverable; names homes + dep edges (ADR-016 db-10-proof) | `AR-1`, `DB-1`, `MOD-notes`… |

## 2. Naming convention + glossary (nothing undefined)
- **Initiative** — `Vida`.
- **Project** — id `M<n>` (n = tier build-order 1–4). Title `M<n> — <Tier Name>`. Description = intent + Done-when.
- **Milestone** — id `M<n>.<m>` (m = slice order in the tier). Title `M<n>.<m> — <Slice Name>`. *(The dotted number IS the hierarchy: `M1` = Project, `M1.0` = a Milestone under it.)*
- **Issue** — **existing issues keep their established slug + LIF id** (no renames). New issues take a descriptive slug. Every Issue has a reliable imperative title + all columns below.
- **Slug prefixes in use** (descriptive, established — NOT a rename mandate): `AR` Architecture&Runtime · `DB` Database&Storage (`DB-8b` blind-index) · `DS` Design System · `UI` UI · `UX` UX&IA (`UX-5b` vault-unlock) · `MOD` Feature Module *(new — DF-4)* · `P3` External-Integration phase (M2) · `M3-pass` encryption release-gate · `P2` Venue phase (M4, `AR-9b` sync-activation) · `QA` Testing · `HARD` Integration-Hardening *(new)* · `MIG` Migration/Retire *(new)* · `CAP` Capability-authoring *(new — post-core extensibility, DF-12)*.
- **Column glossary:**
  - **`#`** = the **global build order** — the topological sequence across the WHOLE initiative. Do issues in `#` order and every dependency is already done (fail-proof). `#` runs 1→85 continuously down this doc.
  - **`←` Blocked-by** = the issues this one depends on (must be done first). `root` = no blockers.
  - **`→` Blocks** = the issues this one unblocks (are waiting on it). `leaf` = blocks nothing.
  - **Profile** (fixed): **Backend**=Add Backend Component · **Design-Sys**=Design System · **Generic**=Generic Coding Session · **Foundation**=Project Foundation Setup.
  - **Status:** ✅ shipped(merged) · ◧ built+parked off-sequence (NOT merged) · ⏳ ready/next · ⏸ blocked · ◻ not-started · 〰 stream (authored incrementally at each consumer's build) · ⚠ UNDEFINED/EMERGING (scoping deliverable — define before build).
  - **DF** = **Structural Defect** — a flaw in the OLD structure (from the harvest's Defect Register, §3) that this reconstruction fixes.
  - **⊕agg** = the **all-module aggregators** {HARD-1, DB-10, DB-11, MIG-1, DB-5} — each depends on the FULL M1.1–M1.3 module set, so every `MOD-*` blocks them (written `→ …, ⊕agg` to avoid repeating five ids per module).
  - **`⊞N`** = an **Outcome-cell** marker (orthogonal to Status): the issue authors N independent substrates and is delivered in **N gated build-step increments** — one full §XXVI double-gate per substrate, in dependency order (the multi-substrate rule, `delivery-plan §2`; DF-11). Absent = single increment. Folds (Views→AR-6) and coupled multi-layer deliverables (DB-9) are NOT marked.

## 3. Structural Defects (DF) resolved
| DF | Defect in the OLD structure | Resolution here |
|----|-----------------------------|-----------------|
| **DF-1** | db-10 mis-homed to the spine; real "needs every module's tables" dep unencoded | `DB-10` → M1.4 (#62); Blocked-by enumerates **every M1.1–M1.3 `MOD-*`** — its `#` is late, never an M1.0 head |
| **DF-2** | `DB-8` (FTS5) latent same-shape | `DB-8` → M1.4 (#60); ← DB-4, DB-7 |
| **DF-3** | stale/illegal upstream edges | all removed; every `←` points to a LOWER `#` (proven in §5) |
| **DF-4** | ~25 modules were prose, never Issues | every module is a first-class `MOD-*` Issue |
| **DF-5** | M1-as-Milestone vs M1.0-as-Project grain-collapse | fixed at root: `M1`=Project, `M1.0`=Milestone |
| **DF-6** | off-sequence build (DS-1) | `DS-1` = ✅-built/parked, kept in `#` order |
| **DF-7** | home shorthand ≠ real path | every Home is a real ADR-018 path |
| **DF-8** | profile per Issue unstable | every Issue has a fixed Profile |
| **DF-9** | v1 retire-at-parity untracked | new Issue `MIG-1` (#63) |
| **DF-10** *(this session)* | **no global build order** — issues had layers but no first→last sequence | the **`#` column** = a full topological order; §5 proves it acyclic |
| **DF-11** *(this session)* | multi-substrate issue had no per-increment gating spec — the delivery-plan's per-issue flow (§2) assumed issue = one build-context (true only of the single-substrate issues it was written against, AR-5/AR-6) | per-substrate **increment rule** + **enforced gate precondition** written into `delivery-plan §2/§3`; issues authoring >1 independent substrate marked `⊞N` in Outcome (AR-7 ⊞4, AR-8 ⊞≥2); folds/coupled/integration stay 1 gate (Views→AR-6, DB-9, HARD-2) |
| **DF-12** *(this session)* | AR-7's cited deferrals had no proven issue HOMES (orphan-deferral risk, db-10-shaped) | homed by the docs' first-consumer-pull rule: registry-runtime → MOD-notes `#31` / UI-3 `#29`; `capability_grants` external-semantics → P3-boundary `#71` (M2); **new** `#85 CAP-authoring` for the ADR-010/SP4 safe-authoring runtime (its only un-homed consumer). `CAP-` slug (not `MOD-`) so the unscoped "all `MOD-*`" aggregators don't pull a `#85` backward-edge |

---

# PROJECT M1 — Whole Manual OS   *(tier · build-order 1)*
Intent (INT-1): the entire OS, every module operable by hand, unified by the internal connective layer, localhost,
encryption/sync/auth off. **Done-when:** *every module manually operable AND the OS internally coherent* `[roadmap:76-78]`.

## Milestone M1.0 — Boot & Connective Base
| # | ID | Title | Home (ADR) | ← Blocked-by | → Blocks | Prof | Outcome |
|---|----|-------|-----------|--------------|----------|------|---------|
| 1 | ✅AR-1 | Monorepo topology | repo root (001/018) | root | DB-1, AR-2, AR-4 | Backend | workspace builds all packages |
| 2 | ✅DB-1 | Schema primitives | `core/src/db/schema/` (002/016) | ← AR-1 | AR-2, DB-9, DB-3, DB-4, DB-11, MIG-1, DB-2 | Backend | primitive helpers for every schema |
| 3 | ✅AR-2 | DatabaseAdapter + web-adapter | `apps/web/src/db`, `core/db/adapter.ts` (001/002/016) | ← AR-1, DB-1 | DB-6, DB-7, QA-1 | Backend | async adapter over wa-sqlite/OPFS |
| 4 | ✅DB-9 | Canonical enums + Zod | `packages/types/src`, `core/validators` (002) | ← DB-1 | AR-5, AR-6, MOD-notes, DB-10 | Backend | 81 enum tuples + validators |
| 5 | ✅AR-4 | Client runtime (state/routing/forms + worker DB binding) | `apps/web/src/{stores,routes,hooks,lib,db}` (001/020) | ← AR-1 | UI-3 | Generic | runtime boots; DB reachable main-thread |
| 6 | ✅DB-6 | Repository (encrypt/decrypt seam) | `core/src/db/repository.ts` (002/016/017) | ← AR-2 | AR-5, AR-6, AR-9, MOD-notes, DB-10 | Backend | CRUD + co-transactional sync_queue |
| 7 | ✅DB-7 | Migrations runner + app_state | `core/src/db/migrations/` (016/002) | ← AR-2 | DB-8, DB-10 | Backend | forward-only migrations at boot |
| 8 | ⏳QA-1 | Playwright + OPFS E2E harness | `apps/web/e2e/` (AR-2 audit) | ← AR-2 | leaf | Backend | browser open/reopen/persist proven |
| 9 | 〰DB-3 | Stream-(i) substrate schema | `core/src/db/schema/<substrate>` (016 §3.5) | ← DB-1 | DB-4 | Backend | substrate tables at each substrate build |
| 10 | 〰DB-4 | Stream-(ii) per-domain schema | `core/src/db/schema/<domain>` (016 §3.5) | ← DB-1, DB-3 | DB-8 | Backend | each module's tables at that module's build |
| 11 | ✅AR-5 | Sessions base | `core/src/foundation/sessions` (004) | ← DB-6, DB-9 | AR-7, MOD-sessions | Backend | sessions spine + registry + effect enums |
| 12 | ✅AR-6 | Spaces + tags/links + Views | `core/src/foundation/{spaces,views}` (006/007) | ← DB-6, DB-9 | AR-7, AR-8, MOD-notes, MOD-spaces, HARD-3 | Backend | spaces/tags/entity_links + view engine |
| 13 | ⏳AR-7 | Capability + measurability + effect rail | `core/src/foundation/{capability,measurement,economy,effects}` (011/012/004) | ← AR-5, AR-6 | MOD-purposes, MOD-gamification, HARD-2, CAP-authoring | Backend | ⊞4 · capability registry + measurability + effects |
| 14 | ⏳AR-8 | Foundation services (backlink/export/graph-prep) | `core/src/services/{search,export}` (002/001) | ← AR-6 | HARD-3 | Backend | ⊞≥2 (pin at AR-8's turn) · backlink/export/graph-prep (search sub-part → DB-8) |
| 15 | ⏳AR-9 | Sync scaffolding (no-flush) | `core/src/sync` (003/017) | ← DB-6 | AR-9b | Backend | queue accrues writes; activation → M4 |
| 16 | ✅DS-1 | Token pipeline (Style Dictionary → CSS/Tamagui) | `packages/ui/src/themes` (001) | root | DS-2 | Design-Sys | design tokens emitted — **re-landed onto main 2026-08-03** (ab5966c; DF-6 resolved), LIF-81 Done; DS-2 now ready |
| 17 | ✅DS-2 | Foundations (color/space/type scales) | `packages/ui/src/themes` | ← DS-1 | DS-3 | Design-Sys | **DONE 2026-08-03** (LIF-82) — real values + aux namespaces + dark overlay; ⚠ placeholder palette (not brand); @vida/ui 20/20; branch `ds-2-foundations` (715687b, not merged). DS-3 now ready |
| 18 | ◻DS-3 | Motion foundation | `packages/ui/src/themes` | ← DS-2 | DS-4 | Design-Sys | motion tokens/primitives |
| 19 | ◻DS-4 | Tamagui config + dark mode | `packages/ui/src` (001) | ← DS-3 | DS-5 | Design-Sys | themed Tamagui config |
| 20 | ◻DS-5 | Primitive contracts | `packages/ui/src/components` | ← DS-4 | UI-1 | Design-Sys | primitive component contracts |
| 21 | ◻UX-1 | Information architecture | `docs/core/architecture`, `apps/web/src` (001) | root | UX-2, UX-3, UX-4, UX-5 | Generic | IA + nav model |
| 22 | ◻UX-2 | Command bar + search | `apps/web/src` | ← UX-1 | leaf | Generic | command bar |
| 23 | ◻UX-3 | Shell layout (responsive) | `apps/web/src` | ← UX-1 | UX-6, UI-4 | Generic | responsive shell layout |
| 24 | ◻UX-4 | State conventions | `apps/web/src` | ← UX-1 | leaf | Generic | client-state conventions |
| 25 | ◻UX-5 | Vault-unlock onboarding (surface) | `apps/web/src` | ← UX-1 | UX-5b | Generic | onboarding surface |
| 26 | ◻UX-6 | Home = Journal dashboard | `apps/web/src` | ← UX-3 | leaf | Generic | Home renders the daily journal |
| 27 | ◻UI-1 | Vida UI primitives | `packages/ui/src/components` | ← DS-5 | UI-2, UI-3, UI-4 | Design-Sys | primitive component library |
| 28 | ◻UI-2 | Platform views (calendar/gallery/list/graph/timeline) | `packages/ui/src/components` | ← UI-1 | HARD-3 | Design-Sys | shared platform views |
| 29 | ◻UI-3 | Vida editor (@vida/editor, TipTap) — spec is a 0-byte stub → author | `packages/editor/src` | ← UI-1, AR-4 | CAP-authoring | Design-Sys | block editor + serializers |
| 30 | ◻UI-4 | App shell components | `apps/web/src` | ← UI-1, UX-3 | leaf | Generic | app shell composed |

## Milestone M1.1 — Hub & Foundation Modules   *(default home `core/src/services/<module>`)*
> **Home exceptions (DF-7 — do not glob-expand blindly):** `MOD-spaces` → `apps/web` surfaces over `foundation/spaces`; `MOD-health` → `core/src/services/health/*`; `MOD-finance-commitments` / `MOD-projects-investigations` → sub-contexts of `services/finance` / `services/projects` (no new dir). All other `MOD-*` follow the default.
| # | ID | Title | ADR | ← Blocked-by | → Blocks | Prof | Outcome |
|---|----|-------|-----|--------------|----------|------|---------|
| 31 | ◻MOD-notes | Notes & Pages (in-degree-14 HUB) | 002 §5.2 | ← DB-6, DB-9, AR-6 | MOD-prefs, MOD-journals, MOD-spaces, MOD-sessions, MOD-tasks, MOD-habits, MOD-finance, MOD-relationships, MOD-books, MOD-knowledge, MOD-health, MOD-duties, ⊕agg | Backend | pages/links — the connective layer |
| 32 | ◻MOD-prefs | Preferences | 002 | ← MOD-notes | MOD-journals, ⊕agg | Backend | user/nav/command-bar prefs |
| 33 | ◻MOD-journals | Journals (daily dashboard; owns `summary(date)`) | 002 | ← MOD-notes, MOD-prefs | MOD-checkins, ⊕agg | Backend | one journal/day; agenda; entry |
| 34 | ◻MOD-spaces | Spaces module surface | 006–010 | ← AR-6, MOD-notes | ⊕agg | Backend | user-facing spaces/tags |
| 35 | ◻MOD-sessions | Sessions & Scheduling (Pomodoro=sub-type) | 004 | ← AR-5, MOD-notes | ⊕agg | Backend | session/pomodoro surface |
| 36 | ◻MOD-checkins | Check-ins | 002 | ← MOD-journals | ⊕agg | Backend | daily check-in templates + entries |

## Milestone M1.2 — Feature Modules
| # | ID | Title | ADR | ← Blocked-by | → Blocks | Prof | Outcome |
|---|----|-------|-----|--------------|----------|------|---------|
| 37 | ◻MOD-tasks | Tasks | 002 | ← MOD-notes | MOD-projects, MOD-routines, MOD-purposes, ⊕agg | Backend | tasks + sub-tasks + time logs |
| 38 | ◻MOD-habits | Habits | 002 | ← MOD-notes | MOD-routines, MOD-purposes, ⊕agg | Backend | habits + completions + streaks |
| 39 | ◻MOD-finance | Finance | 002 | ← MOD-notes | MOD-purposes, MOD-finance-commitments, MOD-fiscal-legal, P3-2, P3-5, ⊕agg | Backend | accounts/transactions/assets/… |
| 40 | ◻MOD-relationships | Relationships (CRM) | 002 | ← MOD-notes | MOD-purposes, ⊕agg | Backend | contacts/interactions/reminders |
| 41 | ◻MOD-books | Books | 005/002 | ← MOD-notes | MOD-knowledge, MOD-learning, MOD-purposes, ⊕agg | Backend | books + chapters + progress |
| 42 | ◻MOD-projects | Projects | 002 | ← MOD-tasks | MOD-purposes, MOD-projects-investigations, MOD-bucket-list, ⊕agg | Backend | projects › milestones › deliverables › tasks |
| 43 | ◻MOD-knowledge | Knowledge (+ review engine, Flashcards svc) | 005/002 | ← MOD-notes, MOD-books | MOD-learning, MOD-purposes, MOD-skills, MOD-languages, ⊕agg | Backend | topics/definitions + SM-2 review |
| 44 | ◻MOD-learning | Learning: Education (ICS surface; live feed → M2) | 002 | ← MOD-knowledge, MOD-books | MOD-purposes, MOD-languages, P3-6, ⊕agg | Backend | courses/homework/exams surface |
| 45 | ◻MOD-routines | Routines (orchestrator) | 002 | ← MOD-tasks, MOD-habits | MOD-purposes, ⊕agg | Backend | routines linked to habits/tasks |
| 46 | ◻MOD-purposes | Purposes & Goals (measurability capstone; rolls up every MEASURED module → 1st capstone) | 011 | ← AR-7, MOD-tasks, MOD-habits, MOD-finance, MOD-relationships, MOD-projects, MOD-books, MOD-knowledge, MOD-learning, MOD-routines | MOD-gamification, MOD-bucket-list, HARD-2, ⊕agg | Backend | purposes/targets/metrics over all measured modules |
| 47 | ◻MOD-gamification | Gamification (economy surface — 2nd capstone) | 012 | ← AR-7, MOD-purposes | MOD-notifications, HARD-2, ⊕agg | Backend | XP/achievements/currencies ledger |
| 48 | ◻MOD-notifications | Notifications (in-app/local; dead-last leaf) | 013 | ← MOD-gamification | ⊕agg | Backend | local notifications over any entity |

## Milestone M1.3 — Depth & Recovered Modules
| # | ID | Title | ADR | ← Blocked-by | → Blocks | Prof | Outcome |
|---|----|-------|-----|--------------|----------|------|---------|
| 49 | ◻MOD-health | Health (Core · Training · Nutrition) | 002 | ← MOD-notes | P3-3, ⊕agg | Backend | health tracking sub-contexts |
| 50 | ◻MOD-skills | Skills | 002 | ← MOD-knowledge | ⊕agg | Backend | skills + resources |
| 51 | ◻MOD-finance-commitments | Finance → Commitments (composition) | 002 | ← MOD-finance | ⊕agg | Backend | commitments view over finance |
| 52 | ◻MOD-projects-investigations | Projects → Investigations (composition; sub-context of `services/projects`) | 002 | ← MOD-projects | ⊕agg | Backend | investigations view over projects |
| 53 | ◻MOD-languages | Language learning (dictionary/vocab/practice; a Knowledge section) | 002 | ← MOD-knowledge, MOD-learning | ⊕agg | Backend | per-language proficiency + vocabulary + practice sessions |
| 54 | ◻MOD-bucket-list | Bucket List (items linked to purposes & projects) | 002 | ← MOD-purposes, MOD-projects | ⊕agg | Backend | bucket-list items with steps/cost/location |
| 55 | ◻⚠MOD-duties | Duties — ⚠ UNDEFINED (define what a Duty IS vs Task/Habit/Routine + placement FIRST) | 002 | ← MOD-notes | ⊕agg | Backend | **scoping deliverable**: no v2 schema (dropped in 91→60 consolidation); intent captured `docs/intake/duties.md` |
| 56 | ◻⚠MOD-fiscal-legal | Fiscal & Legal ("Jurisdiction Compass") — ⚠ EMERGING (net-new; harvest+define FIRST) | 002 | ← MOD-finance | ⊕agg | Backend | **scoping deliverable**: pre-harvest cross-module intent (Finance↔Projects↔Purposes); intent captured `docs/intake/fiscal-legal.md` |

## Milestone M1.4 — Internal-Integration Hardening   *(→ Project M1 done; all M1.4 runs after every module)*
| # | ID | Title | Home (ADR) | ← Blocked-by | → Blocks | Prof | Outcome |
|---|----|-------|-----------|--------------|----------|------|---------|
| 57 | ◻HARD-1 | `summary(date)` provider registry | `services/journals` (002) | ← every `MOD-*` | HARD-4 | Backend | journal summary aggregates all modules |
| 58 | ◻HARD-2 | Measurability + economy rollups live | `foundation/{measurement,economy}` (011/012) | ← AR-7, MOD-purposes, MOD-gamification | HARD-4 | Backend | end-to-end measurability/economy (integration-class — 1 gate, DF-11) |
| 59 | ◻HARD-3 | Neural-graph + backlinks complete | `foundation/spaces` + `services` + UI-2 (006) | ← AR-6, AR-8, UI-2 | HARD-4 | Backend | working backlinks + neural graph |
| 60 | ◻DB-8 | FTS5 tables + search population | `core/src/db`, `services/search` (002) | ← DB-4, DB-7 | HARD-4, DB-8b | Backend | full-text search over real content (DF-2) |
| 61 | ◻DB-11 | ADR-002 §5/§7/§8 reconciliation | `core/src/db` (002) | ← DB-1, **all `MOD-*`** | HARD-4 | Backend | schema doc reconciled |
| 62 | ⏸DB-10 | Dogfood seed vault | `packages/core/src/db/seed/` (016; +ADR-009 seed-bundle / 019 dogfood — ⚠ UNCITED, resolve at build) | ← DB-6, DB-7, DB-9, **all M1.1–M1.3 `MOD-*`** | HARD-4 | Backend | localhost vault seeded with a full manual OS (DF-1) |
| 63 | ◻MIG-1 | v1 retire-at-parity (DF-9) | `db/_legacy/*`, `Old/*`, `docs/_legacy/*` (016/018) | ← DB-1, **all `MOD-*` schemas** | HARD-4 | Backend | quarantined v1 residue (code + Old/ + legacy docs) deleted at parity |
| 64 | ◻HARD-4 | Polish → M1 done | distributed **[GATE — no file home]** | ← HARD-1, HARD-2, HARD-3, DB-8, DB-10, DB-11, MIG-1 | P3-1, AR-3, P2-3, P2-4 | Generic | **M1 done: operable + coherent** |

---

# PROJECT M2 — External Integrations & Security Boundary   *(tier · build-order 2)*
Intent (INT-2): working external integrations for localhost dogfood, pre-encryption, against the seam + ADR-014/015 guard `[roadmap:110-125]`.

## Milestone M2.0 — Integrations & Boundary
| # | ID | Title | ADR | ← Blocked-by | → Blocks | Prof | Outcome |
|---|----|-------|-----|--------------|----------|------|---------|
| 65 | ◻P3-1 | Provider-selection pass (head — the ~16 UNDEFINED of 22; 6 already defined) | 014/015 | ← HARD-4 | P3-2, P3-3, P3-4, P3-5, P3-6 | Foundation | all 22 integrations (6 defined + 16 chosen) have providers |
| 66 | ◻P3-2 | Financial (CSV/OFX, aggregator, prices/FX) | 014 | ← P3-1, MOD-finance | P3-boundary | Backend | bank import + price feeds |
| 67 | ◻P3-3 | Health & Wearables (Apple/Google Health, BLE) | 014 | ← P3-1, MOD-health | P3-boundary | Backend | wearable/health ingestion |
| 68 | ◻P3-4 | AI/LLM (askModel, on-device, BYO-cloud, OCR/TTS) | 015 | ← P3-1 | P3-boundary | Backend | askModel runtime for modules |
| 69 | ◻P3-5 | Fiscal rule-packs | 014 | ← P3-1, MOD-finance | P3-boundary | Backend | fiscal rule packs |
| 70 | ◻P3-6 | Calendar & Extraction (live ICS, syllabus, webhooks) | 014 | ← P3-1, MOD-learning | P3-boundary | Backend | live ICS feed |
| 71 | ◻P3-boundary | Security boundary (ingestion/egress guard) | 014/015 | ← P3-2, P3-3, P3-4, P3-5, P3-6 | M3-pass | Backend | verified ingestion/egress guard |

---

# PROJECT M3 — Whole-OS Encryption Pass   *(tier · build-order 3)*
Intent (INT-3): L1 SQLCipher + L2 field-`[E]` across ALL data; release gate `[ADR-019:22]`.

## Milestone M3.0 — Encryption Pass
| # | ID | Title | Home (ADR) | ← Blocked-by | → Blocks | Prof | Outcome |
|---|----|-------|-----------|--------------|----------|------|---------|
| 72 | ◻AR-3 | Crypto / vault / key-mgmt | `core/src/encryption` (001/002) | ← HARD-4 | DB-5, DB-8b, UX-5b, M3-pass, AR-9b | Backend | vault key model (Argon2id→MK→VK), SRP |
| 73 | ◻DB-5 | Encryption boundary map (`[E]`/SQLCipher) | `core/src/db` (002 §4) | ← AR-3, **all `MOD-*` schemas** | M3-pass | Backend | every `[E]` field mapped |
| 74 | ◻DB-8b | Blind index (keyed BLAKE2b) | `core/src/db` (002) | ← AR-3, DB-8 | leaf | Backend | searchable encrypted fields |
| 75 | ◻UX-5b | Vault-unlock flow | `apps/web/src` (017) | ← AR-3, UX-5 | leaf | Generic | unlock UX (auth-coupled) |
| 76 | ◻M3-pass | SQLCipher activation + guard re-verify + release gate | cross-cutting **[GATE — no file home]** (019 §3.4) | ← AR-3, DB-5, P3-boundary | leaf | Backend | encryption on end-to-end; release gate |

---

# PROJECT M4 — Venues / Multi-Device   *(tier · build-order 4)*
Intent (INT-4): sync → auth → desktop/mobile → self-host → ZK-cloud; needs a 2nd device `[ADR-019:23]`.

## Milestone M4.0 — Venues
| # | ID | Title | ADR | ← Blocked-by | → Blocks | Prof | Outcome |
|---|----|-------|-----|--------------|----------|------|---------|
| 77 | ◻DB-2 | `_sync_*` metadata columns + HLC | 002/003 | ← DB-1 | AR-9b | Backend | sync columns + HLC on syncable tables |
| 78 | ◻AR-9b | Sync engine activation (flush queue; LWW/HLC/Yjs) | 003 | ← AR-9, DB-2, AR-3 | P2-1 | Backend | queue flushes; cross-device merge |
| 79 | ◻P2-1 | Sync / server (Hono/CF Workers, R2 relay) | 003 | ← AR-9b | P2-2, P2-5, P2-6 | Backend | ZK blob relay live · **owns the `@vida/server` test setup** — its vitest currently has 0 test files, so CI's `test` job fails `@vida/server#test` ("No test files found"); P2-1 lands the server + its tests and turns that green *(flagged by QA-1, 2026-08-04)* |
| 80 | ◻P2-2 | ZK notifications Tier-3 | 013 | ← P2-1 | leaf | Backend | push without server-visible content |
| 81 | ◻P2-5 | Self-host | 003 | ← P2-1 | leaf | Backend | self-hostable server |
| 82 | ◻P2-3 | Desktop (Tauri) | 001 | ← HARD-4 | leaf | Generic | desktop shares web codebase |
| 83 | ◻P2-4 | Mobile (Expo) | 001 | ← HARD-4 | leaf | Generic | mobile app + native chrome |
| 84 | ◻P2-6 | ZK-cloud + billing | 003 | ← P2-1 | leaf | Backend | managed ZK cloud + billing |
| 85 | ◻⚠CAP-authoring | User-authored capability safe-authoring surface — sandbox runtime · authoring DSL/UI · grant enforce/re-grant/revoke. ⚠ INTENDED-later: no M1–M4 consumer (first-consumer-pull) → deferred to the tail; the per-platform sandbox rides each venue's pass (ADR-010 §3.6, not a hard blocker) | `core/src/foundation/capability` + per-app sandbox (010/008 · SP4) | ← AR-7, UI-3 | leaf | Backend | user-authored Blocks run sandboxed; grants enforced; consumes `capability_grants` |

---

## 4. The global build order (first → last, fail-proof)
Do issues in ascending `#` (contiguous 1→85, grouped by Milestone in this doc). **Every `←` blocker has a strictly
lower `#` and every `→` block a strictly higher `#`** (proven in §5) — so nothing is ever started before its
dependencies exist; a lower `#` is always safe to start. Independent tracks (DB/AR spine · Design-System DS→UI · UX)
run in parallel — the `#` is one valid linearization, not a claim that #k must finish before #k+1 begins.
**Critical path (a longest chain, the minimum schedule):**
AR-1→DB-1→AR-2→DB-6→AR-6→MOD-notes→MOD-tasks→MOD-projects→MOD-purposes→MOD-gamification→HARD-2→HARD-4→AR-3→DB-5→M3-pass.

## 5. Verification (self-check before the Step-6 gate)
- **Levels unambiguous:** 1 Initiative · 4 Projects · Milestones (M1: M1.0–M1.4; M2/M3/M4: one each) · every Issue under one Milestone. ✅
- **Every Issue has: `#` order · id · title · home · ADR · ← Blocked-by · → Blocks · status · profile · outcome.** ✅
- **Acyclic + no upstream edges (both directions checked):** every `←` id has a strictly lower `#` than the row; every `→` id has a strictly higher `#`. db-10 (#62) ← all `MOD-*` (#31–56). AR-8's `←DB-8` removed. No M1←M3 edge. ✅
- **db-10-proof:** DB-10 Blocked-by enumerates all `MOD-*`; its `#`=62 is after every module (last is #56). ✅
- **Every DF resolved** incl. DF-5 (grain), DF-8 (profile column), DF-10 (the `#` order). ✅

## 6. Re-organization plan for Step 7 projectize (identities preserved — no re-tier, no rename)
This is a **re-organization** of the existing tracker into the correct hierarchy, NOT a re-creation. Nothing that
already exists changes identity:
- **LIF ids: unchanged.** They are the foundation. Every existing issue keeps its LIF number and its established
  slug (AR-*, DB-*, DS-*, UI-*, UX-*, P2-*, P3-*, QA-1, DB-8b, UX-5b, AR-9b). Only the **Project/Milestone homing** is
  corrected. New issues (the `MOD-*` modules, `HARD-*`, `MIG-1`) are the only additions.
- **Re-home, don't recreate:** author `_projects.md` with `## M1..M4` (tier sections, ordered) + their `### Milestones`
  (M1.0…M1.4, M2.0, M3.0, M4.0); set each existing issue's `# Project:` + `# Milestone:` headers to its correct home.
  The 9 shipped issues stay shipped, keep their LIF, and just gain the correct `# Project: M1` / `# Milestone: M1.0`.
- **Task files updated in lockstep:** each `.claude/tasks/*` (+ `archive/*`) gets its `# Project:`/`# Milestone:`
  headers set to the new home so `tracker_sync` resolves every blocker (slug ↔ LIF preserved). Then `tracker_sync --status` must be clean before any live write.
- **Already-tracked hygiene (not new decisions):** the LIF-107/76 AR-5 dedup + archiving the empty ①–⑤ Project shells
  are existing manual-Linear items Victor owns in the Linear UI — carried forward, not re-decided here.
- **Gate:** project-first, relayed approvals (one Project verified in Linear before the next), per the scenario.
