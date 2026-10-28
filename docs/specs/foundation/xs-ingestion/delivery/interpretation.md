# Interpretation — XS-ingestion (#44, LIF-172)

> Entity Delivery Flow §3 — the interpretation layer for the `foundation/ingestion` device-mediated
> ingestion-guard service. Every claim is `[FACT: path:line]`, `[INTERPRETATION]`, or `[UNKNOWN]`
> (No-Guessing Principle).
> Mode: **Build-from-docs** (§8 Decide-mode) — P3 fixed **13 legs**, no prior code exists (Step-0 baseline:
> `foundation/ingestion/` has only a `CLAUDE.md` directory-home; `[FACT: packages/core/src/foundation/ingestion/CLAUDE.md:15-16
"Directory home only … No feature code or DDL lives here yet"]`).
> Source of the split: `[FACT: docs/specs/foundation/backend-intent/decomposition.md:45]` (build-deps `—`,
> runtime read-seams `—`, 13 item-ids).
> Sibling precedent (same shape-class, built last session): **XS-egress-guard #43** —
> `[FACT: docs/specs/foundation/xs-egress-guard/delivery/interpretation.md]`.

## Scope in one line

Build the **cross-cutting device-mediated ingestion-guard SERVICE tier** — the one coherent model by which
_every_ module's external data crosses the vault boundary: **parse/normalize/encrypt on-device (never
server-proxied)**, classified into **three ownership layers** (native · public-reference · user-managed) each
with an **honest-leak disclosure**, with **whole-set public-reference fetch + provenance verify**,
**reconcile-on-import staging**, **add-only feed dedup**, **stable integration-identity + normalization
contract**, and the **opt-in / revocable grant lifecycle** — all on top of the capability enforcer's already
decided `external_in_ok` boolean. `[FACT: ADR-014:18-24 (§1); decomposition.md:45]`

## Scope boundary — foundation-first, M1 seam not M2 wiring

The corpus is explicit that these legs are **"M2-facing (no module ships these at M1), but the service-tier
seams are captured now so the corpus is complete."** `[FACT: xcut-ingestion-ai.md:5-6]` No M1.1.2 module
actually ingests yet — Finance CSV/OFX, Health wearables, Learning ICS, Books OCR are all later MOD builds
`[FACT: decomposition.md:58,61,62,66,67 — MOD-finance/health/languages/learning all list XS-ingestion as an
upstream runtime seam]`. So this head builds the **finished decision/engine/registry tier + its persistence
and mediation PORTS**, which the M2 module connectors and the P6 consent/review/management UIs then ride —
`[FACT: reconstructed-structure.md:162 "FE-integrations-ai-surfaces ← XS-…-ingestion" (ingestion consent · import review, UI-only, BR-2)]`.
The **durable stores** (`import_staging`, `connection_config`, the dataset/integration registry rows), the
**real native adapters + public mirror/CDN**, the **actual fetch/network reach**, and **all consent/review/
management UIs** are M2/P6 (see DELEGATES + UNKNOWNs). `[INTERPRETATION from xcut-ingestion-ai.md:5 + ADR-014
§5 owed-schema-is-build-phase + DB-4 closed with no ingestion tables (Step-0 grep)]`

## The 13 legs (P3-homed `decomposition.md:45`, all typed `service`) — grouped by build shape

> XCU-06/06u/08 (egress) → **XS-egress-guard #43 BUILT**; XCU-07 (grant semantics) → **XS-capability #31 BUILT**;
> XCU-17…27 (AI) → **XS-ai #45**; every `*u` leg → **P6 UI**. Those are OUT of this build `[FACT: decomposition.md:40,42,45]`.

**Group A — pure engine / rules (no port, no schema; buildable now, deterministic):**

- **XCU-02 — Three-layer classification.** Each connector classed `native | public-reference | user-managed`;
  layer drives the honest-leak profile. Not a flat toggle. `[FACT: xcut-ingestion-ai.md:14; ADR-014:44-52;
capability-framework.md:196 (X2)]` → BUILD (enum + `classifyLayer`).
- **XCU-03 — Honest-leak disclosure builder.** The service _computes_ the who-sees-what disclosure payload per
  layer (the matrix `[FACT: ADR-014:56-60]`); the UI renders it. `[FACT: xcut-ingestion-ai.md:15]` → BUILD
  (pure `buildDisclosure(layer)`). The consent-gate UI (XCU-03u) is **P6, OUT** `[FACT: xcut-ingestion-ai.md:16]`.
