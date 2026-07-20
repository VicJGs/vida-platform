# Vida Platform — Build Roadmap

> **What this is.** The buildable-deliverables map for the whole platform: three phases, each a
> cluster of deliverables that reaches a *visible, usable state*. This document SETS the deliverables;
> it is not a build log. It mirrors into **Linear** (initiative `vida-platform`) as **clusters → Projects**
> and **deliverables → Issues**, so progress is legible and enjoyable.
>
> **Provenance.** Victor's build intent (2026-07-20) patched against the 15 ADRs + 21 documented
> contexts + `docs/core/architecture/module-dependency-graph.md`. Task: `.claude/tasks/build-roadmap.md`.
> Source-of-truth precedence: ADRs + code over architecture docs (`docs/core/business-rules.md`).

---

## The spine — three phases

| Phase | Theme | State reached |
|-------|-------|---------------|
| **Phase 1** | **Local dogfood** — web app on `localhost`, single-user (Victor), built to *complete* | "I open Vida every day on localhost and run my life in it." |
| **Phase 2** | **Venues + first public release** — self-host · mobile · desktop; web-first release | "Others can run it — web, self-hosted, or our ZK cloud; mobile + desktop exist." |
| **Phase 3** | **Personality** — integrations + second-level capability blocks (community layer) | "Vida has its character; the community-facing capability layer is live." |

**Load-bearing architectural fact:** a single-user localhost app needs **no server and no sync**. Sync
(ADR-003: LWW/HLC/Yjs-merge), SRP auth, the blob relay (ADR-013 Tier-3), and mobile/desktop all exist
*because a second device exists* — they **defer wholesale to Phase 2**. Phase 1's only sync obligation is
cheap scaffolding: write `_sync_*` columns + `sync_queue` rows in every transaction, **never flush them**,
so the Phase-2 bolt-on is non-structural.
> **Caveat (not free everywhere):** the `_sync_*` **columns existing** is non-structural, but their **HLC
> encoding** (DB-2) is F10-coupled to the Phase-2 wire header + server `blob_index` (ADR-002 §5.20 / F6-D4-d).
> A wrong local representation chosen now forces a Phase-2 column migration — treat DB-2's HLC-representation
> pick as a *deferred decision*, not a free one.

---

## Cross-cutting principle — the 5-layer Structural Foundation

The layers that "usually get tangled" are pulled out as **first-class upstream clusters**, built once at
the head of Phase 1, so every module downstream is **assembly, not invention**:

**Database Layer · Architecture Layer** (technical substrate) — **Design System · UI · UX** (experience substrate).

They are extended per phase (Phase 2 bolts the sync layer onto Architecture + Database; DS/UI/UX grow), but
the foundation is **laid once**. Build order confirmed: **Database Layer leads**; the technical track (①→②)
is the **critical path** — a ~7–8-hop serial DB→AR chain — while the shorter experience track
(⑤ IA → ③ DS → ④ UI) finishes early and then **blocks on Architecture** (AR-2 adapter, AR-4 state/forms)
before converging at the first module (1a). Resource the DB→AR chain first.

---

## Dependency map (tiered)

| Tier | Phase-1 day-one | Multi-device-only (Phase 2) |
|------|-----------------|------------------------------|
| **Architecture** | crypto/key-mgmt (L1+L2), local SQLite + repository + migrations, Sessions framework (base + local write-guard), Spaces + universal tags, Capability Registry, Measurability (ADR-011) | SRP handshake, sync *reconciliation* (LWW/HLC/Yjs/`effect_event_id`), device mgmt |
| **Engines** | editor, backlinks, search (FTS5), journal aggregation, analytics, export, pomodoro, session/study scheduler, study-method review (SM-2), points economy, neural-graph, **in-app** notifications | **sync engine** (push/pull/transport), ZK notification Tier-3 (cross-device wake-signal) |
| **Foundation modules** | Notes & Pages, Preferences, Spaces, Sessions & Scheduling, Journals | — |
| **Feature modules** | all ~22 (each a local domain; none multi-device-only) | — |
| **Applications** | `@vida/web` + shared packages (types→core→editor→ui) | `@vida/server`, `@vida/mobile`, `@vida/desktop`, self-host, ZK-cloud+billing |

