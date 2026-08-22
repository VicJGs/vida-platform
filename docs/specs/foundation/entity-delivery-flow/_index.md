# Entity Delivery Flow — a documentation-first, decomposition-gated build methodology

> **Status: DESIGN (2026-08-22).** Designed in a MOD-notes session; **not yet codified into the
> dev-toolkit** and not yet battle-tested. The plan is to VALIDATE it by running the **recovery
> variant** on the Notes & Pages entity (next session), then codify the proven shape into the toolkit
> (`/enhance-scenario` add-frontend-component + a new backend scenario). Until then this doc is the
> single source of truth for the methodology.
>
> **Provenance:** conversation-designed with Victor. Every phase maps onto the existing canonical
> spine — it is an **overlay, not a rewrite**. Governed by the **No-Guessing Principle**
> (`claude-profiles/project-foundation/knowledge/reference-docs/levels-aspects-framework.md`): every
> claim is `FACT` / `INTERPRETATION` / `UNKNOWN`.

---

## 1. The principle

**Document the entity whole → make the implicit explicit → decide how to slice it → build each slice
through a gate → verify each slice before starting the next.**

The failure this prevents: an entity gets split into a backend track and a frontend track *at the top*,
each does its own planning in isolation, the seam between them is implicit, decomposition drifts, and
per-slice verification gets batched/owed. (Observed live on MOD-notes: a manufactured ②c/②d split, and
②b/②c Visual Gates left "owed".)

## 2. Where it fits (overlay on the existing spine)

This methodology does **not** replace §XXVI (Per-Step Build Gate), §XXVII (Session Path), §XXIX
(Currency Rule), or §XXX (the espinha). It slots the entity-level front matter *before* the per-slice
§XXVI gates and keeps every bookend (`/begin`, task link, currency, `/session-end`) intact.

- The **PLAN gate** and **IMPL-PLAN gate** per slice = §XXVI gate-1 / gate-2, unchanged.
- The **Currency** step per track = §XXIX, unchanged.
- What is **new**: the shared **Entity Front Matter** (Intake → Baseline → **Documentation Gate** →
  **Interpretation** → **Interpretation Gate** → **Decomposition Gate**) above the fork, and a **per-slice,
  blocking** verification gate at the end of each slice (Visual Gate frontend / Verification Gate backend).
- The **Documentation Gate** (on the source aspect corpus + baseline) and the **Interpretation Gate** (on the
  interpretation output) form an **escalating-trust chain**: `Baseline → ░Documentation Gate░ → Interpretation
  → ░Interpretation Gate░ → ░Decomposition░`. They gate the *yardstick* before it builds or judges code, and are
  **additive** to the §XXVI g1/g2 per-slice gates — g1 critiques a slice's *own spec* against its §2/§4
  `[FACT: standards/process.md:362]`, whereas these gate the *upstream corpus/interpretation* (different objects).

## 3. The unified flow

```
ENTITY <X>
│
╠═ ENTITY FRONT MATTER  (once, spans BOTH planes) ═════════════════════════
│  0 · INTAKE               — gather ALL sources for the whole entity
│  1 · BASELINE             — one consolidated map: data + service + UI together
│  1.25 · DOCUMENTATION ░GATE░ ★ — gate the SOURCE aspect corpus + baseline (the yardstick) before it is read/judged
│  1.5 · INTERPRETATION LAYER  ★ — make the implicit explicit (see §4), from a TRUSTED source
│  1.75 · INTERPRETATION ░GATE░ ★ — gate the interpretation output before decomposition rests on it
│  2 · DECOMPOSITION ░GATE░    ★ — decide the slices AND the backend/frontend split
│         output: slice-map.md (each slice tagged {backend | frontend | shared})
│                 + seam-contract.md (the service API the UI will consume)
│
╠═ fork ═══ (backend generally precedes the UI that consumes it) ══════════
│
╠═ TRACK A · BACKEND  — "Entity Service Build Flow"  (§5)
│     3A · SERVICE SPEC SET → docs/features/<entity>/service/ → ░DOCUMENTATION GATE (spec-set)░
│     per slice: PLAN ░g1░ → IMPL ░g2░ → BUILD → VERIFICATION ░GATE░ (blocking)
│     §XXIX currency
│
╠═ TRACK B · FRONTEND — "Entity UI/UX Build Flow"  (§6)
│     3B · UI/UX SPEC SET → docs/features/<entity>/ui-ux/ → ░DOCUMENTATION GATE (spec-set)░
│     per slice: PLAN ░g1░ → IMPL ░g2░ → BUILD → VISUAL ░GATE░ (blocking)
│     §XXIX currency
│
╚═ ENTITY CLOSE — both tracks green, every slice's gate PASS ══════════════
```