- **XCU-11 — Add-only feed dedup.** Feeds that only add (ICS) skip staging but **dedup by natural key
  `(feed_id, uid)`** and mark `is_ignored` rather than deleting. `[FACT: xcut-ingestion-ai.md:26; ADR-014:72;
capability-framework.md:202 (X8)]` → BUILD (pure `dedupeFeed`).
- **XCU-14 — Integration-identity + normalization contract.** A stable per-source id decoupled from layer +
  a declared field-shape/units/dedup-key contract both layers emit to (so Layer-3→Layer-1 is a connector
  migration, not a data migration). `[FACT: xcut-ingestion-ai.md:29; ADR-014:78 (§3.8); capability-framework.md:204
(X10)]` → BUILD (types + in-memory registry, mirroring the capability/effect registries). The **durable
  registry rows** are M2.

**Group B — guard / decision service over the enforcer (deny-safe ports; egress-twin shape):**

- **XCU-01 — Device-mediated pipeline + hard-refusal.** fetch/read → parse/normalize on-device → encrypt (L2/L3)
  → write vault rows that sync as opaque blobs; **server never a fetch proxy; a server-plaintext fetch is refused,
  not silently downgraded.** `[FACT: xcut-ingestion-ai.md:13; ADR-014:39-40 (§3.1); capability-framework.md:195
(X1)]` → BUILD (the pipeline **contract** + `assertDeviceMediated` invariant; the real fetch is a deny-safe
  port).
- **XCU-12 — Opt-in / user-owns-risk / manual-fallback grant lifecycle.** Every integration off by default;
  enabling surfaces a labeled per-integration consent; standing-until-revoked; **no integration is ever a
  precondition of a core capability.** `[FACT: xcut-ingestion-ai.md:27; ADR-014:74 (§3.6)]` → BUILD (lifecycle
  gate delegating the `external_in_ok` decision to the enforcer).
- **XCU-13 — Revocation = stop-future, keep-ingested.** Revoke halts all future fetch/import (fail closed);
  already-committed rows stay as normal user data (never auto-purged). `[FACT: xcut-ingestion-ai.md:28;
ADR-014:70 (§3.4); capability-framework.md:203 (X9)]` → BUILD (delegates to `enforcer.revoke`; enforces the
  no-purge invariant).
- **XCU-09 — Mediator credential custody.** Encrypted `connection_config` held by the OS mediator, **never
  handed to sandbox/capability code**; the capability asks "fetch from source X", the mediator injects the
  credential + makes the call, returns only the result. `[FACT: xcut-ingestion-ai.md:23; ADR-014:68 (§3.4);
capability-framework.md:201 (X7)]` → BUILD (the custody **invariant** + a mediator **port**; `connection_config`
  **store is M2**).

**Group C — engine with an M2 store (engine pure now over in-memory + a deny-safe port):**

- **XCU-10 — Reconcile-on-import staging.** parse → `import_staging` (parsed rows + match metadata + per-row
  status) → **auto-match by date±tolerance & amount±tolerance** → user reviews/merges → commit (idempotent,
  ADR-004 §3.2.5). **User is final authority; a parse error fails loud per-row.** `[FACT: xcut-ingestion-ai.md:24;
ADR-014:72 (§3.5); capability-framework.md:202 (X8)]` → BUILD (the pure `autoMatch`/`stage`/`commit-on-confirm`
  **engine** over an in-memory staging + a store **port**; `import_staging` **table is M2**). Review UI
  (XCU-10u) is **P6, OUT** `[FACT: xcut-ingestion-ai.md:25]`.
- **XCU-04 — Public-reference whole-set fetch engine.** bulk-refresh a **complete** dataset (OS bundle / Vida
  mirror / CDN) then query a **local copy** — **never the user's subset** (a scoped refresh re-leaks the
  category). `[FACT: xcut-ingestion-ai.md:17; ADR-014:48 (§3.2 L2); capability-framework.md:197 (X3)]` → BUILD
  (the whole-set **invariant** + a dataset-fetch **port**; the mirror/CDN + real datasets are M2/infra
  `[FACT: ADR-014:133]`).
