---
Session 4 — 2026-08-20
Goal: DB-4 per-domain schema — pick up next head (was #13 Languages); resolve a Victor-flagged structural drift instead.
Profile: add-backend-component
---

## Accomplished
- **Corrected a structural plan drift (Victor-flagged at session start).** DB-4 group **#13 Languages**
  was scheduled as a bespoke ~9-table schema group sourced from **ADR-002 §5.10 Language Learning Domain**,
  but **ADR-006 (Accepted 2026-07-15) had already dissolved Languages into a Spaces worked-example** — a
  month before the 2026-08-18 P0 slice. So §5.10 is STALE/superseded and the group authors **0 tables**.
- **Doc sweep + scope check** (Victor: "check all the other ones that might fall on this scope"):
  - Evidence: `features/README.md:52` ("Not a module — a configuration of generic seams"),
    `intake/spaces.md:1-8,91` (pivot origin + SP7 ✅ CONFIRMED), `core/spaces/README.md:38`, ADR-006.
  - The **three ADR-006 worked-examples** are Languages · Duties · Bucket List. P0 **D4** dissolved two
    correctly (Bucket List→`dreams` #8; Duties→Tasks `kind` #4); **D2** slipped Languages through — an
    internal self-contradiction in the same P0 slice.
  - **Sweep result: Languages is the SOLE remaining drift.** No other group #14–#22 is a Spaces composition.
- **Applied the correction (no code touched — nothing was authored for #13):**
  - `.claude/tasks/db-4-per-domain-schema.md` — roster header **22→21 active**; D2 grain-decision rewritten
    with citations; row #13 struck to `🚫 DISSOLVED → Spaces (0 tables)`; dated **Route History** entry.
  - `TASKS.md` — CURRENT "Next session" note rewritten (head re-routed **#13→#14 Relationships**,
    13 of 21 done / 8 remain); stale "For #13 Languages" guidance superseded; In Progress cell reconciled;
    Group #12 wrapped in `<details>` (balanced).
  - `.claude/docs/decisions.md` — new decision row.
  - Memory saved: `db4-group-source-can-be-superseded-into-spaces` (+ MEMORY.md index line).

## Decisions Made
- **Languages is NOT a DB-4 schema group** — it's a Spaces worked-example (ADR-006 SP7), a build-time
  deliverable that composes already-authored primitives (`knowledge_objects` #10 · Sessions #3 ·
  `entity_tags`/`spaces`/`views` AR-6 · capability Blocks AR-7 · a Template ADR-009). ADR-002 §5.10 STALE.
- **Roster is 21 active groups** (row #13 kept in the table as struck/dissolved so #14–#22 refs stay valid).
- **Next concrete head = #14 Relationships** (not #13).

## Open Questions
- none. (Languages' worked-example write-up is deferred to build-time, post-primitives — not DB-4.)

## Next Session
First step: open **DB-4 group #14 Relationships** — P1 intent intake, FRESH clean-context. Read FULL
5-aspect `docs/features/relationships/` + ADR-002 § + `part-1.2-reruns/relationships.md`; grep intake+reruns
FIRST; the Phase-1 No-Decisions Gate is the recurring trap.
Context to reload: `.claude/tasks/db-4-per-domain-schema.md` "## P0 Output" (now-21 roster) + "## Build Steps"
(5-phase lifecycle) · flow doc `docs/roadmap/schema-foundation-build-flow.md §2` · memories
[[db4-group-source-can-be-superseded-into-spaces]] · [[stale-source-plus-live-convention-is-fact-not-a-decision]] ·
[[open-vocab-columns-take-no-sql-check]] · [[session-extensions-carry-no-deleted-at]].
