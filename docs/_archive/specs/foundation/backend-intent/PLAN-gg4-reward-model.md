# PLAN — GG4: The Reward-Amount / Economy-Weighting Model (pre-P2 gate)

> **Campaign:** backend-replan · **Phase gate:** pre-P2 design-pass (ADR-021 §3.6 — every phase its own §XXVI gate).
> **Unit type:** design-ratification (ends in an ADR-012 amendment + corpus GG4 close). No code authored here; the
> code lands in its homed build issue (§5). **This PLAN presents the APPROACH options to realize a FIXED intent;
> the gate tests OS-fit.**
>
> **Intent authority:** Victor (2026-09-14, this session) — see §1. This is the one gamification gap the intake
> confirm-list never ratified (`docs/intake/gamification.md:197`).

## 0. Grounding (ground truth this PLAN is built on)

- **Ratified economy frame:** ADR-012 — rule→consequence engine; `grant_currency` (`award_xp` = XP case) is a §3.2.5
  Additive effect (§3.1); XP is _one currency, not privileged_ (§3.2); balances DERIVED from `consequence_ledger`
  (§3.3); shipped rules trusted, user rules under ADR-010 sandbox (§3.9); the `rules` table shape + reward config
  format are the item ADR-012 §97 leaves to the build phase — **which is now** (this campaign).
- **Authored substrate (DB-3, live):** `packages/core/src/db/schema/foundation/economy.ts` — `currencies`
  (`code` · `backing_kind` · `pool_ceiling`, :23), `consequence_ledger` (`amount` · `kind`, :36), `store` (:61),
  `rules` (`condition_binding_type` · `condition_ref` · `consequences` JSON · `grant_id NULL = shipped`, :87).
  `grant_currency` handler is **live** (`foundation/economy/handlers.ts:61`; `GrantCurrencyPayload` `types.ts:26`).
  Rules **engine** is 0-logic (`foundation/economy/index.ts:4`).
- **Parallel path:** `achievements.xp_reward INTEGER DEFAULT 0` (`schema/gamification.ts:60`, migration 031:84) —
  authored-but-inert, 0 live consumers.
- **Personalization precedent (VERIFIED — do not reinvent):** global default (`user_preferences`) + per-entity/rule
  override, resolved by the pure `resolveSelection(globalDefault, override)` — `home-journal-dashboard.md` BR-6;
  governed by Preferences conventions **PR-1…PR-12** (`docs/features/preferences/conventions.md`): PR-1 all-plaintext,
  PR-2 merge-on-DEFAULTS via `getMergedPreferences` (never raw row), PR-4 auto-save, PR-7 visibility≠feature-flag.
- **Integration ownership (VERIFIED — already planned, not this campaign):** external/bank/currency integration =
  ADR-014 (external-data ingestion, Layer-3 self-service = webhooks/dev-platform) + ADR-015 (AI/LLM) + FN-8
  (device-side FX, never server — ZK-1) → milestone **M2** (issues P3-2 Financial · P3-6 webhooks). Constitution
  **EX-1/EX-2** (integrations are opt-in, on-device, ZK-safe, core untouched).
- **P2 boundary:** `PLAN-p2-schema-reconcile.md:135` already scopes "resolving GG4" **out of P2**.

## 1. FIXED intent (Victor — the inputs this PLAN must realize)

1. **Tunable, default-protected.** XP-per-action is user-tunable, but ships a shipped-default baseline as a
   protection floor; open for configuration + further integration.
2. **Difficulty/priority weighting, with a switch.** Amounts are difficulty/priority-weighted, behind a toggle so a
   user runs either **flat** or **weighted** — the OS is personalizable. Global preference is the primary control;
   per-rule is the advanced option.
3. **XP is a first-class currency, integration-ready.** Not a "false XP" toy — a proper OS currency the coming
   webhook/developer/bank integration can plug into seamlessly (owned by M2/ADR-014, not built here).

## 2. The approach forks (options → OS-fit → recommendation)

Each fork: the options, the OS-fit test (against the grounding above), a recommendation. The gate decides.

### Fork A — Where the shipped-default reward amounts live

