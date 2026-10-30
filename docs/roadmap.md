# Vida Platform — Build Roadmap

> **What this is.** The buildable-deliverables map for the whole platform, sequenced **features-first**: four
> milestones (M1→M4), each reaching a _visible, usable state_. This document SETS the deliverables; it is not a
> build log. It mirrors into **Linear** (initiative `vida-platform`) as **clusters → Projects** and
> **deliverables → Issues**.
>
> **Provenance.** Victor's build intent (2026-07-20) + the features-first resequence (2026-07-25), patched
> against the **19 ADRs (001–019)** + **24 documented contexts** (`structure-data.md`) +
> `docs/core/architecture/module-dependency-graph.md`. The structure is the **ADR-018** `foundation/`+`services/`
> homes; the sequence is **ADR-017** (features-first) as refined by **ADR-019** (M1→M4).
> Source-of-truth precedence: ADRs + code over architecture docs
> (`docs/core/business-rules.md`).

---

## The spine — four milestones (features-first)

| Milestone | Theme                                                                                                                 | State reached                                                     |
| --------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **M1**    | **Whole OS, manual, internally integrated** — every module + the connective layer, on `localhost`, unencrypted        | "I open Vida daily on localhost and run my life in it — by hand." |
| **M2**    | **External integrations + security boundary** — third-party data feeds, co-built with the ADR-014/015 ingestion guard | "External data flows in — I stop doing everything by hand."       |
| **M3**    | **Whole-OS encryption pass** — L1 SQLCipher + L2 field-level `[E]` across everything; the release gate                | "It's encrypted end-to-end; safe to share."                       |
| **M4**    | **Venues / multi-device** — sync, auth, desktop, mobile, self-host, ZK-cloud                                          | "It runs everywhere — web, desktop, mobile, self-host, cloud."    |

**The resequence (ADR-017 + ADR-019).** The earlier plan built the full substrate + crypto _before_ the product
was usable. This inverts it: build the **Real Product** ("RP") features-first, with **encryption / sync / auth off
but seam-ready**, schema authored **per-feature** (ADR-016) onto the ADR-018 homes. Encryption, sync, and auth are
**deferred, not dropped** — their seams exist in code and are exercised in the intended order later.

**Load-bearing fact:** a single-user localhost app needs **no server and no sync**. Sync (ADR-003 LWW/HLC/Yjs),
SRP auth, and the blob relay exist _because a second device exists_ — they defer wholesale to **M4**. M1's only
sync obligation is cheap scaffolding: write `_sync_*` columns + `sync_queue` rows, **never flush them**.

> **Caveat (not free):** the `_sync_*` **columns existing** is non-structural, but their **HLC encoding** (DB-2) is
> coupled to the M4 wire header (ADR-002 §5.20). Treat the local HLC-representation pick as a _deferred decision_ —
> a wrong choice now forces an M4 column migration.

**The one accepted tradeoff (ADR-019 §3.4).** Between M2 and M3, sensitive external data sits **unencrypted at
rest on localhost**. This is safe for solo-localhost (no server exists to leak to until M4 — the zero-knowledge
guarantee ZK-1 is a _server_-blindness property enforced by L3/sync). The hard line: **encryption (M3) + integration
re-verification must complete before the product reaches any other user.** Integrations are built _against_ the
encryption seam + ingestion guard so M3 is a verified flip, not a retrofit.

---

## Cross-cutting principle — substrates by first-consumer pull

The old plan built a monolithic "5-layer Structural Foundation" up front. Features-first inverts this: the shared
**foundation substrates** (Sessions · Spaces/`entity_tags` · Capability · Measurability · Economy · Views ·
Review-engine · Effects) still exist once and are **changed once** (ADR-018 `foundation/`) — but each lands **when
its first consuming module needs it**, not ahead of the product. The hub modules (Notes & Pages, Journals) consume
most substrates early, so the connective layer forms at the head of M1 by _pull_, not by _upfront decree_. A
substrate no M1 module consumes is not built in M1.

**Module-owned engines stay in their module** (not promoted to substrates): `summary(date)` journal aggregation ∈
`services/journals/`; the study/review engine ∈ `services/knowledge/`; per-module analytics ∈ each module.

---

## Dependency map (the hard edges)

