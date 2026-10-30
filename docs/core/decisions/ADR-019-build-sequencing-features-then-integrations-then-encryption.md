# ADR-019: Build sequencing — the whole OS ships manually-operable and internally-integrated first, then external integrations (co-built with their security boundary), then the whole-OS encryption pass, then venues/multi-device; external integrations precede encryption-at-rest but are built against the encryption seam, and encryption gates any release beyond solo-localhost

**Status:** Accepted
**Date:** 2026-07-25
**Decision Makers:** Victor J.
**Context:** Vida Platform — Part 3 of the foundation-realignment campaign (the build-roadmap resequence). ADR-017 established features-first (encryption/sync/auth deferred to a hardening pass) but left the _order_ of external integrations vs the hardening pass, and the internal-vs-external integration boundary, unspecified. This ADR fixes the milestone spine that `docs/roadmap.md` is rewritten to.
**Tags:** architecture · process · foundation · sequencing · delivery · roadmap
**Amends (sequencing only — no architecture is changed):**

- **ADR-017 (features-first)** — refines its hardening order: **external integrations (with their ADR-014/015 security boundary) come _before_ encryption-at-rest** (for solo-localhost), and the **internal integration layer is part of the first Real-Product cut** (M1), not deferred. This refines ADR-017's stated hardening sequence on its own authority; it relocates _timing_ within ADR-017's already-accepted deferral, not the architecture.
- **`docs/roadmap.md`** — Phase-1.0's substrate-first internal ordering is replaced by the M1→M4 spine below (deliverables unchanged; re-homed per the Part-3 PLAN §2.1 ledger).
  **Does NOT amend:** ADR-014 / ADR-015 (the zero-knowledge ingestion + AI model is unchanged — only _when_ it is built), ADR-002 (the three-layer encryption model + `[E]` boundary are unchanged), ADR-016 (per-feature schema), ADR-018 (the `foundation/`+`services/` homes). **Constitution EN-1 unaffected:** the L1+L2+L3 layers are still all built — encryption is deferred-not-dropped (ADR-017), and this ADR moves only _when_ L1/L2 land within that accepted window; ZK-1 (server-blindness, an L3/sync property) is never relaxed.
  **Inherits:** the No-Guessing Principle; ADR-017's "the feature-phase build is the real product."

---

## 1. Summary

"RP" = **Real Product**: ship the actual usable product, not a throwaway. The build proceeds as four milestone-gated passes:

- **M1 — Whole OS, localhost, manual, fully integrated _internally_, unencrypted.** All modules at manual-CRUD depth **plus** the internal connective layer (Notes & Journals daily dashboard, cross-module `summary(date)` aggregation, entity-linking/backlinks, measurability/economy rollups, polish). Encryption/sync/auth **off** (seam pass-through, ADR-017). Data entered by hand.
- **M2 — External integrations + their security boundary, co-built.** The integration layer (bank CSV/OFX, ICS live feed, AI/LLM, health/wearables, food DBs, …) built **together with** the ADR-014/015 ingestion guard (`external_in_ok`/`external_out_ok`, leak decisions), **against the encryption seam** so the later flip is a verified bolt-on, not a retrofit. Provider-selection is M2's head.
- **M3 — Whole-OS encryption pass.** Turn on L1 SQLCipher-at-rest + L2 field-level `[E]` across **all** data (manual + integration); finalize the DB-5 boundary; re-verify the ingestion guard live. **Gates any release beyond solo-localhost.**
- **M4 — Venues / multi-device.** Sync (ADR-003) → auth (SRP) → desktop/mobile → self-host → ZK-cloud. Needs a second device, hence last.

## 2. Context — what triggered this

- **ADR-017 deferred encryption/sync/auth but not the integration order.** `[FACT: ADR-017 §1, §5]`
- **Two things needed deciding** (Victor, 2026-07-25): (a) is the _internal_ connective layer part of the first cut, or deferred? — **part of M1** (a pile of CRUD screens is not the Real Product); (b) do external integrations come before or after encryption? — **before** (establish working integrations for localhost dogfood), **but** built against the seam, with encryption gating release.
- **The safety question was verified, not assumed** `[FACT: gate-1 critique vs ADR-002/014/015]`: the zero-knowledge guarantee **ZK-1 is _server_-blindness**, enforced by **L3 (the sync blob)** which only exists at **sync time (M4)**. During M1/M2 there is **no server and no sync** (roadmap §22; ADR-017 §1) — so deferring **L1/L2 local at-rest** encryption to M3 cannot violate ZK-1, and moving integrations ahead of it touches **no** ADR-014/015 invariant (those govern the server + third-party observers, not local at-rest state).

## 3. Decision

**3.1 The M1→M4 milestone spine** (§1) is the roadmap's new order. Each milestone is a gated build process with its own entry condition + exit gate.

**3.2 The internal integration layer is M1.** The Real Product's first cut is coherent and usable — the Notes & Journals dashboard, cross-module aggregation, backlinks, and measurability/economy rollups ship with M1. Only _external_ data sources (third parties) defer to M2.

**3.3 External integrations (M2) precede encryption-at-rest (M3), built against the seam.** The `encryptRow`/`decryptRow` seam (pass-through today) and the ADR-014/015 ingestion guard are respected as integrations are built, so M3 is a **verified flip**, not a retrofit. The security _boundary_ (ingestion guard, leak decisions) is **co-built with** the integrations (one design surface); encryption-_at-rest_ is the later whole-OS flip.

**3.4 Encryption gates release.** `[DECISION]` The plaintext-at-rest window (M2→M3) is acceptable **only for solo-localhost** (Victor's machine; ADR-017 §4-5 already books this tradeoff for M1 data — M2 enlarges the _volume_, not the _class_). **Before the product reaches any other user, M3 must be complete and every integration re-verified against the live boundary.**

**3.5 Schema per-feature; substrates by first-consumer pull.** Per ADR-016/018: each module authors its `db/schema/<domain>.ts` + `services/<domain>/`; a `foundation/` substrate is built when its first M1 consumer needs it (the hubs Notes/Journals pull most early), never "substrate-first regardless."

## 4. Consequences

- **Fastest path to a usable, shareable-later Real Product**, validated by daily localhost use before the hardest layers are built.
- **Encryption is a scoped, verified flip** (M3) rather than a retrofit — because integrations were built against the seam.
- **A managed plaintext window** (M2→M3) exists on localhost; the hard release gate (3.4) contains it. Testers, if any before M3, consent / steer off the most sensitive real data (ADR-017 §5).
- **Multi-device is genuinely last** (M4) — sync needs a second device and encryption beneath it.
- **The old roadmap's 35 Phase-1.0 issues (LIF-61…95) are re-scoped**, not duplicated (mapping recorded at U3).

## 5. Alternatives considered

- **Encryption before external integrations** (integrations after the security layer). Rejected for the localhost phase: it delays the working-integrations foundation Victor wants for dogfood, for no ZK gain (there is no server to leak to pre-M4). The security _boundary_ is still respected during M2 (3.3); only the at-rest _flip_ waits. Retained as the **release** rule (3.4).
- **Defer the internal integration layer** (ship bare CRUD as the first cut). Rejected — a pile of disconnected CRUD screens is not the Real Product; the connective tissue is core to daily usability.
- **Keep the original substrate-first Phase 1.0** (full schema + crypto before features). Rejected — this is exactly the over-scope-before-validation ADR-017 supersedes.
