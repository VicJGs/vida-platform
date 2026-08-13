# Part 3 — Build Roadmap Resequence (gate-1 PLAN)

**Type:** planning (foundation) — the Part-3 gate-1 forward spec. This is the **SPEC (gate 1)**: the re-sequence thesis + milestone spine + Deliverable-1 build order + dependency map + cluster decomposition + decisions. The `docs/roadmap.md` **rewrite** + the Linear projectize are the gate-2 execution, after Approval 1.
**Status:** 🟢 **Approved 1 (Victor 2026-07-25). Gate 2: ADR-019 + IMPLEMENTATION-PLAN authored, critique + preflight folded — awaiting Approval 2.** No file is rewritten and no tracker is touched until Approval 2.
**Date:** 2026-07-25 · **Task:** build-roadmap-resequence (foundation-realignment campaign) · **Part:** 3 of 3 (the original task; campaign-closing)
**Scenario:** Build Roadmap (forward-declared; runs its own gate-1 + gate-2 + exit gate).
**Grounded in (No-Guessing inputs):**
- `docs/roadmap.md` — the existing (pre-ADR-017) build roadmap this part re-sequences (3 phases; Phase-1.0 substrate-first).
- `ADR-017` (features-first; encryption/sync/auth → hardening) · `ADR-016` (per-feature schema) · `ADR-018` (the `foundation/`+`services/` homes) · `ADR-014`/`ADR-015` (ingestion/AI = the security boundary) · `ADR-002 §4` (the encryption boundary).
- `docs/core/architecture/module-dependency-graph.md` — the realigned substrate/module dependency truth.
- **Victor's confirmed build cut (2026-07-25)** — see §1.
**No-Guessing:** `[FACT: cite]` / `[DERIVED: from doc]` / `[DECISION: Victor]` / `[PROPOSAL: for the roadmap rewrite]` / `[UNKNOWN]`.

---

## §0. Thesis

The existing `docs/roadmap.md` is sound in spine (3 phases) but built on the **pre-ADR-017 substrate-first order** — its Phase 1.0 front-loads the full consolidated schema (DB-1…11), crypto/vault (AR-3), and the encryption boundary (DB-5) *before* the product is usable `[FACT: roadmap §63-92]`. Part 3 re-sequences it **features-first** per ADR-017 and per Victor's confirmed cut: build the **whole OS, manually operable and fully integrated internally, unencrypted** first; then **external integrations co-built with their security boundary**; then the **whole-OS encryption pass**; then **venues/multi-device release**. Each is a milestone-gated build process. The output is a rewritten `docs/roadmap.md` + a re-projectized Linear tree.

---

## §1. The confirmed build cut `[DECISION: Victor, 2026-07-25]`

**"RP" = Real Product** — ship the actual usable product features-first, not a throwaway (ADR-017 §4 "the feature-phase build is the real product"). The milestone spine:

```
M1  WHOLE OS (localhost, manual, fully integrated INTERNALLY, unencrypted)
      all modules + the internal connective layer: Notes & Journals daily dashboard,
      cross-module summary(date) aggregation, entity-linking/backlinks, measurability/
      economy rollups, polish. Data entered BY HAND. Encryption/sync/auth OFF (seam pass-through).
        ↓
M2  EXTERNAL INTEGRATIONS + SECURITY BOUNDARY  (co-built — they are one design surface)
      the integration layer (bank CSV/OFX, ICS, AI/LLM, health/wearables, food DBs, …) built
      TOGETHER WITH the ADR-014/015 ingestion guard (external_in/out_ok grants, leak decisions).
      Built AGAINST the encryption seam so the flip is verified, not a retrofit.
        ↓
M3  WHOLE-OS ENCRYPTION PASS  (the hardening-at-rest)
      turn on [E] field encryption + SQLCipher across ALL data (manual + integration); finalize
      DB-5 boundary; re-verify the ingestion guard + leak decisions live. → first release possible.
        ↓
M4  VENUES / MULTI-DEVICE  (sync → auth → desktop/mobile → self-host → ZK-cloud)
      old roadmap Phase 2. Needs sync (ADR-003) which needs a 2nd device. Release-adjacent.
```

**Two sequencing decisions this cut makes** (both refine ADR-017, to be recorded — §6):
1. **Internal integration layer is part of M1** (the Real Product is coherent, not a pile of CRUD) — only *external* integrations defer.
2. **External integrations (M2) precede whole-OS encryption (M3)** — for localhost dogfood — but are **built against the seam + ingestion guard**, and encryption **must land before any release to another user**.