The **seam contract** (Phase 2) is what keeps the two tracks coherent without forcing them serial: the
frontend plans against a *known* service API (real or stubbed), and both tracks trace back to one
decomposition.

## 4. The Interpretation Layer (Phase 1.5) — make the implicit explicit

Applies to BOTH the base flow and the recovery variant. The baseline *organizes* raw docs; the
interpretation layer *reads them adversarially* and writes down everything they leave implicit, so
decomposition rests on stated facts. It is the place where every `INTERPRETATION` is forced onto paper
and every `UNKNOWN` is flagged rather than silently guessed.

**Artifact:** `docs/features/<entity>/delivery/interpretation.md` — four sections:

| Section | Captures |
|---------|----------|
| **DEPENDENCIES** | every upstream — services, schema tables, packages, seams, other modules — each `[FACT: path:line]` |
| **NEEDS** | every precondition to function: vault/libsodium loaded, device-id, registry entries, injected deps, boot ordering |
| **ORGANIZATION** | ownership boundaries — what the entity OWNS vs CONSUMES vs DELEGATES |
| **IMPLICIT RULES** | surfaced hidden invariants — what a doc implies but never states |

**Why it has teeth (grounded):** the `vault-not-initialized-on-boot` bug was an *implicit dependency* —
"every repository write computes a keyless `_sync_hash` needing libsodium loaded, independent of `[E]`."
No aspect doc stated it; it surfaced only when the browser crashed. The **NEEDS** section is exactly
where that dependency gets written down *before* build. The interpretation layer is a defense against
that whole bug class.

## 4.5 The yardstick gates — Documentation Gate + Interpretation Gate

The methodology is documentation-first; these two gates are what make that a **quality** claim, not just a
sequencing one. They gate the *documentation* — the yardstick everything downstream builds on and judges
against — before it is trusted. Both are **blocking**.

- **Documentation Gate** — validates the **source** the interpretation will read: the entity aspect corpus
  (`identity · structure-data · business-rules · contract · conventions · current-*`) + the baseline are
  complete, coherent, and No-Guessing-clean (every `UNKNOWN` resolved). A per-track instance also gates each
  **spec-set** (`service/`, `ui-ux/`) before that track builds.
- **Interpretation Gate** — validates the **output** of the interpretation layer (`delivery/interpretation.md`):
  every DEPENDENCY/NEED/IMPLICIT-RULE surfaced, every `UNKNOWN` flagged not guessed — before decomposition (or,
  in the recovery variant, reconciliation) rests on it.

