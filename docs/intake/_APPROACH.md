# The Intake Approach — collaborative & current-intent-authoritative (2026-07-14)

The method for documenting every module. Corrects a mistake made starting at Health: letting the **Notion design
railroad the spec** into a dated transcription. `[Victor 2026-07-14]`

## The source stack (per module)
Documentation is a **synthesis** of, in ascending authority:
1. **Code (v2)** — FACT, the as-is structure/floor.
2. **life-os v1** — context (what was attempted).
3. **Notion designs** — rich but **years-old INTENT / context. NOT the core, NOT the ceiling.**
4. **⭐ Victor's CURRENT intent** — **authoritative.** New developments since · improvements · enhancements ·
   **integrations documented as intent** · **new features**. This layer overrides the others where they differ.

## The collaborative principle (not a one-way interview)
We build **together**. After harvesting 1-3, the assistant does **not** just ask open questions — it **proposes**:
- **Examples & suggestions** drawn from Victor's own established patterns elsewhere in the OS (foundation-first /
  "keep the seam, retire the instance" · derived metrics/progress · provider seams+registry · the manual/AI/import
  authoring triad · the Adaptation/experiment engine · Spaces · compound sets · dispatch/orchestration · derived
  mastery).
- **Out-of-the-box ideas** — genuinely new, but always **anchored to the OS core**: zero-knowledge · local-first ·
  the **meaning-spine** (everything can ladder to Purpose) · **autonomy-with-clarity** · the extension-model ·
  what the OS is *built for and why*.
Victor reacts, refines, adds. The synthesis is the doc.

## Per-module flow
FACT harvest → v1 → Notion (context) → **co-create CURRENT intent (assistant proposes + Victor refines)** →
**COHERENCE + REALISM validation** → synthesize → Transform → Verify (gate) → Accept. **Never mark an intake WHOLE
on Notion (or code) alone** — the current-intent layer is required.

## ⚠ COHERENCE + REALISM validation (mandatory step — added 2026-07-14, Victor-caught gap)
Before Transform, every new incrementation/idea is checked against FOUR lenses; a failure is a blocker or an
explicit ADR-gated decision:
1. **Constitution/identity** — does it comply with `docs/core/business-rules.md` (ZK-1..INT-1: zero-knowledge ·
   local-first · **single-user/no-sharing (SU-1)** · encryption · data conventions · integration hub)? A conflict
   is surfaced LOUDLY, not waved through as "extension-model, opt-in."
2. **Realism** — is it actually buildable within ZK/local-first/single-user constraints? (e.g. on-device LLM
   quality; unmeasurable skills; server-side content that could leak metadata.)
3. **Architecture / ADRs** — does it conflict with any ADR? does it need a new one?
4. **Developability** — is the intent concrete enough to build, or is it a wish? (content-curation/ops burden counts.)
The assistant proposes; a genuine tension is Victor's decision (cut · rework · ADR-gate). **This step was missing
when Health/Skills were first done → retroactively applied; findings recorded per module.**

## Retro-fix owed
**Health** (documented 2026-07-13, Notion-centered, before this rule) → owes a **current-intent pass**: co-create
CI-1..CI-4, enhance `docs/features/health/*`, re-gate. Scheduled right after Skills. This patch is why we go back
before carrying on — organize/make-right, lose nothing.