---

# PHASE 1 — Local dogfood

## Phase 1.0 — Structural Foundation

### ① Database Layer  ⟵ LEADS
**Milestone/state:** the full consolidated schema exists in `packages/core`, migrates clean, encrypts/decrypts
per field, and seeds a dogfood vault. This cluster **is** the build-phase schema session that ADR-002 §5.20 defers to.

Deliverable issues:
- **DB-1 · Schema primitives** — Drizzle setup in `packages/core/src/db/schema/`; conventions codified (UUIDv7 PK, unix-ms timestamps, 0/1 booleans, cents money, `YYYY-MM-DD` dates, JSON-as-TEXT).
- **DB-2 · Sync metadata columns** — `_sync_id/_version/_device_id/_lww_ts/_status/_hash` + `_sync_field_ts` on every syncable table (ADR-003 §17); `effect_event_id` + UNIQUE-on-output (ADR-004 F1); HLC representation decision (F6/D4-d). Written, never flushed.
- **DB-3 · Stream (i) consolidation — RETIRE/ADD/AMEND** per §5.20: ADD `sessions` spine + per-type extensions, `planned_blocks`, `applied_effects` (local), `entity_tags`, `spaces`, `space_enabled_blocks`, `views`, capability-registry table, `block_instances`, `templates`, `capability_grants`, `values`, `contributions`, `purpose_reviews`, `plan_steps`, `consequence_ledger`, `currencies`, `store`, `rules`, review-engine tables. RETIRE the 10 superseded (flat study_sessions, flashcard_* , page_tags, xp_history, bare purpose junctions…).
- **DB-4 · Stream (ii) per-domain schema** — one issue per domain group, from the **24** `structure-data.md` docs (incl. sub-contexts `finance/fiscal-legal` · `health/{core,nutrition,training}` · `knowledge/flashcards` · `learning/education`): Notes & Pages · Tasks · Projects · Habits · Routines · Purpose & Goals · Finance (+ Fiscal & Legal tables) · Relationships · Learning/Education · Books · Knowledge · Sessions & Scheduling · Skills · Check-ins · Health (core/nutrition/training) · Preferences · Journals · Pomodoro · Gamification · Notifications · ICS. *(Sub-issue per domain — split from all 24 docs; ADR-002 §5.20 still says "19" → owed doc fix, tracked in DB-11.)*
- **DB-5 · Encryption boundary map** — field-level `[E]` classification wired to `encryptRow`/`decryptRow` (ADR-002 §4); L1 SQLCipher-at-rest config.
- **DB-6 · Repository layer** — typed CRUD + encrypt/decrypt seam + soft-delete (`deleted_at`) + sync-queue write in-txn.
- **DB-7 · Migrations runner** — forward migrations, versioning, dev reset.
- **DB-8 · FTS5** — virtual tables (pages/tasks/contacts/courses + new: `fts_knowledge`) + rebuild-on-unlock; blind index (`category_bidx`, keyed BLAKE2b, F7/D7).
- **DB-9 · Canonical enums & Zod validators** — enum CHECK constraints ↔ Zod validators in `@vida/types` / `@vida/core`.
- **DB-10 · Seed & fixtures** — dogfood seed vault.
- **DB-11 · ADR-002 reconciliation** — rewrite §5, reconcile §7 count + §8 map from the consolidated schema.

### ② Architecture Layer
**State:** the app boots, unlocks a vault, routes, holds state, and every cross-cutting substrate + service exists.
- **AR-1 · Monorepo topology** — Turbo pipeline, tsconfig project refs, package exports (types→core→editor→ui).
- **AR-2 · DatabaseAdapter + web-adapter** — `wa-sqlite` + OPFS + SQLCipher WASM (already partly built); async Drizzle proxy driver.
- **AR-3 · Crypto/vault/key-mgmt** — Argon2id→MasterKey→VaultKey (BLAKE2b), XChaCha20-Poly1305 field enc, unlock + auto-lock flow.
- **AR-4 · State + routing + forms** — Zustand stores, React Query v5 setup, TanStack Router, TanStack Form + Zod.
- **AR-5 · Substrate: Sessions framework** (ADR-004) — session supertype + single-write-path guard + local `applied_effects` dedup.
- **AR-6 · Substrate: Spaces + universal tags** (ADR-006) — `entity_tags`/`entity_links` association engine (sits beneath Notes & Pages).
- **AR-7 · Substrate: Capability/Block Registry** (ADR-008) + measurability (ADR-011) + effect rail (ADR-004/012).
- **AR-8 · Foundation services** — search, backlinks/entity-link resolver, export serializers, analytics primitives, neural-graph data prep. *(Module-owned engines live in their module cluster.)*
- **AR-9 · Sync scaffolding (no-flush)** — offline queue writes wired; sync engine stubbed behind adapter (Phase-2 activates).