- **XCU-05 — Public-dataset provenance/signature verify.** Every bundled/mirrored dataset carries a verifiable
  source + version + integrity signature; **reject a poisoned/unsigned rule-pack.** `[FACT: xcut-ingestion-ai.md:18;
ADR-014:129 (§5 ADD)]` → BUILD (the `verifyDataset` **invariant** over a signature-verifier **port**).

**Group D — registry seams (the registry builds; contents defer):**

- **XCU-15 — Native-connector adapter registry.** The curated first-party source-direct connectors (Apple/Google
  Health, banks/brokers). `[FACT: xcut-ingestion-ai.md:30; ADR-014:46 (§3.2 L1)]` → BUILD (the adapter
  **registry** seam only); the **adapters themselves are M2** and the **qualification policy is UNKNOWN/owed**
  `[FACT: xcut-ingestion-ai.md:101 (UNKNOWN); ADR-014:130 (§5 DECISION owed)]`.
- **XCU-16 — User-managed self-service engine.** webhooks + external-API management + Vida cookbooks; **a
  user-authored connector is a sandboxed ADR-010 capability** (credentials mediator-custodied, compositional-exfil
  union-of-consents). `[FACT: xcut-ingestion-ai.md:31; ADR-014:50 (§3.2 L3)]` → BUILD (the connector-as-capability
  **rule** + registration seam); the **Preferences management page is P6** `[FACT: xcut-ingestion-ai.md:32]`,
  **third-party-shared connectors are OUT behind PC-4** `[FACT: xcut-ingestion-ai.md:55,102]`.

## DEPENDENCIES (every upstream)

- **CapabilityEnforcer (`#31`, BUILT)** — decides the **`external_in_ok` boolean** (`decideExternal`) + the
  in/out compositional union across action checks; ingestion runs its lifecycle/pipeline gate _after_ that
  boolean passes. The `external_in` action already exists on the enforcer.
  `[FACT: packages/core/src/foundation/capability/enforcer.ts (checkAction/decideExternal); capability/types.ts
CapabilityAction "{ type:'external_in'; source }"]` · delegation stated `[FACT: docs/core/capability/current-business-rules.md]`.
- **EgressGuard (`#43`, BUILT)** — the compositional-exfiltration case (XCU-08, homed to egress) is where an
  outbound fetch's URL/params are treated as egress; ingestion's device-mediated fetch (XCU-01) that carries a
  sensitive read **rides `egressGuard.assertFetchEgress`** — a fetch is an egress act.
  `[FACT: docs/specs/foundation/xs-egress-guard/delivery/interpretation.md:30-38; egress/types.ts EgressGuard.assertFetchEgress]`.
- **`capability_grants` envelope (AR-7, structure-only)** — `external_in_ok` (per-source ingestion boolean),
  `consented_sensitive_modules`, the grant a def carries. `[FACT: packages/core/src/foundation/capability/enforcer.ts (grant/GrantEnvelope)]`.
- **ADR-004 §3.2.5 guarded-write rail** — NOT owned here; a staging **commit** is an idempotent guarded write
  that rides it. `[FACT: ADR-014:72 "commit … idempotent write, ADR-004 §3.2.5"; ADR-014:82 "Does NOT own … the write rail"]`.
- **NO new schema in M1.** `external_in_ok`/`external_out_ok` take **"no new column/table"** — they ride the
  existing `capability_grants` row (X5 governs _grant semantics only_) `[FACT: capability-framework.md:199 (X5)]`.
  The _ingestion stores_ (`import_staging`, `connection_config`, dataset/integration registry) are **owed schema,
  build-phase, tracked ADR-002 §5.20** `[FACT: ADR-014:9,86,125-128 (§5)]` and DB-4 (M1.0, closed) authored **none**
  of them (Step-0 grep across `packages/core/src/db/schema/`) → M1 uses deny-safe/in-memory ports; the durable
  stores land **M2**. `[FACT: xcut-ingestion-ai.md:5; Step-0 baseline]`.

## NEEDS (preconditions to function)

- **An "ingestion source" descriptor + an "ingestion act"** — the units the guard adjudicates:
  a source `{ integrationId, layer, normalizationContractId }` and an act `{ initiating def_id, source,
data-scope, user_initiated proof }`. `[INTERPRETATION — assembled from XCU-01/02/12's requirements]`; the exact
  `integrationId` identity shape = the stable integration-identity anchor (**RESOLVED R-3, XCU-14**).