**The accepted tradeoff `[FACT: ADR-017 §4-5]`:** between M2 and M3 sensitive external data sits unencrypted locally. Fine for solo-localhost (Victor's machine); the hard line is encryption + integration re-verification **before release** (M3 gates the release boundary).

---

## §2. How the cut re-sequences the existing roadmap `[DERIVED]`

| Old roadmap element | Old placement | New placement (this cut) | Why |
|---|---|---|---|
| Full schema campaign DB-1…DB-11 | Phase 1.0 ① (upfront) | **per-feature within M1** | ADR-016 — schema authored as each module is built, onto ADR-018 `db/schema/<domain>.ts` |
| AR-3 crypto/vault, DB-5 encryption boundary | Phase 1.0 ②/① (upfront) | **M3** (whole-OS pass) | ADR-017 — encryption is deferred hardening |
| AR-9 sync scaffolding (no-flush) | Phase 1.0 ② | **M1 (columns only) → M4 (activate)** | ADR-017 — `_sync_*` written-never-flushed; HLC encoding deferred |
| Substrates AR-5/6/7 (sessions/spaces/capability/measurability/economy/views) | Phase 1.0 ② | **M1** (needed for internal integration) | the connective layer requires them; homed in `foundation/` (ADR-018) |
| DS/UI/UX ③④⑤ | Phase 1.0 | **M1** (minimal-first, grown per module) | features-first: build the shell + primitives a slice needs, grow per module |
| Modules 1a–1d (all ~22) | Phase 1a–1d | **M1** (features-first order, §3) | the whole OS at manual depth |
| Phase 3 external integrations (P3-②…⑥) | Phase 3 (last) | **M2** (pulled earlier, pre-encryption) | Victor's cut — establish integrations for localhost before release |
| Phase 3 provider-selection (P3-①) | Phase 3 head | **M2 head** | choose the ~16 undefined vendors before building integrations |
| Phase 2 venues (sync/server/mobile/desktop/self-host/cloud) | Phase 2 | **M4** | multi-device needs sync (needs a 2nd device); release-adjacent |
| P3-⑦ 2nd-level capability blocks (community) | Phase 3 | **post-M4** (personality) | unchanged tail |

**Net:** the old "Phase 1.0 substrate-first → modules → Phase 2 venues → Phase 3 integrations" becomes **M1 whole-OS-features-first → M2 integrations+boundary → M3 encryption → M4 venues**, with schema per-feature and crypto deferred.

### §2.1 Per-deliverable ledger — every old-roadmap ID → M-home `[FACT: roadmap.md; B1 fix — line-per-deliverable so §8 "none dropped" is checkable]`

| ID | Deliverable | M-home | Note |
|----|-------------|:------:|------|
| DB-1 | Schema primitives | M1 | ✓ done (`db/schema/`) |
| DB-2 | Sync metadata columns | M1 (cols) | written-never-flushed; **HLC-encoding is a *deferred decision*** (roadmap §27-30) — the M1 author must not pick a local HLC representation that forces an M4 migration |
| DB-3 | Stream-(i) consolidation (substrate tables) | M1 | authored **per-substrate** as `foundation/` lands (not one upfront campaign) |
| DB-4 | Stream-(ii) per-domain schema | M1 | authored **per-module** (`db/schema/<domain>.ts`, ADR-016) |
| DB-5 | Encryption boundary map (`[E]`/SQLCipher) | **M3** | the encryption-at-rest flip |
| DB-6 | Repository layer | M1 | encrypt/decrypt **seam** present, pass-through |
| DB-7 | Migrations runner | M1 | ✓ present (unwired; per-feature) |
| DB-8 | FTS5 tables | M1 | search is an M1 foundation service |
| DB-8b | **Blind index** (`category_bidx`, keyed BLAKE2b, F7/D7) | **M3** | keyed → needs the encryption key; splits from FTS5 |
| DB-9 | Canonical enums & Zod | M1 | |
| DB-10 | **Seed & dogfood vault** | M1 | needed to dogfood the OS (M1 is the dogfood target) |
| DB-11 | ADR-002 §5/§7/§8 reconciliation | M1 (tail) | doc reconciliation once the per-feature schema is authored |
| AR-1 | Monorepo topology | M1 | ✓ |
| AR-2 | DatabaseAdapter + web-adapter | M1 | **rebuild web-adapter** (quarantined to `Old/` in Part 2) |
| AR-3 | Crypto/vault/key-mgmt | **M3** | |
| AR-4 | State + routing + forms | M1 | |
| AR-5 | Sessions substrate | M1 | `foundation/sessions/` |
| AR-6 | Spaces + universal tags | M1 | `foundation/spaces/` |
| AR-7 | Capability/registry + measurability + effect rail | M1 | `foundation/{capability,measurement,economy,effects}/` |
| AR-8 | Foundation services (search/FTS5, backlink resolver, export serializers, neural-graph **data-prep**) | M1 | **cross-cutting only** — module-owned engines (`summary(date)`, study/review) live in their module, NOT here (roadmap §91; B2) |
| AR-9 | Sync scaffolding (no-flush) | M1 (queue writes) → **M4** (activate) | |
| DS-1…5 | Design System | M1 | minimal-first, grown per module |
| UI-1…4 | UI library / views / editor / shell | M1 | |
| UX-1 IA/nav · UX-2 command bar · UX-3 shell · UX-4 state conventions · UX-6 home=Journal | M1 | |
| UX-5 | Onboarding (basic) | M1 | the first-run flow |
| UX-5b | **Vault-unlock** flow | **M3/M4** | auth-coupled (ADR-017: no vault-unlock in the feature phase) — lands with encryption (M3) / auth (M4) |
| Modules 1a–1d (~25 line-items) | Notes…Skills | M1 | features-first order — §3. **Pomodoro folds into Sessions & Scheduling** as a `sessions` sub-type (ADR-004), not a standalone module (B3). Spaces is its own M1.1 module surface over AR-6. |
| P2-①…⑥ | Sync/server · ZK-notify Tier-3 · desktop · mobile · self-host · ZK-cloud+billing | **M4** | multi-device/venues |
| P3-① | Provider-selection | **M2** (head) | choose the 16 undefined vendors before building |
| P3-②…⑥ | Financial · Health/wearables · AI/LLM · fiscal rule-packs · calendar/extraction integrations | **M2** | co-built with the ingestion guard |
| P3-⑦ | 2nd-level capability blocks (community) | **post-M4** | personality tail (unchanged) |
| Doc-hygiene backlog (roadmap §182-186) | app-spec stubs · serialization-spec · dep-graph refresh | **split** | `module-dependency-graph.md` refresh = **already done** (Part 1.3); `docs/platform/{web,mobile,desktop}-app-spec.md` → **M4**; `docs/editor/serialization-spec.md` → **M1** (editor). Carried as a "Housekeeping" tail — not dropped (B1). |

**Integration register** (roadmap §159-163): 6 DEFINED + 16 UNDEFINED providers → all M2, gated behind P3-① provider-selection. **ICS wrinkle:** the *Learning/Education module surface* (schedule views over stored events) is **M1**; the *live external ICS feed* (`ical.js` pulling a remote calendar) is **M2** — the internal/external line (§R4).

---

## §3. M1 internal build order (features-first) `[DERIVED from roadmap sequencing rules + module-dependency-graph]`

Features-first does **not** mean "no foundation" — it means build the **thinnest foundation each slice needs, then grow it**. M1's irreducible base then module waves:

**M1.0 — Boot & connective base** (the minimum before any module screen):
- App boot (an **unordered surface list, NOT a build sequence** — build order is `reconstructed-structure.md`'s `#`
  column + `m1.0-delivery-plan.md`; this line lists UI-4 before UI-3 and DS-1…5 after UI-4, yet the real order is
  UI-3 `#29` → UI-4 `#30` and DS-5 precedes UI-4 — see `docs/specs/fixes/ui-3-ui-4-ordering-reconcile/`):
  monorepo/turbo (AR-1 ✓), **DatabaseAdapter + web-adapter rebuilt** (AR-2 — note: v1 web-adapter was quarantined to `Old/` in Part 2, rebuilt here), state/routing/forms (AR-4), app shell (UI-4), IA/nav (UX-1), DS tokens+primitives (DS-1…5), TipTap editor (UI-3).
- DB spine: per-feature schema pattern onto `db/schema/` (DB-1 ✓ primitives), repository (DB-6), migrations runner (DB-7 ✓ unwired — repopulated per-feature), enums/Zod (DB-9). **No encryption (DB-5 → M3); `_sync_*` written-never-flushed.**
- Connective substrates (homed in `foundation/`, ADR-018) — the internal-integration layer requires them, and the **hub modules (Notes, Journals) are their first consumers**, so they land at the head of M1 by first-consumer pull, not "substrate-first regardless" (N1): spaces + `entity_tags` (AR-6), `entity_links`/backlinks, sessions base (AR-5), capability registry (AR-7), measurability (ADR-011), economy (ADR-012), views (ADR-007). A substrate no M1 module consumes is **not** built in M1.
- Cross-cutting foundation services (AR-8, `services/{search,export,…}` — NOT `foundation/`): search/FTS5, backlink resolver, export serializers, neural-graph **data-prep**. **Module-owned engines stay in their module** (roadmap §91, B2): `summary(date)` journal aggregation ∈ `services/journals/`; study/review engine ∈ `services/knowledge/`; per-module analytics ∈ each module — they are **not** promoted to substrates.

**M1.1 — Hub + foundation modules:** **Notes & Pages** (in-degree-14 hub — first) → **Preferences** → **Journals** (the daily dashboard — the connective centerpiece) → **Spaces**, **Sessions & Scheduling**, **Check-ins**.

**M1.2 — Feature modules:** **Tasks · Habits · Finance · Relationships** (the roadmap's 1a set) → **Projects · Books · Knowledge (+ review engine) · Learning/Education · Routines · Purposes & Goals (measurability capstone) · Gamification (economy engine) · Notifications (in-app/local only)** (1c).

**M1.3 — Depth (recovered scope):** **Health {core/nutrition/training} · Skills · Finance→Commitments · Projects→Investigations** (1d).

**M1.4 — Internal integration hardening** (makes it *viable daily*, per Victor's cut): the **Journals-module-owned** `summary(date)` provider registry (B2 — module-owned, not a substrate) fully wired to read from every module, measurability/economy rollups live, neural-graph/backlinks complete, polish. → **M1 done = "the whole OS is manually operable + internally coherent on localhost."**

> Each module = a vertical slice: its `db/schema/<domain>.ts` + `services/<domain>/` logic + `@vida/ui` screens + its Notes-page link + analytics. Substrate is pulled in when the first consuming module needs it, not before.

---

## §4. Dependency map (the hard edges) `[DERIVED: roadmap §175-181 + module-dependency-graph]`

1. **Boot base (M1.0) before any module.** DS→UI before screens; UX/IA before navigation.
2. **Notes & Pages before everything that stores notes** (in-degree 14).
3. **Foundation substrates before their consumers:** spaces/`entity_tags`, sessions, measurability, economy, views are consumed platform-wide — build once (`foundation/`), changed once.
4. **Foundation modules** (Notes, Preferences, Journals, Spaces, Sessions) before feature modules.
5. **Capstones last in M1:** Purposes & Goals (rolls up every measured module) → Gamification (economy surface) → Notifications (dead-last leaf).
6. **M2 needs M1 complete** (integrations feed into working modules). **Provider-selection is M2's head** (choose vendors before building).
7. **M3 needs M2** (encrypt the integration data too) and **gates release**.
8. **M4 (sync) needs M3** (encryption before multi-device) — ADR-017 hardening order encryption → sync → auth.

---

## §5. Cluster decomposition → Linear `[PROPOSAL]`

Re-projectize per the roadmap's mapping (cluster→Project, deliverable→Issue), re-sequenced:
- **M1** → Projects: `M1.0 Boot & Connective Base`, then one Project per module wave (or per module for the hubs). Issues at deliverable grain (per-module: schema · service · screens · notes-link · analytics).
- **M2** → Projects: `Provider Selection`, then per-integration-family (Financial, Health/Wearables, AI/LLM, Fiscal rule-packs, Calendar/Extraction) — each co-listing its ingestion-guard issues.
- **M3** → Project: `Whole-OS Encryption & Security Pass` (crypto/vault AR-3, DB-5 `[E]`, SQLCipher, ingestion-guard re-verification).
- **M4** → Projects: `Sync Engine & Server`, `Desktop`, `Mobile`, `Self-Host`, `ZK-Cloud + Billing`.
- **Gated push:** `/track-sync` per-cluster `--approve-cluster` (roadmap §173) — no bulk create.
- **Linear reconciliation owed:** the old 35 Phase-1.0 issues (LIF-61…95) were sequenced substrate-first; they get **re-scoped/re-ordered**, not duplicated (record the mapping).

---

## §6. Decisions surfaced → ADR-019 `[R2: never bury a decision in prose]`

**ADR-019 — "Build sequencing: whole-OS-manual → external-integrations(+boundary) → whole-OS-encryption → venues; integrations precede encryption-at-rest but are built against the seam."** Records:
- The M1→M2→M3→M4 spine + the two refinements to ADR-017 (§1): internal-integration-layer ∈ M1; external-integrations precede encryption-at-rest (localhost), gated at release.
- The accepted plaintext-window tradeoff + the hard release gate (encryption + integration re-verification before any other user).
- **Amends (sequencing only):** ADR-017 (refines the hardening order to place integrations before encryption-at-rest, boundary co-built) + `docs/roadmap.md` (Phase-1.0 order replaced). **Does NOT amend:** ADR-014/015 (the ZK ingestion/AI model is unchanged — only *when* it's built), ADR-002 (encryption model unchanged).

`[VERIFY]` ADR-019 is authored at gate 2 (after Approval 1), not in this PLAN.

---

## §7. Units + gates

- **U1 — Re-sequence thesis + ADR-019** (this PLAN → critique → **Approval 1** → ADR-019 → critique → **Approval 2**).
- **U2 — Rewrite `docs/roadmap.md`** features-first (M1→M4, §2 re-map, §3 order, §4 deps, provenance refresh: 15 ADRs/21 contexts → 19 ADRs/24 contexts + ADR-018 homes). Preflight + critique.
- **U3 — Re-projectize Linear** (gated `/track-sync --approve-cluster`; re-scope LIF-61…95).
- **Exit gate (campaign close):** `victor:quality-gate-foundation` + independent critic over the rewritten roadmap + Victor acceptance → **Part 3 done → the foundation-realignment campaign is COMPLETE.**

---

## §8. Acceptance

- [ ] `docs/roadmap.md` rewritten features-first: M1 (whole-OS manual + internal integration) → M2 (integrations+boundary) → M3 (encryption) → M4 (venues); provenance refreshed (19 ADRs/24 contexts/ADR-018).
- [ ] Every old-roadmap deliverable re-mapped (§2), none dropped silently; schema per-feature; crypto in M3; integrations in M2.
- [ ] Dependency map + sequencing rules consistent with module-dependency-graph + ADR-017/018.
- [ ] ADR-019 accepted; the plaintext-window tradeoff + release gate stated.
- [ ] Linear re-projectized (gated); LIF-61…95 re-scope mapping recorded (no silent dups).
- [ ] "RP"=Real Product resolved everywhere (no residual `[UNKNOWN]`).

---

## §9. Risks
- **R1 — M1 is large** (the whole OS). Mitigate: features-first waves (§3) each independently usable; the roadmap sequences them, this PLAN doesn't build them.
- **R2 — integrations-before-encryption plaintext window** (§1). Mitigate: localhost-solo only; ADR-019 records the hard release gate + build-against-seam.
- **R3 — Linear drift** (35 issues re-scoped). Mitigate: gated per-cluster push; record the old→new mapping.
- **R4 — the internal vs external integration line blurs** (what's "internal connective layer" vs "external integration"). Mitigate: §1 defines it — internal = cross-module aggregation/links/rollups (M1); external = third-party data sources (M2).

---

## Change Log
| Date | Change |
|------|--------|
| 2026-07-25 | Initial gate-1 DRAFT. Grounded in docs/roadmap.md + ADR-014/015/016/017/018 + module-dependency-graph + Victor's confirmed cut (RP=Real Product; M1 whole-OS-manual incl. internal integration → M2 external integrations+boundary → M3 whole-OS encryption → M4 venues; integrations built against the seam, encryption gates release). |
| 2026-07-25 | **Independent gate-1 critique → REVISE → folded.** Critic VERIFIED the load-bearing decision M2-before-M3 is safe (ZK-1 = server-blindness via L3/sync = M4; deferring L1/L2 at-rest touches no ADR-014/015 invariant). B1: §2 re-map was bucket-grain → added **§2.1 per-deliverable ledger** (every DB/AR/DS/UI/UX/module/P2/P3 ID → M-home); split **DB-8b blind-index → M3** (keyed), placed **DB-10 seed → M1**, split **UX-5b vault-unlock → M3/M4** (auth-coupled). B2: **AR-8 vs roadmap §91 "module-owned engines"** → clarified `summary(date)`/study-review/analytics stay module-owned (`services/*`), only cross-cutting services are AR-8. Non-blockers folded: N1 (substrates land by first-consumer pull, not "substrate-first regardless"), N3 (HLC-encoding deferred-decision caveat on DB-2), N6 (ICS module-surface M1 vs live-feed M2). Awaiting Approval 1. |