- **A1 — Seeded `rules` rows (`grant_id NULL`).** The app-default reward set IS data in the authored `rules` table.
  _OS-fit:_ reuses the authored substrate + the `grant_id NULL = shipped` convention (economy.ts:98); one truth path
  (everything is a rule). _Cost:_ need a seed migration.
- **A2 — A dedicated `xp_action_rewards` config table.** _OS-fit:_ adds a table ADR-012 never designed → a DIVERGENT
  new structure parallel to `rules`; two reward models. ✗
- **A3 — Code constants that materialize into rules on first run.** _OS-fit:_ splits truth between code + DB;
  re-seed/versioning ambiguity. ✗
- **▶ Recommend A1** — the substrate exists for exactly this.

#### Fork A′ — The seed/sync MODEL of the shipped-default rules (blocking sub-decision)

The `rules` table carries `...baseColumns` (syncable). Shipped defaults are app-config, not user content, so their
sync model is a real decision with a **multi-device double-seed hazard**:

- **A′1 — Static-seed, NON-synced** (the `achievements` precedent — the OS's "first non-syncable static-seed table",
  DB-4 #21): defaults are app-provided identical rows on every device; **deterministic IDs** (e.g. `rule:xp:<action>`)
  so re-seed is idempotent and no device double-seeds. User-authored rules (`grant_id` set) sync normally.
  _OS-fit:_ matches the only static-seed precedent in the OS; no sync churn on app-shipped config.
- **A′2 — Synced rows.** _OS-fit:_ two devices each seed → duplicate default rules unless UNIQUE-keyed; puts
  app-config through the user sync channel. ✗
- **▶ Recommend A′1** — mirror the `achievements` static-seed model; deterministic IDs. (DDL stays build-phase; the
  _model_ is ratified here.)

### Fork B — The weighting-switch granularity

- **B1 — Global-only** (`user_preferences.xp_difficulty_weighting` bool). _Simple; not advanced-tunable._
- **B2 — Global default + per-rule override**, using the **`resolveSelection` PATTERN** (global-default + local-override
  precedence — the shape, not reuse of that journal-summary function). _OS-fit:_ the VERIFIED house pattern (BR-6,
  PR-1/PR-2); a plaintext bool in `user_preferences` (merged via `getMergedPreferences`) is the default; the **per-rule
  setting is the descriptor's `weight_by` (Fork C1) itself** — a rule that sets `weight_by` overrides the global default;
  a rule that leaves it unset inherits the global. **ONE mechanism, not a second column.** Matches Victor's intent.
- **B3 — Per-rule only.** _No global default = no protection floor._ ✗ (contradicts intent #1).
- **▶ Recommend B2** — established precedent AND stated intent. _(Reconciled with C1: the per-rule override is the
  `weight_by` field, not a separate `rules` column — see §2.C.)_

### Fork C — The weighting EXPRESSION grammar (`rules.consequences`)

- **C1 — Structured typed-effect descriptor** with an optional weight, e.g.
  `{ effect:'grant_currency', currency:'XP', base:N, weight_by:'difficulty'|'priority'|null, scale:<map|curve-ref> }`.
  `weight_by: null` = flat; a set value = weighted (this field IS the per-rule override of Fork B2). _OS-fit:_ fits the
  "typed-consequence effect descriptors (ADR-004 §3.2.5)" the schema comment already names (economy.ts:96); the
  weight input (`difficulty`/`priority`) is a **triggering-entity attribute read from the event payload** (the rule's
  _condition_ remains the ADR-011 binding); JSON-as-TEXT is already the column type; **`GrantCurrencyPayload` is
  UNTOUCHED** — weighting resolves upstream → a final amount reaches the effect. **Missing weight input** (a rule
  weights by `priority` but the entity has none) → **falls back to `base` (flat), flagged** — the GM-10 missing-signal
  precedent (never fabricate a multiplier).
- **C2 — Free-form formula/expression string.** _OS-fit:_ an eval surface = ZK/sandbox hazard (ADR-010); rejected by
  the "declared schema, not arbitrary eval" posture. ✗
- **C3 — Fixed difficulty→multiplier map only** (no per-rule expression). _Rigid; can't express priority or curves._
- **▶ Recommend C1** — declarative, sandbox-safe, seam-native, effect-rail-preserving.

### Fork D — The `achievements.xp_reward` parallel path

> **Scope note:** D is included in GG4 only as a **write-path-consistency** statement (GG4 owns the reward-grant
> model). The achievement-EVALUATION engine that fires it is **GG6** — D3 is cross-referenced to GG6, not built here.

- **D1 — Subsume:** achievements become rules (condition = achievement predicate; consequence = `grant_currency`);
  `xp_reward` retires to legacy. _Cleanest single-model; most rework._
- **D2 — Keep two paths:** achievements own their flat reward; rules own action-XP. _OS-fit:_ a second write path that
  does NOT go through the rail = violates the "one ledger truth / grant via the rail" spirit (ADR-012 §3.1). ✗
- **D3 — Bridge:** keep the `xp_reward` column as the achievement's amount, but GRANT it through a `grant_currency`
  effect on the rail **when the GG6 engine fires** (unify the write path, keep the authored column). _OS-fit:_ one
  ledger truth (§3.3) + no schema churn + achievements stay a distinct authored entity. Least-rework unification.
- **▶ Recommend D3** — unifies the write path without retiring an authored column or forcing achievements-as-rules;
  materializes with GG6's engine (cross-ref, not GG4 build).

### Fork E — Integration-readiness realization (currency ↔ M2)

- **E1 — Forward-constraint only (no schema now):** record that `currencies.backing_kind` + `code` are the extension
  point; the webhook/bank plumbing is M2/ADR-014. _OS-fit:_ respects layer ownership + "reconcile-not-redo"; ZK-safe
  by deferring nothing about the _model_, only the _plumbing_ (which is genuinely another milestone's build).
- **E2 — Pre-author provenance columns now** (`external_source`/`external_ref` on `currencies`). _OS-fit:_ authors
  M2's schema early = crosses the layer boundary Victor drew; premature. ✗
- **▶ Recommend E1** — integration-ready by model, M2 owns the plumbing (cite ADR-014/FN-8/EX-2).

### Fork F — Home/layer of GG4's CODE (planning disposition — MINE to plan, gate to approve)

- **F1 — Gamification module backend build issue** (P3-decomposed): seeds default rules (A1), adds the global toggle +
  per-rule override (B2), implements the C1 grammar + D3 bridge. _OS-fit:_ GG4 is module-backend intent; P2 stays a
  pure reconcile pass (PLAN-p2:135). Design ratified now; code built from settled intent.
- **F2 — Fold the two additive columns into P2.** _OS-fit:_ contradicts P2's own scope line; smuggles new-module build
  into a reconcile. ✗
- **F3 — A dedicated economy-reward build issue** (separate from the gamification module). _Possible; finer grain,
  decided at P3 decomposition._
- **▶ Recommend F1** (with F3 as a P3 grain option) — resolve-now (design) + build-in-the-right-layer.

### Fork G — The v1 default reward VALUE SET (GG4 is literally "the reward _table_")

GG4 names an XP-per-action reward _table_ + difficulty weighting. The forks above settle the _mechanism_; the actual
**numbers** (per-action base amounts + the difficulty/priority → multiplier map) are a distinct deliverable that must
be homed, not left implicit.

- **G1 — Ratify the SHAPE + weighting POLICY here; author the NUMBERS in F1** (the module build), with Victor sign-off
  on the concrete value set at that point. _OS-fit:_ keeps this gate a design-ratification (its stated type); the value
  set is content, authored where the seed migration lives; avoids bikeshedding numbers in a model gate.
- **G2 — Fix the numbers now.** _Pulls value-tuning into a design gate; premature — the feeders (Tasks/Habits/…) and
  their difficulty vocabularies are the inputs, better set beside the seed._
- **▶ Recommend G1** — ratify shape + policy now; the default value set is an F1 authoring deliverable with your
  explicit sign-off. **This keeps GG4 fully resolved (nothing implicit) without turning the gate into number-tuning.**

## 3. Recommended composite approach

**A1 + A′1 + B2 + C1 + D3 + E1 + F1 + G1.** In one line: _shipped default rules (static-seed, deterministic IDs —
`achievements` model) seed the protected baseline; a global
`xp_difficulty_weighting` preference (per-rule override via `resolveSelection`) toggles flat vs difficulty/priority
weighting; the weight is the declarative `weight_by` field in the `rules.consequences` descriptor (also the per-rule
override); the final amount is granted through the existing `grant_currency` rail (achievements bridge via D3 when the
GG6 engine fires); the currency stays integration-ready by model (M2/ADR-014 owns the plumbing); the SHAPE + weighting
policy ratify here, the default value set + all code author in the gamification module backend build (F1), not P2._
Ratified into an **ADR-012 amendment** (closes GG4) + the **corpus GG4 line** flips UNKNOWN→RESOLVED.

## 4. Acceptance — does it fit the OS?

- [ ] Reuses the authored substrate (`rules`/`currencies`/`consequence_ledger`) with **no new economy table** (A1/C1).
- [ ] **Weighting has ONE home** — the `weight_by` descriptor field; global preference = the default it inherits (B2/C1).
- [ ] **Shipped-default seed/sync settled** — static-seed, deterministic IDs (`achievements` model), no double-seed (A′1).
- [ ] Personalization uses the **verified house pattern** (global-default + local-override + PR-1/PR-2), not new (B2).
- [ ] The **live `grant_currency` contract is provably untouched** (weighting upstream → final amount) (C1).
- [ ] **One ledger write path** — no reward bypasses the rail; achievements bridge via GG6 (D3).
- [ ] **The v1 default VALUE SET is homed** (shape/policy here, numbers in F1 w/ sign-off) — nothing implicit (G1).
- [ ] **ZK/layer boundaries honored:** no M2 schema pre-authored; integration = model-ready + cite ADR-014/FN-8/EX-2
      (E1); no eval surface (C1 over C2).
- [ ] **P2 untouched** — design ratified beside it; code homed to the module build (F1), per PLAN-p2:135.
- [ ] Corpus GG4 line → RESOLVED; 0 open gamification UNKNOWNs blocking P3.

## 5. What this does NOT do (boundaries)

- Does **not** build the webhook/developer/bank integration (M2 · ADR-014/015 · P3-2/P3-6).
- Does **not** author schema in P2 or here — the columns/seed/grammar author in the gamification module build (F1).
- Does **not** design the level-curve (GG5, settled), the achievement-evaluation runtime (GG6), or user-authored
  achievements (GG7 — INTENDED-later).
- Does **not** re-open any ratified GG (GG2/3/5/8/9/10/11).

## 5b. Cross-context ownership (P3 decomposition input)

The global toggle `xp_difficulty_weighting` is a **Preferences-owned** column (PR-1 all-plaintext; GM-12 single-writer)
that gamification **consumes** — it is NOT authored by the gamification module. So the composite touches **two build
homes**, which P3 decomposition must encode:

- **Preferences build** authors the `user_preferences.xp_difficulty_weighting` plaintext column + its `DEFAULTS` entry.
- **Gamification build (F1)** authors the seed rules (A1/A′1), the `weight_by` descriptor grammar (C1), the D3 bridge,
  and **reads** the preference via `getMergedPreferences` (never a cross-module table write — INT-2).
- → an F1 → Preferences **dependency edge** (F1 consumes the column) is recorded for P3.

## 6. Deliverables on approval

1. **ADR-012 amendment** — a "GG4 — Reward-Amount & Weighting Model" entry via ADR-012's **`Amended:` block +
   a §3.x subsection** (the convention ADR-012 §10 already uses for effect-catalogue amendments), recording
   A1/A′1/B2/C1/D3/E1/F1/G1. ADR-012 stays Accepted; this is an in-place amendment, not a superseding ADR.
2. **Close the corpus GG4 line** in ALL THREE places: `corpus.md:565` (the UNKNOWN row) + `corpus.md:378` (the
   RATIFICATION-GAP callout) + `parts/gamification.md:118` → UNKNOWN/ratification-gap → **RESOLVED** (cite this PLAN).
3. **Record the two build homes (§5b)** so P3 decomposition carves the gamification-module + Preferences-touch issues
   with settled GG4 intent + the F1→Preferences edge.