- **The initiating cap's grant resolvable** via the enforcer — `external_in_ok` true AND (if the source reads a
  sensitive class OR the fetch carries one) `consented_sensitive_modules` present, else **fail closed before any
  fetch is considered**. `[FACT: enforcer checkAction external_in + sensitive; ADR-014:42 (§3.1 compositional)]`.
- **A user-initiation token on any live fetch** — opt-in / never a silent background reach for a _new_ grant;
  an already-standing grant may auto-refresh a feed, but the _first_ enable is user-initiated. `[FACT: ADR-014:74 (§3.6)]`
  `[INTERPRETATION — the enable is user-initiated; standing refresh is the exception, disclosed at consent]`.
- **A normalization contract per source** — the field-shape/units/timestamps/dedup-key rows conform to; the
  load-bearing half of the upgrade path. `[FACT: ADR-014:78 (§3.8)]`.
- **A signature verifier + dataset fetcher** (public-reference) and a **credential mediator** (live connections)
  — all **ports** in M1 (deny-safe: fetch refused, verify fails closed, mediator absent) `[INTERPRETATION from the
egress DENY_SAFE precedent + fail-closed default]`.
- **Vault key** is NOT required by the guard's _decision_ path (it reads plaintext grant booleans + composes a
  decision); any downstream **persistence** (staging rows, connection_config, audit) hits the Repository
  content-hash + `[E]` seam — the MOD-notes bug class, backstopped by the live-store Verification Gate.
  `[FACT: memory repository-create-returns-input-row; entity-delivery-flow §Anti-Patterns]`.

## ORGANIZATION (owns / consumes / delegates)

- **OWNS:** the device-mediated ingestion **decision/engine** tier — the three-layer classifier (XCU-02) · the
  honest-leak disclosure builder (XCU-03) · the whole-set fetch + provenance-verify engine over ports (XCU-04/05)
  · the staging/auto-match/commit-on-confirm reconcile engine over a store port (XCU-10) · add-only feed dedup
  (XCU-11) · the integration-identity + normalization-contract registry (XCU-14) · the opt-in/revoke grant
  lifecycle over the enforcer (XCU-12/13) · the mediator-credential-custody invariant + port (XCU-09) · the
  native-adapter registry seam (XCU-15) · the user-managed connector-as-capability rule (XCU-16) · the typed
  ingestion deny/error taxonomy + refuse-not-downgrade invariant (XCU-01).
- **CONSUMES:** the CapabilityEnforcer's `external_in_ok` boolean + grant envelope + `revoke` (`#31`); the
  EgressGuard's `assertFetchEgress` for outbound-fetch-as-egress (`#43`); the ADR-004 §3.2.5 write rail for
  staging commits; **no schema of its own** (M1).
- **DELEGATES:**
  - the `external_in_ok` **boolean** + in/out compositional union _across action checks_ → **CapabilityEnforcer
    `#31`** (BUILT);
  - **treating an outbound fetch as an egress act** (URL/params consent + audit) → **EgressGuard `#43`** (BUILT,
    XCU-08) `[FACT: xcut-ingestion-ai.md:22]`;
  - the **model call / cognition** on an ingested-then-AI pipeline → **XS-ai `#45` / ADR-015** (XCU-17…27)
    `[FACT: ADR-014:76 (§3.7); xcut-ingestion-ai.md:33-46]`;
  - the **consent-gate / import-review / integration-management / AI-management UIs** (XCU-03u/10u/16u/…) →
    **P6 UI** `[FACT: xcut-ingestion-ai.md:16,25,32; reconstructed-structure.md:162]`;
  - the **durable stores** (`import_staging`, `connection_config`, dataset + integration registry), the **real
    native adapters + public mirror/CDN + actual network fetch** → **M2** (U-1…U-4);
  - the **native-set qualification policy** + **third-party-shared connectors** → **owed-decision / PC-4**
    (UNKNOWN) `[FACT: xcut-ingestion-ai.md:101-102]`.

## IMPLICIT RULES (surfaced hidden invariants)