### ③ Design System
**State:** a coherent visual language exists as tokens + Tamagui theme + primitive contracts.
- **DS-1 · Token pipeline** — Figma Variables → Tokens Studio → Style Dictionary → CSS vars + Tamagui theme.
- **DS-2 · Foundations** — color · typography · spacing · radius/shadow scales.
- **DS-3 · Motion foundation** — durations/easings + reduced-motion.
- **DS-4 · Tamagui config + dark mode.**
- **DS-5 · Primitive contracts** — Button, Input, Select, Checkbox, Card, Dialog, Popover, Toast, Tabs, Menu (contracts + states).

### ④ UI
**State:** the shared component library + platform views + editor chrome + app shell exist.
- **UI-1 · `@vida/ui` primitives → composites** (from DS).
- **UI-2 · Platform views** — calendar · gallery · list · neural-graph · timeline · pomodoro-widget · export-dialog.
- **UI-3 · `@vida/editor`** — TipTap editor + toolbar + slash-menu + standard blocks + platform blocks (`/summary`, `/tasks`, `/pomodoro`, `/entity-link`, `/backlink`…) + serializers (MD/PDF/DOCX).
- **UI-4 · App shell components** — nav, sidebar, top-bar, command-bar shell, modal/drawer host.

### ⑤ UX
**State:** the information architecture, navigation model, and interaction conventions are set before modules pour in.
- **UX-1 · Information architecture + navigation model** — module map, `nav_preferences`, routing tree.
- **UX-2 · Command bar + search UX** — `command_bar_history`, global search interaction.
- **UX-3 · Shell layout + responsive** — the daily-driver frame.
- **UX-4 · State conventions** — empty/loading/error/skeleton patterns, optimistic updates, keyboard model.
- **UX-5 · Vault-unlock + onboarding flow.**
- **UX-6 · Home = Journal daily dashboard** — the landing experience.

## Phase 1a — First daily use  → *"I use it daily"*
Each module is a cluster; issues at deliverable grain (CRUD + standalone views + notes-page link + analytics where applicable). All six are independently usable with only soft Notes links.
- **Notes & Pages** (foundation hub) · **Preferences** · **Tasks** · **Habits** · **Finance** · **Relationships**

## Phase 1b — Aggregation & foundation modules
- **Sessions & Scheduling** (module surface — planner UI over the AR-5 framework) · **Journals** (daily dashboard + `summary(date)` provider registry + Wrapped review engine) · **Check-ins** · **Spaces** (user-composed surfaces UI over AR-6) · **Pomodoro** (focus session lens).

## Phase 1c — Dependent modules
- **Projects** · **Books** · **Knowledge** (+ study-method review engine, Flashcards service) · **Learning: Education** (+ ICS sync — DEFINED, `ical.js`) · **Routines** (orchestrator) · **Purposes & Goals** (capstone; measurability rollup) · **Gamification** (points economy engine, ADR-012) · **Notifications** (in-app + local OS alerts only).

## Phase 1d — Depth (recovered scope)  → *"Product complete, locally"*
- **Health: Core** · **Health: Training** · **Health: Nutrition** · **Skills** · **Finance → Commitments** · **Projects → Investigations**.

---

# PHASE 2 — Venues + first public release