1. **Boot base (M1.0) before any module.** DS→UI before screens; UX/IA before navigation.
2. **Notes & Pages before everything that stores notes** (in-degree 14).
3. **Foundation substrates before their consumers** — built once (`foundation/`), consumed platform-wide.
4. **Foundation modules** (Notes, Preferences, Journals, Spaces, Sessions) before feature modules.
5. **Capstones last in M1** — Purposes & Goals (rolls up every measured module) → Gamification (economy surface) →
   Notifications (dead-last leaf).
6. **M2 needs M1 complete**; **provider-selection is M2's head** (choose vendors before building integrations).
7. **M3 needs M2** (encrypt the integration data too) and **gates release**.
8. **M4 needs M3** — encryption beneath sync; ADR-017 hardening order encryption → sync → auth.

---

# M1 — Whole OS (localhost · manual · internally integrated · unencrypted)

> **Done when:** every module is manually operable **and** the OS is internally coherent — the Notes & Journals
> daily dashboard, cross-module `summary(date)` aggregation, entity-linking/backlinks, and measurability/economy
> rollups all work. Encryption/sync/auth off (seam pass-through). Data entered by hand.

## M1.0 — Boot & connective base

> ✅ **CLOSED (2026-08-21)** — all build heads #1–30 **and** the schema foundation are done: DB-3 (substrate,
> 11 §5.20 Stream (i) tables, LIF-65 PR #31) + DB-4 (per-domain, all 21 active groups, migrations 012–032 v32,
> LIF-66 PR #32). Both verified _truly delivered_ via a Phase-0 delivery-truth gate (against the §5.20 ledger +
> the `structure-data.md` floors — not census alignment; the 2026-08-17 premature-close mode is retired). Modules
> build service+UI on the finished schema, do not author it. **M1.0 CLOSED → M1.1 opens** (head MOD-notes #31).

The thinnest foundation the first modules need (grown per module, not all-upfront):

- **AR-1 · Monorepo topology** — Turbo pipeline, tsconfig refs, package exports (types→core→editor→ui). _(done)_
- **AR-2 · DatabaseAdapter + web-adapter** — `wa-sqlite` + OPFS; async Drizzle proxy driver. _(rebuild the web-adapter — quarantined to `Old/` in Part 2, ADR-018.)_ **SQLCipher WASM + encryption → M3.**
- **AR-4 · State + routing + forms** — Zustand, React Query v5, TanStack Router, TanStack Form + Zod.
- **DB spine** — **DB-1** schema primitives _(done)_ · **DB-6** repository (encrypt/decrypt **seam**, pass-through) · **DB-7** migrations runner _(present; per-feature)_ · **DB-9** canonical enums + Zod · **DB-10** dogfood seed vault. Schema authored hand-written per ADR-016 into `db/schema/<domain>.ts`. **⚠ Model B — schema is the deliberate exception to "grown per module" above (decided 2026-08-18):** **DB-3** (stream-(i) substrate) then **DB-4** (stream-(ii) per-domain) are authored as **gated foundation build heads BEFORE M1.1** — the full schema is finished upfront so M1.1+ modules build service + UI on it and author no schema. _(Supersedes the earlier "streaming / per-module / not upfront" model.)_
- **Connective substrates** (`foundation/`, ADR-018 — pulled by the hubs): **AR-5** Sessions base · **AR-6** Spaces + `entity_tags`/`entity_links` + backlinks · **AR-7** Capability registry + measurability (ADR-011) + effect rail (ADR-004/012) · **Views** (ADR-007).
- **AR-8 · Foundation services** (cross-cutting only, `services/*`): search + **DB-8** FTS5, backlink resolver, export serializers, neural-graph data-prep. _(Module-owned engines live in their module.)_
- **AR-9 · Sync scaffolding (no-flush)** — **DB-2** `_sync_*` metadata columns + `sync_queue` writes wired (written-never-flushed; HLC encoding = deferred decision, see caveat); engine stubbed (M4 activates).
- **Design System** — **DS-1** token pipeline · **DS-2** foundations · **DS-3** motion · **DS-4** Tamagui + dark mode · **DS-5** primitive contracts.
- **UI** — **UI-1** primitives→composites · **UI-2** platform views (calendar/gallery/list/neural-graph/timeline/pomodoro-widget/export-dialog) · **UI-3** `@vida/editor` (TipTap + toolbar + slash-menu + blocks + serializers MD/PDF/DOCX) · **UI-4** app shell (nav/sidebar/top-bar/command-bar/modal host).
- **UX** — **UX-1** IA + nav model · **UX-2** command bar + search UX · **UX-3** shell layout + responsive · **UX-4** state conventions (empty/loading/error/optimistic/keyboard) · **UX-5** onboarding (basic first-run) · **UX-6** Home = Journal daily dashboard. _(**UX-5b** vault-unlock → M3/M4, auth-coupled.)_

## M1.1 — Hub + foundation modules

**Notes & Pages** (in-degree-14 hub — first) → **Preferences** → **Journals** (daily dashboard) → **Spaces** (surfaces over AR-6) → **Sessions & Scheduling** (planner over AR-5; **Pomodoro** is a `sessions` sub-type here, ADR-004 — not a standalone module) → **Check-ins**.

## M1.2 — Feature modules

**Tasks · Habits · Finance · Relationships** → **Projects · Books · Knowledge** (+ study-method review engine, Flashcards service) · **Learning: Education** (ICS _module surface_ — the live feed is M2) · **Routines** · **Purposes & Goals** (measurability capstone) · **Gamification** (points-economy engine, ADR-012) · **Notifications** (in-app + local OS alerts only).

## M1.3 — Depth (recovered scope)

**Health: Core · Health: Training · Health: Nutrition · Skills · Finance → Commitments · Projects → Investigations.**

## M1.4 — Internal-integration hardening (makes it _viable daily_)

The **Journals-module-owned** `summary(date)` provider registry fully wired to read every module; measurability/
economy rollups live; neural-graph + backlinks complete; polish. → **M1 done.**

- **DB-11 · ADR-002 reconciliation** (M1 tail) — rewrite §5, reconcile §7 count + §8 map from the per-feature schema.

---

# M2 — External integrations + security boundary

> **Done when:** the OS ingests external data through the ADR-014/015 guard, built _against_ the encryption seam.
> Head deliverable is provider-selection — choose the ~16 undefined vendors before building any integration.

- **P3-① · Provider-Selection Pass** ⟵ head — choose vendors/methods (see register) before building.
- **P3-② · Integrations — Financial** — CSV/OFX parser (near-term unblocked), bank/broker aggregator, live prices/FX (with the per-item leak decision: whole-index pull / OHTTP / PIR).
- **P3-③ · Integrations — Health & Wearables** — Apple Health / Google Health Connect / BLE; food-composition DB + barcode; medical egress guard.
- **P3-④ · Integrations — AI/LLM** — `askModel` mediator runtime, on-device model, BYO-cloud providers, OCR/TTS.
- **P3-⑤ · Integrations — Fiscal rule-packs** — dataset source + mirror/CDN + provenance/signature/version.
- **P3-⑥ · Integrations — Calendar & Extraction** — live ICS feed (`ical.js`), syllabus/schedule extraction, user-managed webhooks + cookbooks (ADR-014 L3).
- **The security boundary is co-built here** (ADR-014/015): device-mediated ingestion, `external_in_ok`/`external_out_ok` grants, the egress guard, the leak decisions. Built against the pass-through seam so M3 is a verified flip.

**Integration register** — 22 integrations · **6 DEFINED** · **16 UNDEFINED provider** (ADR-014/015 lock the ZK model; vendor punted to provider-selection).

- **DEFINED:** ICS (`ical.js`) · Markdown export · PDF (`@react-pdf/renderer`/`expo-print`) · DOCX (`docx`) · local OS alerts (Expo/Tauri) · in-app notifications (local).
- **UNDEFINED (→ P3-①):** bank CSV/OFX · bank aggregator · prices/FX · fiscal rule-packs · Apple/Google Health SDK+BLE · medical egress standard · food DB · barcode · meal-photo vision · book OCR/TTS · AI runtime + cloud providers · push vendor · email/SMTP · user-webhook surface · curated content libraries · doc extraction engine.

---

# M3 — Whole-OS encryption pass (the release gate)

> **Done when:** all data (manual + integration) is encrypted at rest and the ingestion guard is verified live.
> **This gates any release beyond solo-localhost** (ADR-019 §3.4).

- **AR-3 · Crypto/vault/key-mgmt** — Argon2id→MasterKey→VaultKey (BLAKE2b), XChaCha20-Poly1305 field enc, unlock + auto-lock.
- **DB-5 · Encryption boundary map** — field-level `[E]` classification wired to `encryptRow`/`decryptRow` (ADR-002 §4); L1 SQLCipher-at-rest config (incl. the SQLCipher-WASM web build, re-verified current).
- **DB-8b · Blind index** — `category_bidx` (keyed BLAKE2b, F7/D7) — keyed, so it lands with the encryption key.
- **UX-5b · Vault-unlock flow** — the unlock/lock experience (auth-coupled).
- **Ingestion-guard re-verification** — re-confirm every M2 integration + leak decision against the now-live boundary.
- **Tradeoff + release gate (ADR-019 §3.4):** the M2→M3 plaintext-at-rest window is solo-localhost only; encryption + re-verification complete **before** any other user.

---

# M4 — Venues / multi-device

> **Done when:** the product runs on more than one device / venue. Needs encryption beneath it (M3).

- **P2-① · Sync Engine & Server** — activate sync reconciliation (LWW/HLC/Yjs); `@vida/server` (Hono/CF Workers), SRP auth, R2 blob relay, WebSocket (+ polling), Yjs provider, device registry.
- **P2-② · ZK Notification Delivery** — Tier-3 content-free wake-signal (ADR-013); push + email vendors.
- **P2-③ · Desktop App** — Tauri v2 (shares web), native SQLite+SQLCipher, tray/shortcuts/auto-update, packaging.
- **P2-④ · Mobile App** — Expo/RN, expo-sqlite+SQLCipher, WebView editor + native chrome, biometric unlock, push, EAS.
- **P2-⑤ · Self-Host Packaging** — runtime-agnostic Hono + S3-compatible blob store + self-host guide.
- **P2-⑥ · ZK-Cloud + Billing** — hosted Cloudflare deploy + `billing.ts`.
- **P2-⑦ · Design-System Figma community file (MCP-scripter bridge)** — the shareable, community-forkable Figma
  file for DS/UI/UX, built as a faithful reflection of the shipped code-first design system, synced via \*\*Figma MCP
  - a custom scripter + docs\** (NOT Tokens Studio). Deferred to release because it documents the *finished* product
    for users to build with. Deps: ← DS-2…DS-5 (design system) + UI-* (products exist to document). `[DIRECTION:
Victor 2026-08-03 — release-gated; see docs/ui/token-pipeline/current-spec.md §0]`
- **Milestone: first public release** — self-host **or** ZK-cloud (ZK-cloud = perk, not headline).

## Post-M4 — Personality

- **P3-⑦ · Second-level Capability Blocks** — the community "personality" block layer + curated Role/exercise/skill libraries.

---

## Housekeeping (doc-hygiene backlog — dispositioned, not dropped)

- `docs/core/architecture/module-dependency-graph.md` refresh — **done** (Part 1.3 realignment).
- `docs/platform/{web,mobile,desktop}-app-spec.md` (0-byte stubs) — fill in **M4** (they spec the platform apps).
- `docs/editor/serialization-spec.md` (0-byte stub) — fill in **M1** (editor, UI-3).

---

## Linear mapping

- **Initiative:** `vida-platform` (tracker.json → workstation `personal`).
- **Cluster → Linear Project.** M1: `M1.0 Boot & Connective Base` + a Project per module wave. M2: `Provider Selection` + per-integration-family. M3: `Whole-OS Encryption & Security Pass`. M4: `Sync Engine & Server`, `Desktop`, `Mobile`, `Self-Host`, `ZK-Cloud + Billing`.
- **Deliverable → Issue**, at deliverable grain.
- **Re-projectize is gated (U3, deferred):** the old 35 Phase-1.0 issues (LIF-61…95) were sequenced substrate-first; they are **re-scoped/re-ordered per this map, not duplicated** — pushed via `/track-sync --approve-cluster`, one cluster at a time with explicit sign-off. The old→new mapping is authored before any push.

## Sequencing rules

1. **M1.0 boot base before any module.** DS→UI before screens. UX/IA before navigation.
2. **Notes & Pages before everything** that stores notes (in-degree 14).
3. **Foundation modules** (Spaces, Sessions, Journals, Preferences) before their consumers.
4. **Capstones last in M1** — Purposes & Goals → Gamification → Notifications (dead-last leaf).
5. **No external integration until M2** (provider-selection first). **No encryption-at-rest flip until M3** (but built-against-seam throughout M2). **No server/multi-device until M4.**