- **IR-1 — Device-mediated, never server-proxied; refuse, don't downgrade.** Every ingestion parses/encrypts
  on-device; our server is never a fetch proxy and never sees a plaintext import; a fetch that could _only_ work
  by having the server read plaintext is **refused, not silently downgraded**. `[FACT: ADR-014:21,40 (§3.1);
capability-framework.md:195 (X1)]`. Anti-signal: server-side fetch/parse/store; a "silently downgraded" fetch.
- **IR-2 — Ingress can carry egress; a fetch is an outbound request.** A cap holding a **sensitive read + any
  external grant** treats the outbound fetch's URL/params as egress → union-of-consents; an `external_in` fetch is
  **not** safe just because the intent is to pull data in. `[FACT: ADR-014:42 (§3.1); capability-framework.md:200
(X6)]`. This routes through EgressGuard `#43` (delegated), not re-implemented.
- **IR-3 — Layer = who owns the connector, not the mechanism, and it is temporal.** Classification is
  native/public-reference/user-managed by _owner_; the fetch mechanism (BLE/file/API/feed) is orthogonal; a source
  migrates Layer-3→Layer-1 over time. `[FACT: ADR-014:52 (§3.2)]`. Anti-signal: a flat toggle; laundering a
  user-wired connector as "device-side = private."
- **IR-4 — Fetch the whole set, never the user's subset.** The public-reference engine bulk-refreshes the
  _complete_ dataset and queries a local copy; the moment a refresh is scoped for bandwidth, the _category_
  interest re-leaks. `[FACT: ADR-014:48 (§3.2); capability-framework.md:197 (X3)]`.
- **IR-5 — Honest disclosure, not pretended privacy.** Every layer's residual leak (corpus-use/IP/timing for
  public-reference; whatever-the-user-wires for user-managed) is **disclosed at the consent gate, never pretended
  away**; the trust anchor is "a source the user already trusts and has data with." `[FACT: ADR-014:20,54-60]`.
- **IR-6 — Reconcile via staging; the user is the final authority; parse errors fail loud.** Merge imports never
  silently overwrite — they stage → auto-match → **commit only on user confirmation**; a parse error flags
  per-row and fails loud. `[FACT: ADR-014:72 (§3.5); constitution §5 fail-loud]`.
- **IR-7 — Add-only feeds dedup, never delete.** ICS-style feeds skip staging but dedup by `(feed_id, uid)` and
  mark `is_ignored` rather than deleting — history is preserved. `[FACT: ADR-014:72; capability-framework.md:202]`.
- **IR-8 — The mediator holds the token; the sandbox never sees it.** A sandboxed cap that could read a decrypted
  token could exfiltrate it (IR-2) — so it never sees one; the mediator injects the credential and returns only the
  result. `[FACT: ADR-014:68 (§3.4); capability-framework.md:201 (X7)]`.
- **IR-9 — Opt-in, revocable, fail-closed; no integration is ever a precondition.** Every path is off by default;
  the manual core is 100% functional without any of them; consent is standing-until-revoked; revoke halts future
  fetch and fails closed. `[FACT: ADR-014:74 (§3.6) — the opt-in/precondition rule; capability-framework.md:264 = the aligned-gate External-data checklist line, corroborating]`.
- **IR-10 — Revocation stops the future, keeps the past.** Revoke never auto-purges already-committed rows — they
  become indistinguishable from manual data (a local purge would restore no privacy; the third party already saw
  it). `[FACT: ADR-014:70 (§3.4); capability-framework.md:203 (X9)]`.
- **IR-11 — Layers are tiers of ONE normalized contract, not three silos.** A Layer-3→Layer-1 upgrade is "migration
  of the connector, not the data" **iff both layers emit to the same normalization contract**; if the shape
  differs it is a genuine data migration and must be documented as one. `[FACT: ADR-014:78 (§3.8);
capability-framework.md:204 (X10)]`.
- **IR-12 — `connection_config` + `import_staging` rows are sensitive → `[E]` when persisted; staging is
  transient.** Credentials and parsed-but-uncommitted rows describe vault-bound data; the M2 stores MUST
  field-encrypt (L2/L3 `[E]`) and staging is cleared on commit/discard. The M1 in-memory ports never touch disk, so
  the constraint binds the M2 adapters, not this build. `[FACT: ADR-014:9 (encrypted connection_config L2/L3);
ADR-002 §L2 field-level encryption; INTERPRETATION from ZK-1]`.

