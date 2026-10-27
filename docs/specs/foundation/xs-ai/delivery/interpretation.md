# Interpretation — XS-ai (#45, LIF-167)

> Entity Delivery Flow §3 — the interpretation layer for the `foundation/ai` AI-application-services tier.
> Every claim is `[FACT: path:line]`, `[INTERPRETATION]`, or `[UNKNOWN]` (No-Guessing Principle).
> Mode: **Build-from-docs** (§8 Decide-mode) — P3 fixed **11 legs**, no prior code exists (Step-0 baseline:
> `foundation/ai/` has only a `CLAUDE.md` directory-home; `[FACT: packages/core/src/foundation/ai/CLAUDE.md]`).
> Source of the split: `[FACT: docs/specs/foundation/backend-intent/decomposition.md:40]` (build-deps
> `XS-egress-guard, XS-ingestion`, runtime read-seams `—`, 11 item-ids XCU-17…27).
> Sibling precedent (same shape-class, built last two sessions): **XS-egress-guard #43** + **XS-ingestion #44** —
> `[FACT: docs/specs/foundation/xs-egress-guard/delivery/interpretation.md; docs/specs/foundation/xs-ingestion/delivery/interpretation.md]`.
> ⚠ **Task-file ADR typo:** `xs-ai.md` Goal cites "ADR-014/020"; **ADR-020 is Zustand store placement (a
> frontend concern), not an AI ADR.** The governing ADR is **ADR-015** (AI/LLM under ZK), reusing **ADR-014
> §3.3** (egress) + **ADR-010** (sandbox) + **ADR-004 §3.2.5** (write rail). `[FACT: ADR-015:8-12 Amends/Inherits;
ADR-020-zustand-store-placement.md title]`.

## Scope in one line

Build the **cross-cutting AI-application SERVICE tier** — the one coherent model by which _every_ AI-touching
module runs a model **without our server ever seeing a byte**: a **per-use two-mode choice** (on-device/agentic,
ZK-safe · cloud BYO-key, a disclosed plaintext dent), a **cloud call that IS an egress** riding the built guard
with **scope-minimization**, the **`askModel` mediator-injected primitive** (the agent never holds the key), the
**agent-as-mediated-actor** rule (tool-set = granted envelope, fails closed), **prompt-injection bounding**,
**`source = ai` authorship provenance**, the **`ai_connections` config** + **on-device runtime** seams, and the
**AI-egress audit** — all on top of the capability enforcer's `external_out_ok` boolean (#31) and the egress
guard's `assertEgressPermitted` (#43). `[FACT: ADR-015:16-24 (§1); decomposition.md:40]`

## Scope boundary — foundation-first, M1 seam not M2 wiring

The corpus is explicit that these legs are **"M2-facing (no module ships these at M1), but the service-tier
seams are captured now so the corpus is complete."** `[FACT: xcut-ingestion-ai.md:5-6]` No M1.1.2 module actually
calls a model yet — Projects agentic AI, Health photo/plan-gen, Books OCR, Skills draft, Learning syllabus,
Fiscal advisement are all later MOD builds that list XS-ai as an **upstream runtime read-seam**
`[FACT: decomposition.md:56,58,61,62,63,65,67,71,76 — MOD-books/finance/health/knowledge/learning/projects/skills
all list XS-ai as a dependency]`. A **separate M2 issue** owns the actual `askModel` runtime for modules —
`[FACT: .claude/tasks/p3-4-integrations-ai-llm.md (LIF-145, "M2 — External Integrations & Security Boundary",
Goal "askModel runtime for modules")]`. So this head builds the **finished decision/mode/disclosure/agent-gate
tier + its mediation/runtime/config PORTS**, which the M2 module connectors + the P6 mode-choice/egress-review/
management UIs then ride — `[FACT: reconstructed-structure.md FE-integrations-ai-surfaces ← XS-ai;
xcut-ingestion-ai.md:35,37,44 (XCU-18u/19u/25u = P6 UI)]`. The **durable stores** (`ai_connections`,
`ai_conversations`, the AI-egress audit rows), the **real BYO-key mediator + provider calls**, the **actual
on-device model runtime + acquisition**, and **all AI UIs** are M2/P6 (see DELEGATES + UNKNOWNs). `[INTERPRETATION
from xcut-ingestion-ai.md:5 + ADR-015 §5 owed-schema-is-build-phase + DB-4 closed with no ai_* tables (Step-0 grep)]`