**Why the order is strict** (`Baseline → ░Documentation Gate░ → Interpretation → ░Interpretation Gate░ →
Decomposition`): the interpretation layer *consumes* the source docs (§4, "so decomposition rests on stated
facts"). You cannot soundly derive from an un-gated input — gate the input first, then gate the derivation.
Baseline sits *before* the Documentation Gate because it only *organizes* raw docs; it asserts nothing to gate.

**Additive, not redundant** with §XXVI g1/g2: g1 critiques *a slice's own spec* against its §2/§4
`[FACT: standards/process.md:362]`; these gate the *upstream corpus + interpretation* — **different objects**.
In the recovery variant this double-gating of the yardstick (source, then interpretation) is exactly what makes
the reconciliation's `❌ wrong` verdicts trustworthy: the code is judged against a doc that was itself gated.

## 5. Backend track — "Entity Service Build Flow"

Shaped for backend nuances — not a mirror of the UI lenses. **Five lenses:**

```
docs/features/<entity>/service/
├─ _index.md          service scope + traceability (operation→flow→invariant→slice→gate)
├─ operations.md      the operation surface: every method, signature, typed error set
│                       (backend's "Screens" = its operations)
├─ operation-flow.md  full CRUD lifecycle: create→read→update→soft-delete→restore, idempotence paths,
│                       transaction boundaries, data-flow (validate→repo→encrypt-seam→return)
├─ invariants.md      the entity business rules the service ENFORCES — references business-rules.md,
│                       does not restate it
├─ contract.md        the backend's "UX" = the DX contract consumers feel: return shapes (Rows),
│                       input/validator schemas, typed-error taxonomy, [E] encryption set, sync behavior
├─ composition.md     service dependency graph + repository wiring + seams to other services
└─ slice-map.md       ordered backend sub-units + per-slice Verification-Gate ledger
```

**Three backend-only nuances** (no UI equivalent):

| Nuance | Lives in | Why backend-specific |
|--------|----------|----------------------|
| Persistence & schema binding | `operation-flow.md` | tables/migration, `[E]` set, sync-queue enqueue |
| Concurrency & transactions | `operation-flow.md` | txn boundaries, the DP-8 mutex (what ②a wrestled) |
| Security / zero-knowledge | `contract.md` | encrypt-seam, keyless `_sync_hash`, vault gating |

**Verification Gate** (backend's Visual-Gate analog — per slice, blocking, granular):
```
per backend slice: Vitest (logic + failure paths) → typed-error assertions
                   → live smoke on the REAL DB (not fixtures) → persistence probe where local-first
                   → PASS before the next slice
```
A live-DB smoke of a write path exercises `hashContent()` — it would have caught the vault bug before a
browser did.

## 6. Frontend track — "Entity UI/UX Build Flow"

**Five lenses:**

```
docs/features/<entity>/ui-ux/
├─ _index.md          UI scope + traceability spine (screen→flow→component→slice→gate)
├─ screens.md         inventory of every view/route + its 8 states (§VIII)
├─ screen-flow.md     the full CRUD navigation + state machine per operation
├─ ux.md              interaction states · a11y (§XIV) · responsive (§X) · motion (§IX) · copy
├─ components-flow.md  component tree: which @vida/ui / @vida/editor primitives compose into which
│                       feature components + the data/props flow
└─ slice-map.md       ordered sub-units + per-slice Visual-Gate ledger
```

**Visual Gate** (per slice, blocking): real browser (chrome-devtools MCP / Brave), drive every state ×
{light | dark} × {375 · 768 · 1440}, §XIV a11y sweep, `/component-audit` +
`victor:quality-gate-components` + `-engineering`, capture screenshots as evidence → PASS before the
next slice. **No batching, no "owed."**

**Reconciliation (no duplication):** "Entity Business Rules" already lives at
`docs/features/<entity>/business-rules.md` + `current-business-rules.md`. The UI/UX and service lenses
**reference** it and the other existing aspects (`identity`, `structure-data`, `contract`,
`conventions`) — they never restate them.

## 7. The recovery variant — "Entity Re-scope Flow"

For an entity **already partly built, possibly wrong, possibly ungated** (MOD-notes today). Inserts two
phases after Intake→Baseline→Interpretation (with the BUILT CODE now also a source), then rejoins the
normal tracks. Composes existing tools — `/audit-existing`, `victor:impact-scan` — and gives them a
**persisted ledger** and a **re-scope gate**.

```
INTAKE → BASELINE → ░DOCUMENTATION GATE░ → INTERPRETATION (+ built code is a source) → ░INTERPRETATION GATE░
│   (the front-matter gates run ONCE, cross-plane; the standards union is loaded at Step 0 — see §5/§6 scenarios)
│
╠═ AUDIT / RECONCILIATION layer ═══ ★variant-only★
│    sweep BOTH planes (① service + ② surface) vs INTERPRETATION, item by item, each cross-checked code ↔ its
│    doc layer AND tagged {backend | frontend | shared}:
│      ✅ aligned       built + matches docs + gated
│      ❌ wrong         built but diverges from docs/intent   → fix
│      📄 undocumented  code exists, no doc                   → back-fill doc
│      🕳 gap           documented, not built                 → scope + build
│      ⛔ ungated-owed  built but a required gate never ran   → run the gate
│    EXHAUSTIVE sweep — exit condition is a DRY pass (zero new items), not "I think I got them all"
│
╠═ RE-SCOPE ░GATE░ ═══ ★variant-only★
│    reconciliation ledger → a CORRECTED, TAGGED slice-map (every ❌/📄/🕳/⛔ becomes a scoped slice with
│    its gate AND its plane). Approved before any further code.
│
╚═ resume BY TAG: backend slices → ░Verification Gate░ · frontend slices → ░Visual Gate░ (shared → both)
```

**Artifacts:** `delivery/reconciliation.md` (the ledger) → feeds a re-scoped `slice-map.md`.

## 8. Directory layout

```
docs/features/<entity>/
├─ (existing aspects: identity · structure-data · business-rules · contract · conventions · current-*)
├─ delivery/            ENTITY FRONT MATTER (both planes, once)
│   ├─ baseline.md
│   ├─ interpretation.md   ★ dependencies · needs · organization · implicit rules
│   ├─ reconciliation.md   ★ recovery-variant only — built-vs-docs audit ledger
│   ├─ slice-map.md        decomposition / re-scope output (slices tagged backend|frontend|shared)
│   └─ seam-contract.md    the backend↔frontend API seam
├─ service/            TRACK A spec set (backend — 5 lenses, §5)
└─ ui-ux/              TRACK B spec set (frontend — 5 lenses, §6)
```

## 9. Doc-fixed reconciliation — the Decomposition Gate has two modes

In this repo an entity's ①/② split and sub-unit lettering can be **doc-fixed** (e.g.
`m1.1-delivery-plan.md §9`; MOD-notes' ②a–②e in `current-spec.md:9`). The Decomposition Gate must never
fork against a fixed structure ([[dont-split-a-doc-fixed-increment-subunit]]):

- **Decide mode** — net-new entity, no prescribed split → Phase 2 *chooses* the slices + the
  backend/frontend boundary.
- **Ratify + detail mode** — doc-fixed entity → Phase 2 *records and validates* the prescribed split and
  adds what the docs leave open (the seam contract, the per-slice gate ledger). It gives the existing
  split a coherent parent instead of inventing a new one.

## 10. Application to MOD-notes (the immediate use case — recovery variant)

Notes runs the **recovery variant** in **ratify mode** (the ①/②a–②e split is doc-fixed — retrofit, do
not re-decide). Grounded reconciliation-ledger sketch (the real sweep runs next session):

| Item | Plane | Bucket | Action |
|------|-------|--------|--------|
| notes aspect corpus + `delivery/` front matter | shared | 📄 → ░Documentation Gate░ | gate the yardstick BEFORE the sweep (the ledger itself then clears the ░Interpretation Gate░) |
| ① backend service | backend | ✅ aligned | re-read vs its `current-*` under the sweep; none if aligned |
| ②a data plane | shared | ✅ aligned | none |
| ②b `/notes` surface | frontend | ⛔ ungated-owed | run Visual Gate + `/component-audit` |
| ②c editor + picker | frontend | ⛔ ungated-owed + 🟡 uncommitted | run Visual Gate + commit |
| 2 bug fixes (vault, empty-doc) | shared | 🟡 uncommitted | commit with the gate result |
| implicit deps beyond libsodium (device-id, registry, entity_type reg) | shared | 📄 interpretation sweep | write `interpretation.md`; verify no latent bombs |
| ②d panels / ②e search | frontend | 🕳 gap | scope under the new tagged slice-map |
| `delivery/` + `ui-ux/` + `service/` docs | shared | 📄 undocumented | author the front matter |
| `core-vault-init-on-db-open` (spun-out) | **backend** | 🕳 gap (homed) | Service slice → ░Verification Gate░ — **the cross-plane instance the old single-plane recovery stranded** |

That table *is* the re-scoped path — nothing left behind, every owed gate homed, every row routed to the gate its
plane owns.

## 11. Open items / next steps

1. **Next session:** run the recovery variant on Notes in the corrected order — `baseline.md` →
   ░Documentation Gate░ → `interpretation.md` → ░Interpretation Gate░ → `reconciliation.md` (EXHAUSTIVE,
   **sweeping both planes ①+②, each item tagged** {backend|frontend|shared}) → the re-scoped, **tagged**
   `slice-map.md` → resume by tag: the owed ②b+②c **Visual** Gate + any backend slice (e.g.
   `core-vault-init-on-db-open`) under its **Verification** Gate.
2. **After validation:** codify the proven shape into the toolkit — `/enhance-scenario
   add-frontend-component default` (Phase 2 + `ui-ux/` set + blocking Visual Gate) + a new backend
   scenario for the Entity Service Build Flow; update §XXX espinha references if warranted.
3. **Naming still open (confirm before authoring):** `delivery/` + `service/` + `ui-ux/` (current
   proposal) vs alternatives (`api-ux/`, `backend/`/`frontend/`).

## 12. Insight — two tools, opposite directions

The **interpretation** layer and the **reconciliation** layer are the same instrument aimed two ways:
interpretation makes the *docs'* implicit content explicit (forward, before build); reconciliation makes
the *code's* drift from docs explicit (backward, after build). Both exist to kill silent assumptions —
one before, one after. "Nothing left behind" holds only if the reconciliation sweep is **exhaustive**
(a dry pass), not sampled.