## RESOLVED FROM THE DOCS (no open decisions — all doc-determined)

- **R-1 — M1 builds the engine/decision/registry tier + ports; M2 builds the durable stores + real reach.** The
  corpus marks all 13 legs M2-facing with the _seam_ captured now `[FACT: xcut-ingestion-ai.md:5]`; ADR-014 §5
  routes `import_staging`/`connection_config`/integration-identity to build-phase owed schema `[FACT: ADR-014:125-128]`;
  DB-4 (closed) authored none of them (Step-0 grep). This is the **identical disposition** the sibling egress-guard
  resolved `[FACT: xs-egress-guard/delivery/interpretation.md:15-22, R-1/R-2]`. Not a choice — the corpus + DB-4 +
  X5-no-new-table settle it.
- **R-2 — The ports are deny-safe / no-op, mirroring egress.** M1 defaults: fetch **refused**, dataset verify
  **fails closed**, mediator **absent**, staging store **in-memory**, native adapters **empty registry** — every
  path fail-closed until a caller (M2 module / real adapter) wires a live port. `[FACT: xs-egress-guard: DENY_SAFE_CONSENT
/ NOOP_AUDIT default-port precedent (substrate map §1); ADR-014:74 off-by-default]`.
- **R-3 — Source identity = the stable integration-identity anchor (XCU-14), not a raw URL.** A per-source id
  decoupled from the layer, so a Layer-3→Layer-1 upgrade keeps grant + staged + ingested continuity. `[FACT:
ADR-014:78 (§3.8); capability-framework.md:204 (X10)]`. Doc-mandated, not a lean (same as egress R-3).
- **R-4 — The compositional fetch case is delegated, not re-built.** XCU-08 ("a fetch is an outbound request") is
  homed to egress `[FACT: decomposition.md:45 (XCU-08 ∉ XS-ingestion); xcut-ingestion-ai.md:22 (home = egress-guard)]`;
  ingestion's fetch path **calls `egressGuard.assertFetchEgress`** — it does not re-implement the egress gate.
- **R-5 — Registries mirror the built capability/effect registries (in-memory, deterministic list).** XCU-14/15
  registries follow the ADR-004 factory registry precedent already shipped (`createCapabilityRegistry` /
  `createEffectRegistry`); the _durable_ registry rows are M2. `[FACT: substrate map §3 factory-of-closures
registry precedent; ADR-004]`.

## Open UNKNOWNs (corpus-flagged, NOT this build's to resolve — blockers only if pulled in)

- **U-1 — Native-connector qualification process** (trust bar · security review · deprecation) — Victor's owed
  decision; the _process_ shape is UNKNOWN. `[FACT: xcut-ingestion-ai.md:101; ADR-014:130]`. XCU-15 builds the
  registry seam only.
- **U-2 — Public-mirror/CDN topology + anonymizing-fetch (PIR/OHTTP)** for the live-price per-item residual —
  explicitly deferred hardening. `[FACT: xcut-ingestion-ai.md:103; ADR-014:86,137(a)]`. XCU-04 owns the mechanism;
  the topology is M2/infra.
- **U-3 — Third-party-shared connectors** (one user's integration published to others) — behind PC-4's deferred
  community gate; **out of scope**, must NOT be silently absorbed into XCU-16. `[FACT: xcut-ingestion-ai.md:102;
ADR-014:50,111]`.
- **U-4 — The concrete `import_staging` / `connection_config` / integration-registry columns** — build-phase, owed
  to ADR-002 §5.20; M1 ports abstract over them. `[FACT: ADR-014:86,125-128]`.

## Verdict

A real **BUILD** of a pure engine/decision/registry tier (no schema, no runtime network, deny-safe ports) over
the BUILT capability enforcer (`#31`) and egress guard (`#43`) — the one cross-cutting model for every module's
external-data ingestion, foundation-first. Every shape question (R-1…R-5) is **settled in the documentation**;
the four UNKNOWNs (U-1…U-4) are **corpus-flagged as out-of-scope** (owed-decision / M2-infra / PC-4 / build-phase
schema), not open choices for this head. The build ratifies the docs. Slice count + backend/frontend split →
the Decomposition Gate (Step 2).
