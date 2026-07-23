# ADR-017: Phase 1.0 is resequenced features-first — build the usable product on the established local-first stack with encryption, sync, and auth deferred to a later hardening pass; deliver via web SPA (A) then graduate to Tauri desktop (D)

**Status:** Accepted
**Date:** 2026-07-23
**Decision Makers:** Victor J.
**Context:** Vida Platform — before this ADR, Phase 1.0 (the roadmap's "Structural Foundation": 35 issues across ① Database · ② Architecture · ③ Design System · ④ UI · ⑤ UX) was ordered **substrate-first** — the full consolidated schema (ADR-016, DB-2…DB-11) plus the crypto/vault substrate (AR-3) were to land *before* the product had a usable surface. That builds the hardest technology (zero-knowledge field encryption, HLC/Yjs sync, SRP auth, SQLCipher across platforms) **before** the life-management product is validated by daily use — the same over-scope-without-validation pattern that sank v1 (life-os). Victor's decision (2026-07-22/23) is to invert the order.
**Tags:** architecture · process · foundation · sequencing · delivery · local-first
**Amends (sequencing only — no architecture is changed):**
- **ADR-016 (Storage rebuild from zero)** — parks its *immediacy*, not its substance. The from-zero `schema/` rebuild still happens, but authored **per feature as the feature is built**, not as a complete-schema-first campaign ahead of the product. DB-2's HLC-representation decision (F6/D4-d) **defers with the sync engine** (it is only needed when sync flushes).
- **ADR-001 (Tech Stack)** — formalizes the order implied by ADR-001 §282 (SQLCipher-WASM pipeline already deferred to "Phase 1.3"): the app is built and used **before** encryption-at-rest is wired.
- **The build roadmap** (`docs/roadmap.md`) — Phase 1.0's internal ordering is replaced by the features-first path below; the *deliverables* are unchanged.
**Does NOT amend:** ADR-002 (data model), ADR-003 (sync protocol), or the zero-knowledge/local-first thesis. The encryption (L1 SQLCipher + L2 libsodium), sync (HLC-LWW + Yjs + blob relay), and SRP auth layers are **deferred, not dropped** — their seams already exist in code and are exercised in the intended order.

---

## 1. Summary

Build the **real product** — the established `@vida/web` / `@vida/desktop` apps on the documented local-first stack — **features first**, with the three hardest cross-cutting layers turned **off but seam-ready**:

- **Encryption off:** SQLCipher runs with an empty passphrase (already `DEFAULT_SQLCIPHER_CONFIG.passphrase = ''`, `adapter.ts:133`); the `encryptRow`/`decryptRow` seam (`repository.ts:113,132`) runs pass-through with an empty `[E]` field set.
- **Sync off:** `packages/core/src/sync/{resolver,crdt,queue}.ts` stay empty stubs (0 lines today); `_sync_*` columns are written-never-flushed per the roadmap's "cheap scaffolding" rule.
- **Auth off:** no SRP/vault-unlock for the feature phase — a trivial local passphrase or none.

**Deliver in two hops off one shared codebase:**
- **(A) Web SPA first** — `@vida/web` (Vite + React + wa-sqlite), deployed as a static SPA (free host). The tester/dogfood vehicle: share a URL, each user's data is local to their browser. Its storage adapter is already built (`apps/web/src/db/web-adapter.ts`, ~473 LOC).
- **(D) Tauri desktop as the graduation** — `@vida/desktop` (Tauri v2 + native SQLite), the durable, encryption-ready daily-driver. A→D is an **additive target** (write the desktop `DatabaseAdapter` + packaging), not a rewrite, because `DatabaseAdapter` (`db/adapter.ts`) already isolates the only thing that differs.

**Then harden:** once the feature deliverable is usable and tester-validated, run the hardening pass in order — encryption (SQLCipher key + libsodium `[E]` fields) → sync (fill the stubs: HLC/Yjs/blob relay) → SRP auth. Each is a **bolt-on onto an existing seam**, which is only true because the app was built local-first, not on a server-authoritative cloud stack.

## 2. Why this is safe against the established architecture

A and D are **not deviations** — they are two of ADR-001's three documented app targets (§32-34, §59-61). The codebase was authored for exactly this "encryption-off now, bolt-on later" posture: the platform-agnostic `DatabaseAdapter` seam, the empty-passphrase default, the pass-through crypto seam, and the empty sync stubs are all already present. Turning the layers on later is exercising the design in the intended order, not bending it.

The domain model — the ~60-table structure documented across 21 contexts and realized in `@vida/types` (2,639 LOC) + `@vida/core` (4,834 LOC, incl. the encryption code) — is **fully reused**. The unbuilt part is the experience layer (`@vida/ui`, `@vida/editor`, feature screens — empty stubs today), which is **identical shared React for A and D** (Tauri runs the web codebase), so the delivery choice does not fork the 90% of remaining work.

## 3. Options Considered

### Option A — Features-first on the local-first stack; encryption/sync/auth deferred; deliver A→D. *(chosen)*
**Rationale:** validates the product before building its hardest technology; every deferred layer is a genuine bolt-on because the seams already exist; reuses the entire documented domain model and both app targets unchanged; fastest path to a shareable, usable daily-driver at zero infra cost.
**Tradeoffs accepted:** the app runs **unencrypted** during the feature/validation phase (§5); web durability (OPFS/IndexedDB) is browser-managed and needs an export/backup safety valve; the SQLCipher-WASM build (web) stays the one deferred risk to verify at hardening time; the ZK **privacy thesis** is validated later (in D + hardening), not in the tester round.

### Option B — Supabase + Vercel cloud MVP. *(rejected)*
**Why rejected:** makes "add encryption later" a **rewrite**, not a bolt-on — server-authoritative Postgres + RLS + Supabase Auth is a different architecture than ZK/local-first, so nothing on the data axis survives the transition. It also validates feature utility but **not** the zero-knowledge value proposition, and it puts 10-11 real users' plaintext life data (finance/health/relationships) on a server during the test. Fastest to *deploy*, but contradicts the stated requirement that encryption bolt onto *this* deliverable.

### Option C — Original substrate-first order (full ZK/local-first foundation before features). *(rejected — this is what ADR-017 supersedes)*
**Why rejected:** builds XChaCha20 field encryption, HLC/Yjs sync, SRP, and SQLCipher-across-platforms before knowing the product is worth using — premature, and the specific over-engineering the standards and the v1 post-mortem warn against. The substrate is not abandoned; it is resequenced behind validation.

## 4. Consequences

**Easier:** a fast, $0 path to a usable, shareable product; product validation *before* hardening investment; every hardening step is a scoped bolt-on onto a pre-existing seam; both app targets and the full domain model are reused.

**Harder / to manage:** data durability during the feature phase (mitigate with a one-click export to a `.sqlite`/JSON file — doubles as backup and the future import-into-encrypted-app path); a window where real data is unencrypted (consent testers explicitly, or steer them off their most sensitive real data); the SQLCipher-WASM build path must be re-verified current before the web encryption step.

**Explicitly accepting as a tradeoff:** the feature-phase build is the **real** product (not throwaway), but it operates **unencrypted and single-device** until the hardening pass; the privacy thesis is deferred, not tested up front.

## 5. What this parks (not deletes)

- **The 35-issue Phase-1.0 "as-sequenced" plan** in Linear — the deliverables stand; their *order* is replanned next session against this ADR + the current repo state.
- **ADR-016's storage campaign immediacy** — the from-zero schema is authored feature-by-feature, not full-schema-first.
- **Task `db-2-sync-metadata-columns` (LIF-64)** — parked/superseded: its HLC-representation decision defers with the sync engine (§1). The `_sync_field_ts` column, if added, is written-never-flushed.
- **AR-3 (crypto/vault), AR-9 (sync scaffolding), DB-5 (encryption boundary)** — become the *hardening pass*, sequenced after the feature deliverable.

## 6. Review Date / Trigger

Reconsider when **either**: (a) the feature deliverable is usable and tester-validated → begin the hardening pass (encryption → sync → auth), or (b) multi-device or cloud backup becomes required *during* the feature/tester phase → revisit a minimal, ZK-compatible blob-relay (a bounded step toward the deferred sync layer, not Option B). The next session's first task is to author the features-first execution plan that this ADR authorizes.