- **P2-① Sync Engine & Server** — activate sync reconciliation (LWW/HLC/Yjs cross-device merge); `@vida/server` (Hono/CF Workers), SRP auth, R2 blob relay, WebSocket (+ polling), Yjs network provider, device registry (+ `push_token`/`push_platform`).
- **P2-② ZK Notification Delivery** — Tier-3 content-free wake-signal (ADR-013); push vendor + email vendor (see provider-selection).
- **P2-③ Desktop App** — Tauri v2 (shares web), native SQLite+SQLCipher plugin, tray/shortcuts/auto-update/native notifications, packaging (msi/dmg/AppImage).
- **P2-④ Mobile App** — Expo/RN, expo-sqlite+SQLCipher, WebView editor + native chrome bridge, biometric unlock, push, EAS packaging.
- **P2-⑤ Self-Host Packaging** — runtime-agnostic Hono (Node/Bun/Deno) + S3-compatible blob store + self-host guide/config.
- **P2-⑥ ZK-Cloud + Billing** — hosted Cloudflare deploy + `billing.ts` (subscriptions).
- **Milestone: First public web release** — self-host **or** ZK-cloud (ZK-cloud = perk, not headline).

---

# PHASE 3 — Personality

- **P3-① Provider-Selection Pass** ⟵ head deliverable — choose the ~16 undefined vendors/methods (see register) before building any integration.
- **P3-② Integrations — Financial** — CSV/OFX parser (near-term unblocked), bank/broker aggregator, live prices/FX (with the per-item leak decision: whole-index pull / OHTTP / PIR).
- **P3-③ Integrations — Health & Wearables** — Apple Health / Google Health Connect / BLE; food-composition DB + barcode; medical egress guard.
- **P3-④ Integrations — AI/LLM** — `askModel` mediator runtime, on-device model, BYO-cloud providers, OCR/TTS (books, meal-photo, doc extraction).
- **P3-⑤ Integrations — Fiscal rule-packs** — dataset source + mirror/CDN + provenance/signature/version verification.
- **P3-⑥ Integrations — Calendar & Extraction** — advanced ICS, syllabus/schedule document extraction, user-managed webhooks + cookbooks (ADR-014 L3).
- **P3-⑦ Second-level Capability Blocks** — the community "personality" block layer + curated Role/exercise/skill libraries.

---

## Integration register (Victor's flag — quantified)

22 integrations · **6 DEFINED** · **16 UNDEFINED provider** (by design — ADR-014/015 lock the ZK model, punt vendor to build-phase).

**DEFINED:** ICS (`ical.js`) · Markdown export (custom serializer) · PDF (`@react-pdf/renderer` / `expo-print`) · DOCX (`docx`) · local OS alerts (Expo/Tauri) · in-app notifications (local).

**UNDEFINED (→ Phase 3 provider-selection):** bank CSV/OFX parser · bank aggregator · prices/FX source · fiscal rule-packs · Apple/Google Health SDK+BLE · medical egress standard · food DB · barcode lib · meal-photo vision · book OCR/TTS · AI runtime + cloud providers · push vendor · email/SMTP · user-webhook surface · curated content libraries · doc extraction engine.

---

## Linear mapping

- **Initiative:** `vida-platform` (tracker.json → workstation `personal`).
- **Cluster → Linear Project.** Phase 1.0: ①–⑤. Each Phase-1 module = its own Project. Phase 2: P2-①…⑥. Phase 3: P3-①…⑦.
- **Deliverable → Issue.** Issues at deliverable grain now; component/file sub-issues added when a cluster's phase begins.
- **Ordering enforced via Linear:** Database Layer first; foundation (1.0) blocks modules (1a); phases are sequential milestones.
- Push via `/track-sync` — creating each Project is **gated** (per-cluster `--approve-cluster`).

## Sequencing rules
1. **①→② before any module.** DS→UI before module screens. UX/IA before module navigation.
2. **Notes & Pages before everything** that stores notes (in-degree 14).
3. **Foundation modules** (Spaces, Sessions, Journals, Preferences) before their consumers.
4. **Capstone last within Phase 1** — Purposes & Goals rolls up every measured module; Notifications is the dead-last leaf.
5. **No server work until Phase 2.** No integration provider chosen until Phase 3 head.

## Doc-hygiene backlog (fold into P3 or opportunistically)
- Fill `docs/platform/{web,mobile,desktop}-app-spec.md` (0-byte stubs).
- Fill `docs/editor/serialization-spec.md` (0-byte stub).
- Refresh `docs/core/architecture/module-dependency-graph.md` (stale — predates ADR-004–013).
