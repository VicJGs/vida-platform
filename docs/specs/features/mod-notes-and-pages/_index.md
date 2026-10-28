# Spec: feature:mod-notes-and-pages (① `@vida/core` Notes & Pages service)

Status: draft
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].

The `@vida/core` Notes & Pages **service** — the in-degree-14 connective HUB — built over the finished
DB-4 schema (`schema/notes.ts` + migration `033_notes.ts`). Prior impl (`f31b807`) torn down (`eaf64f8`),
re-planned holistically; this is the clean rebuild (LIF-131, M1.1.1 head #35).

**Authority:** `docs/specs/foundation/backend-intent/parts/notes-and-pages.md` (NOT-01…54, ratify-mode).
**Delivery (Entity Delivery Flow v1):** `docs/features/notes-and-pages/delivery/{interpretation,slice-map,seam-contract}.md`
— Decomposition Gate PASSED (Approval 1, 2026-09-19).

## Slices (each = own §XXVI double-gate + per-slice Verification Gate)

- **S1 — Service shell + Pages core** → `sessions/PLAN-s1-pages-core.md` · **✅ BUILT (2026-09-19)** — @vida/core 979 green; current-\* born at `docs/modules/notes/`
- **S2 — Entity notes + attachments** → (pending S1)
- **S3 — Page-links + wiki resolution** → (pending S1)
- **S4 — Delegation facade + registry** → (pending S1, S3)

The old `docs/specs/features/mod-notes/_index.md` (marked "implemented", torn down) = shape reference only.