## The 11 legs (P3-homed `decomposition.md:40`, all typed `service`) — grouped by build shape

> XCU-06/08 (egress) → **XS-egress-guard #43 BUILT**; XCU-09 (mediator custody) + XCU-01…05/10…16 → **XS-ingestion
> #44 BUILT**; XCU-07 (grant semantics) → **XS-capability #31 BUILT**; every `*u` leg → **P6 UI**. Those are OUT
> of this build `[FACT: decomposition.md:40,42,45; xcut-ingestion-ai.md:35,37,44]`.

**Group A — pure engine / rules (no port, no schema; buildable now, deterministic):**

- **XCU-18 — Two-mode execution.** Offer exactly `on_device` (agentic; no vault content leaves; residual =
  model-acquisition leak; telemetry-off/no-ambient-network runtime) + `cloud` (BYO-key, device→provider direct)
  as a **per-use informed choice, not a global setting**; neither routes through our server. `[FACT:
xcut-ingestion-ai.md:34; ADR-015:41-46 (§3.1); capability-framework.md:211 (AI1)]` → BUILD (the `AI_MODE` enum
  - the per-use-choice invariant). The mode-picker UI (XCU-18u) is **P6, OUT** `[FACT: xcut-ingestion-ai.md:35]`.
- **XCU-20 — Honest content-egress bound disclosure builder.** The service _computes_ the cloud-mode disclosure
  payload (user-chosen slice in plaintext to provider + IP/API-key identity + cross-call profile; request
  provider no-train/zero-retention where offered but disclose as _requested, not guaranteed_). `[FACT:
xcut-ingestion-ai.md:38; ADR-015:49-50 (§3.2)]` → BUILD (pure `buildAiDisclosure(mode)`, twin of
  ingestion's `buildDisclosure`). The egress-review UI (XCU-19u) is **P6, OUT** `[FACT: xcut-ingestion-ai.md:37]`.
- **XCU-24 — AI-authorship provenance stamp.** Model-generated rows carry **`source = ai`** (the
  `manual|ai|import` triad); persisted chat/assist turns store encrypted (`ai_conversations`, EN-2). AI is never
  an unlabeled source of truth. `[FACT: xcut-ingestion-ai.md:42; ADR-015:64 (§3.6); capability-framework.md:216
(AI6)]` → BUILD (a pure `stampAiProvenance` helper; the row **writes via each module's service** — no store
  here; the `ai_conversations` durable table is M2).
- **XCU-17 — LLM-pipeline split routing (the ingestion↔ai seam).** A model-involving pipeline splits: ADR-014
  moves the data (consent+egress), ADR-015 governs the model call; a photo→text pipeline is both. `[FACT:
xcut-ingestion-ai.md:33; ADR-014:76 (§3.7); ADR-015:66 (§3.7); capability-framework.md:205 (X11)]` → BUILD (the
  **seam contract** declaration: the AI half is the `askModel` entry that ingestion's `fetchThroughMediator`
  hands a fetched-then-cognized payload to). Documented in `seam-contract.md`.

**Group B — guard / decision service over the enforcer + egress (deny-safe ports; egress/ingestion-twin shape):**

- **XCU-22 — `askModel(scoped_slice)` mediator-injected primitive.** An agent/capability calls a **mediated**
  primitive; the OS mediator **injects the BYO-key credential + makes the provider call + returns the response**;
  the agent **never sees the key**; **every** `askModel` call **re-hits the per-target egress consent + scope
  gate** (each cloud hop its own consented egress step — **no silent on-device→cloud upgrade**). `[FACT:
xcut-ingestion-ai.md:40; ADR-015:58 (§3.4a); capability-framework.md:214 (AI4)]` → BUILD (`askModel` over a
  **mediator port** [M1 deny-safe → `model_unavailable`, no network] that **first** routes the call through
  `egressGuard.assertEgressPermitted` with a model-kind target; the credential-custody invariant mirrors ingestion
  IR-8/XCU-09).
- **XCU-19 — Cloud call = egress + scope-minimization.** A cloud AI call rides the ADR-014 §3.3 egress guard
  (XCU-06) **AND** minimizes scope — send **only the slice the task needs**, never the whole vault; optional
  field redaction (**a blast-radius trim, not a privacy control** — a finance-advice call sends finances by
  definition). `[FACT: xcut-ingestion-ai.md:36; ADR-015:54 (§3.3); capability-framework.md:213 (AI3)]` → BUILD
  (compute the minimal `EgressSlice` + route through `egressGuard.assertEgressPermitted`; the real send is the
  mediator port). Composes egress #43; does not re-implement the gate.
- **XCU-21 — Agent-as-mediated-actor (tool-set IS the envelope).** An agent's callable tool-set **is exactly**
  its ADR-010 granted envelope (any tool outside → **fails closed**); it holds **no ambient authority** and
  cannot bypass the single ADR-004 §3.2.5 write path; tool-writes ride the guarded-write rail. `[FACT:
xcut-ingestion-ai.md:39; ADR-015:56 (§3.4); capability-framework.md:214 (AI4)]` → BUILD (the tool-gate
  `assertToolPermitted` delegating each tool to `enforcer.checkAction` as its `binding`/`effect` action, fails
  closed by default). The **tool-registry contents are UNKNOWN/deferred** — only the authority rule is locked
  `[FACT: xcut-ingestion-ai.md:66,105; ADR-015:74]`.
- **XCU-26 — On-device model runtime seam.** Acquire the local model via the ADR-014 Layer-2 whole-set/mirror
  discipline; the runtime **must ship telemetry-off, no-ambient-network** (never silently phone home / never
  silently upgrade to cloud). `[FACT: xcut-ingestion-ai.md:45; ADR-015:51 (§3.2), :115 (§5 SERVICE)]` → BUILD
  (the on-device-runtime **port** [M1 deny-safe → `on_device_unavailable`] + the telemetry-off/no-upgrade
  invariant). The concrete local model + acquisition are M2 `[FACT: xcut-ingestion-ai.md:104]`.

**Group C — config / audit with an M2 store (engine pure now over a deny-safe port):**

- **XCU-25 — `ai_connections` config management.** Per-provider (`mode{on_device,cloud} · provider ·
encrypted_key[L2/L3, mediator custody] · default_scope · requested_no_train`); the **key never in
  sandbox/agent reach**. `[FACT: xcut-ingestion-ai.md:43; ADR-015:114 (§5 ADD), :62 (§3.5);
capability-framework.md:212 (AI2)]` → BUILD (the connection-config types + an in-memory registry over a store
  **port**; the `ai_connections` durable table + real key custody are M2). The dedicated AI management page
  (XCU-25u) is **P6, OUT** `[FACT: xcut-ingestion-ai.md:44]`.
- **XCU-27 — AI-egress audit log.** Record **what was sent to which model when** — the AI-specific instance of
  the XCU-06 egress audit trail. `[FACT: xcut-ingestion-ai.md:46; ADR-015:54 (§3.3 audit), :115 (§5 SERVICE)]`
  → BUILD (the AI-egress record shape; **delegates persistence to the egress audit port** — `assertEgressPermitted`
  already returns + persists an `EgressAuditRecord`; the durable append-only store is M2).

## DEPENDENCIES (every upstream)

- **CapabilityEnforcer (`#31`, BUILT)** — decides the **`external_out_ok` boolean** + the in/out compositional
  union across action checks; and, for XCU-21, adjudicates each agent tool as its `binding`/`effect`/`sensitive`
  action via `checkAction`, **fails closed** by default. `[FACT: docs/core/capability/current-spec.md:22-30
(checkAction discriminated `{effect|binding|media|external_in|external_out|sensitive}`; fail-closed default;
SENSITIVE_MODULE_CLASSES {finance,health})]`.
- **EgressGuard (`#43`, BUILT)** — a cloud AI call **is** an egress; XCU-19/XCU-22 route through
  `egressGuard.assertEgressPermitted(act)` with an `EgressTarget{ kind:'model' }`. The `model` target kind + the
  `external_out` boolean + sensitive-union + per-target consent + audit-record already exist. `[FACT:
docs/core/egress/current-spec.md:14-31 (assertEgressPermitted; EgressTarget kind model|external_system|webhook;
UserInitiationProof; EgressSlice{summary,sensitiveModules}; deny-safe consent + no-op audit ports)]`.
- **IngestionGuard mediator (`#44`, BUILT)** — the **mediator credential-custody** pattern (XCU-09/IR-8:
  encrypted config held by the mediator, **never handed to sandbox**; injects credential + returns only the
  result) is the exact model XCU-22's `askModel` primitive follows; ingestion's `fetchThroughMediator` is the
  device-side twin (M1 → `mediator_unavailable`). `[FACT: docs/core/ingestion/current-spec.md:22-33
(fetchThroughMediator; mediator port deny-safe)]`.
- **ADR-004 §3.2.5 guarded-write rail** — NOT owned here; an agent tool-write + an `ai_conversations` persist
  ride it. `[FACT: ADR-015:56 "cannot bypass the single ADR-004 §3.2.5 write path"; ADR-015:70 "Does NOT own …
the write rail"]`.
- **ADR-010 sandbox** — NOT owned here; the agent _runs in_ it. XCU-21 locks the **authority model** (tool-set =
  envelope, fails closed); the sandbox execution + user-code runtime are `#116 CAP-authoring` (M4). `[FACT:
ADR-015:70 "Does NOT own … the sandbox (ADR-010)"; ADR-015:74]`.
- **NO new schema in M1.** `ai_connections`/`ai_conversations`/`source=ai`/the AI-egress audit are **owed schema,
  build-phase, tracked ADR-002 §5.20** `[FACT: ADR-015:9,113-114 (§5 owed-schema, "no DDL into its body per D5")]`;
  DB-4 (M1.0, closed) authored **none** of them (Step-0 grep across `packages/core/src/db/schema/`) → M1 uses
  deny-safe/in-memory ports; the durable stores land **M2**. `[FACT: xcut-ingestion-ai.md:5; Step-0 baseline]`.

## NEEDS (preconditions to function)

- **An "AI request" descriptor + a "model target"** — the units the tier adjudicates: a request
  `{ initiating def_id, mode, scoped_slice (EgressSlice), provider/model target, user_initiated proof }` and a
  model target reusing the built `EgressTarget{ integrationId, kind:'model', label }`. `[INTERPRETATION —
assembled from XCU-18/19/22 requirements; EgressTarget reused, docs/core/egress/current-spec.md:26]`.
- **The initiating cap's grant resolvable** via the enforcer — for a **cloud** call: `external_out_ok` true AND
  (the slice's `sensitiveModules` present in `consented_sensitive_modules`) else **fail closed before any model
  call is considered**. `[FACT: enforcer checkAction external_out + sensitive; ADR-015:54 (§3.3 union-of-consents)]`.
- **A user-initiation token on every cloud call** — `askModel` **re-hits** the egress gate each hop; there is
  **no silent on-device→cloud upgrade** and no auto-transmit (SU-1). `[FACT: ADR-015:58 (§3.4a "every askModel
re-hits the gate"), :46 (§3.1 per-use); ADR-014:64 (SU-1 never-auto-transmit)]`.
- **A mediator (BYO-key custody) + an on-device runtime** — both **ports** in M1 (deny-safe: mediator absent →
  `model_unavailable`, on-device absent → `on_device_unavailable`), so the agent/capability never touches a
  credential. `[INTERPRETATION from the egress/ingestion DENY_SAFE precedent + ADR-015:58 no-key-to-agent]`.
- **Provenance-tagged prompt inputs** — for XCU-23, untrusted-origin ingested content (OCR page, ICS event,
  syllabus, rule-pack) carries **provenance into the prompt**, and the outgoing egress slice is
  **user-reviewed/consented content, not agent-composed free text**. `[FACT: ADR-015:60 (§3.4b);
capability-framework.md:215 (AI5)]`.
- **Vault key** is NOT required by the tier's _decision_ path (it reads plaintext grant booleans + composes a
  decision/disclosure); any downstream **persistence** (`ai_conversations`, connection_config, AI-egress audit)
  hits the Repository content-hash + `[E]` seam — the MOD-notes bug class, backstopped by the live-store
  Verification Gate. `[FACT: memory repository-create-returns-input-row; entity-delivery-flow §Anti-Patterns]`.

## ORGANIZATION (owns / consumes / delegates)

- **OWNS:** the AI-application **decision/engine** tier — the two-mode per-use choice model (XCU-18) · the honest
  content-egress disclosure builder (XCU-20) · the `source=ai` provenance stamp helper (XCU-24) · the ingestion↔ai
  split seam contract (XCU-17) · the `askModel` mediated-primitive over a mediator port that re-hits egress each
  hop (XCU-22) · cloud-call-as-egress + scope-minimization over the egress guard (XCU-19) · the
  agent-as-mediated-actor tool-gate over the enforcer, fails closed (XCU-21) · prompt-injection bounding (XCU-23)
  · the on-device-runtime port + telemetry-off/no-upgrade invariant (XCU-26) · the `ai_connections` config
  registry over a store port (XCU-25) · the AI-egress audit record delegating persistence to the egress audit
  (XCU-27) · the typed AI deny/error taxonomy.
- **CONSUMES:** the CapabilityEnforcer's `external_out_ok` boolean + per-action `checkAction` + grant envelope
  (`#31`); the EgressGuard's `assertEgressPermitted`/`checkEgress` + `EgressTarget{kind:'model'}` + audit record
  (`#43`); the IngestionGuard mediator-custody pattern (`#44`); the ADR-004 §3.2.5 write rail for agent
  tool-writes / conversation persists; **no schema of its own** (M1).
- **DELEGATES:**
  - the `external_out_ok` **boolean** + in/out compositional union _across action checks_ → **CapabilityEnforcer
    `#31`** (BUILT);
  - the **egress gate itself** (per-target consent + union-of-consents + audit + never-auto-transmit) →
    **EgressGuard `#43`** (BUILT, XCU-06/08) — `askModel` **calls** `assertEgressPermitted`, does not re-build it
    `[FACT: xcut-ingestion-ai.md:69 (REUSE ADR-014 §3.3), :36 (XCU-19 rides XCU-06)]`;
  - the **data movement half** of an ingested-then-cognized pipeline → **XS-ingestion `#44`** (BUILT, XCU-17
    seam) `[FACT: ADR-014:76 (§3.7); xcut-ingestion-ai.md:33]`;
  - the **sandbox execution** an agent runs in + **user-authored tool registry contents** → **ADR-010 / `#116
CAP-authoring` (M4)** `[FACT: ADR-015:70,74]`;
  - the **mode-choice / egress-review / AI-management UIs** (XCU-18u/19u/25u) → **P6 UI** `[FACT:
xcut-ingestion-ai.md:35,37,44]`;
  - the **durable stores** (`ai_connections`, `ai_conversations`, AI-egress audit rows), the **real BYO-key
    mediator + provider calls**, the **actual on-device runtime + model acquisition** → **M2** (U-1…U-4);
  - the **concrete local model / cloud-provider support order / prompt-construction+redaction UX** →
    **build-phase, UNKNOWN** `[FACT: xcut-ingestion-ai.md:104]`.

## IMPLICIT RULES (surfaced hidden invariants)

- **IR-1 — Our server is blind in both modes; a cloud call is device→provider direct.** No mode, cloud included,
  routes plaintext through our server (ZK-1 absolute). `[FACT: ADR-015:46,52 (§3.1/§3.2); :71 (§3.8 does-not-relax-ZK-1)]`.
  Anti-signal: any server-side model call, any "trusted Vida-hosted model" tier (Option B/E, REJECTED).
- **IR-2 — On-device is preferred + ZK-safe-for-content; cloud is a disclosed dent chosen per-use.** The mode is a
  **per-use informed choice, not a global setting**; capability↔privacy is traded per-call. `[FACT: ADR-015:20,46
(§3.1); :43 (table)]`. Anti-signal: a global "AI on/off" toggle; defaulting to cloud.
- **IR-3 — A cloud call IS an egress — it rides the built guard, never a new path.** Per-target consent +
  union-of-consents + audit + never-auto-transmit come from EgressGuard `#43`; the AI tier **adds only**
  scope-minimization + model semantics on top. `[FACT: ADR-015:54 (§3.3); :70 (§3.8 "Does NOT own the egress
mechanism"); xcut-ingestion-ai.md:69]`. Anti-signal: re-implementing consent/audit inside the AI tier.
- **IR-4 — The honest bound is CONTENT, not metadata — named plainly.** Cloud mode exposes the **user-chosen
  slice of vault content, in plaintext, to the model provider** (a named third-party observer) + IP/API-key
  identity + a cross-call profile; we **request but cannot guarantee** no-train/zero-retention. Disclose all of
  it; never imply "encrypted in transit = private." `[FACT: ADR-015:48-50 (§3.2); :21 (§1)]`.
- **IR-5 — Redaction is a blast-radius trim, not a privacy control.** It can strip an incidental name, but **a
  call is not private about its own subject** — a finance-advice call sends finances by definition. Scope-min
  sends only the needed slice, never the vault. `[FACT: ADR-015:54 (§3.3)]`. Anti-signal: selling redaction as
  making a cloud call "private."
- **IR-6 — The agent never holds the key; the mediator injects it.** A sandboxed actor that could read the BYO
  credential could exfiltrate it (the ingestion IR-8 rule) — so it never sees one; `askModel` is a mediated
  primitive that returns only the response. `[FACT: ADR-015:58 (§3.4a); ADR-014:68 (§3.4)]`.
- **IR-7 — The tool-set IS the granted envelope; anything outside fails closed.** An agent holds no ambient
  authority; an injected instruction cannot summon a tool the user didn't grant; a tool-write cannot bypass the
  single ADR-004 §3.2.5 path. `[FACT: ADR-015:56 (§3.4); capability-framework.md:214]`.
- **IR-8 — Every `askModel` re-hits the egress gate; there is NO silent on-device→cloud upgrade.** Each cloud hop
  is its own explicitly-consented egress step; an on-device grant never implies a cloud reach. `[FACT: ADR-015:58
(§3.4a); :51,56 (§3.2/§3.4 no-silent-upgrade)]`. Anti-signal: caching consent across hops; auto-escalating an
  on-device request to cloud "to improve it."
- **IR-9 — Prompt injection can make the model _say_ something wrong; it cannot make the agent _exfiltrate past a
  consent gate it doesn't control_.** Untrusted-origin content carries provenance into the prompt; the outgoing
  egress slice is user-reviewed content, not agent-composed free text; the injected tool-call still hits the §3.3
  gate and cannot auto-widen scope or invent a target. `[FACT: ADR-015:60 (§3.4b); capability-framework.md:215]`.
- **IR-10 — AI is flagged + encrypted; it drafts, the user owns.** Model-generated rows carry `source=ai`;
  persisted turns store encrypted (EN-2); AI never becomes an unlabeled source of truth. `[FACT: ADR-015:64
(§3.6); :24 (§1)]`.
- **IR-11 — On-device is not a bare "leaks nothing."** _Acquiring_ the local model discloses which-model/version
  - IP/timing to the model source (route via ADR-014 Layer-2 whole-set/mirror discipline); the runtime must ship
    **telemetry-off, no-ambient-network**. `[FACT: ADR-015:51 (§3.2), :43 (table residual)]`.
- **IR-12 — `ai_connections` / `ai_conversations` rows are sensitive → `[E]` when persisted; the key gets
  mediator custody.** The encrypted BYO-key + persisted chat turns describe vault-bound data; the M2 stores MUST
  field-encrypt (L2/L3 `[E]`) and hold the key in the mediator, never in sandbox reach. The M1 in-memory/port
  layer never touches disk, so the constraint binds the M2 adapters, not this build. `[FACT: ADR-015:114 (§5 ADD
encrypted_key L2/L3 mediator custody); ADR-002 §L2; INTERPRETATION from ZK-1]`.

## RESOLVED FROM THE DOCS (no open decisions — all doc-determined)

- **R-1 — M1 builds the decision/mode/agent-gate/config tier + ports; M2 builds the durable stores + real
  reach.** The corpus marks all 11 legs M2-facing with the _seam_ captured now `[FACT: xcut-ingestion-ai.md:5]`;
  ADR-015 §5 routes `ai_connections`/`ai_conversations`/`source=ai`/the runtime to build-phase owed schema
  `[FACT: ADR-015:113-115]`; a separate M2 issue (LIF-145) owns the module `askModel` runtime; DB-4 (closed)
  authored none of the ai\_\* tables (Step-0 grep). This is the **identical disposition** egress-guard + ingestion
  resolved `[FACT: xs-ingestion/delivery/interpretation.md:214-219 (R-1)]`. Not a choice — the corpus + DB-4 +
  §5-owed-schema settle it.
- **R-2 — The ports are deny-safe / fail-closed, mirroring egress + ingestion.** M1 defaults: mediator
  **absent** (`askModel` → `model_unavailable`, no network), on-device runtime **absent**
  (`on_device_unavailable`), connections store **in-memory**, egress audit **delegated to the egress no-op
  port** — every path fail-closed until a caller (M2 module / real adapter) wires a live port. `[FACT:
xs-egress-guard DENY_SAFE default-port precedent; xs-ingestion mediator/fetch deny-safe ports; ADR-015:52
server-blind]`.
- **R-3 — The model target reuses the built `EgressTarget{kind:'model'}` — no new target type.** ADR-014 was
  _extended_ with a model target when egress was built (`kind: model|external_system|webhook` already ships), so
  a cloud AI call is an egress to an existing target kind. `[FACT: docs/core/egress/current-spec.md:26; ADR-015:10
(Amends ADR-014 "new target type: a cloud-model call"); egress built it in]`. Doc-mandated, not a lean.
- **R-4 — The egress gate + credential custody are delegated, not re-built.** XCU-06/08 are homed to egress
  `[FACT: decomposition.md:45 (XCU-06/08 ∈ egress); xcut-ingestion-ai.md:69 (REUSE ADR-014 §3.3/§3.4)]`; XCU-09
  mediator custody is homed to ingestion `[FACT: decomposition.md:45; xcut-ingestion-ai.md:23]`. `askModel`
  **calls** `egressGuard.assertEgressPermitted` + follows the mediator-custody pattern — it re-implements neither.
- **R-5 — The config/registry mirrors the built capability/effect/integration registries (in-memory,
  deterministic).** XCU-25's `ai_connections` config follows the ADR-004 factory-of-closures registry precedent
  already shipped (`createCapabilityRegistry` / `createEffectRegistry` / ingestion's `createIntegrationRegistry`);
  the _durable_ rows are M2. `[FACT: docs/core/ingestion/current-spec.md:42-45 registry precedent; ADR-004]`.
- **R-6 — The authority model is locked; the tool-registry CONTENTS are not this build's.** XCU-21 locks
  tool-set=envelope-fails-closed; ADR-015 explicitly defers the agentic tool-registry _contents_ to build-phase
  `[FACT: ADR-015:74 "the agentic tool-registry contents are deferred, but the authority model is locked here";
xcut-ingestion-ai.md:66,105]`. We build the gate, not the tool list.

## Open UNKNOWNs (corpus-flagged, NOT this build's to resolve — blockers only if pulled in)

- **U-1 — Local model choice / cloud-provider support order / prompt-construction+redaction UX** — build-phase,
  not locked; XCU-19/XCU-26 own the _mechanism_, the concrete choices are UNKNOWN. `[FACT: xcut-ingestion-ai.md:104;
ADR-015:74]`.
- **U-2 — Agentic tool-registry contents** (which tools an agent may be granted) — deferred; only the authority
  model (tool-set=envelope) is locked. XCU-21 builds the gate, not the contents. `[FACT: xcut-ingestion-ai.md:105;
ADR-015:74]`.
- **U-3 — The concrete `ai_connections` / `ai_conversations` columns + `source=ai` provenance DDL** — build-phase,
  owed to ADR-002 §5.20; M1 ports/helpers abstract over them. `[FACT: ADR-015:113-114]`.
- **U-4 — First-party native AI (hosting, model choice) + a future attested-cloud/TEE mode** — explicitly later /
  review-triggered; **out of scope**, must NOT be built now. `[FACT: ADR-015:62,120 (§6 review triggers)]`.

## Verdict

A real **BUILD** of a pure decision/mode/agent-gate/config tier (no schema, no runtime network, deny-safe ports)
over the BUILT capability enforcer (`#31`), egress guard (`#43`), and ingestion mediator (`#44`) — the one
cross-cutting model for every module's AI use, foundation-first, our server blind in both modes. Every shape
question (R-1…R-6) is **settled in the documentation**; the four UNKNOWNs (U-1…U-4) are **corpus-flagged as
out-of-scope** (build-phase runtime picks / tool-registry contents / owed schema / later-native). The build
ratifies the docs. Slice count + backend/frontend split → the Decomposition Gate (Step 2).
