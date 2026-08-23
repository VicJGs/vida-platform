<!-- service/slice-map.md — Track A · §5 lens 6. Ordered backend sub-units + per-slice Verification-Gate
     ledger. Mirrors the delivery/slice-map backend slices. Born 2026-08-22 (recovery). -->

# Backend slice map — Notes & Pages (Track A)

The Verification Gate = Vitest (logic + failure paths) → typed-error assertions → live-DB smoke on the REAL
store → PASS before the next. `[FACT: entity-delivery-flow/_index.md §5]`

| Slice | Scope | Status | Verification Gate |
|-------|-------|--------|-------------------|
| ① NotesService | pages/page_links/note_attachments CRUD + wiki + NP-8 + facades + tag-reads | ✅ BUILT + MERGED | PASSED at ① — `__tests__/notes-service.test.ts` 16 cases (CRUD 6 types · NP-2 · destructure-safety · NP-5 revive · resolveWikiLink · NP-8 idempotent+deterministic · NP-6 · facade delegation · tag reads · attachments) `[FACT: ../current-spec.md:110-113]` |
| ②a data plane | worker `values` · DP-8 mutex · device-id · boot · accessor · hooks | ✅ BUILT + committed | PASSED at ②a — 13 jsdom + CI e2e (`notes-data-plane.spec.ts` positional read-back + reload-persist) `[FACT: ../current-spec.md:54-56]` |
| **S6 `core-vault-init-on-db-open`** | hoist `initVault()`/libsodium-readiness into `@vida/core` DB-open (every platform) | 🕳 **OWED** | **░Verification Gate░ (owed)** — Vitest: a repo WRITE path exercises `hashContent()` (would have caught the vault bug); live-DB smoke; typed-error on missing-crypto. Task `.claude/tasks/core-vault-init-on-db-open.md`. Own §XXVI gate. |

## S6 detail (the cross-plane slice)

**Why backend:** NEED #1 (keyless `_sync_hash` needs libsodium) belongs to every repository write on every
platform, not just `apps/web`. Today it's satisfied app-side (`boot.ts:58`); mobile/desktop would re-hit the
crash. Hoisting into the `@vida/core` DB-open path makes the readiness a service-owned invariant.
**Verification (not Visual) Gate** — no rendered surface; proven by Vitest + a live-DB write smoke.
`[FACT: ../delivery/reconciliation.md #20; ../delivery/interpretation.md "cross-plane ownership tension"]`

**Currency (end bookend):** after S6 lands, refresh this `service/` set + `../current-*` against what shipped
(§XXIX).
