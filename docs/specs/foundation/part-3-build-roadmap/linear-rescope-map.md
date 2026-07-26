# Linear Re-scope Map — LIF-61…95 → roadmap M1→M4

**Type:** the U3 (linear-projectize) Step-1 mapping. **DOC-ONLY — no Linear write until Victor approves this mapping AND each cluster push.**
**Date:** 2026-07-26 · **Task:** `linear-projectize` · **Basis:** `docs/roadmap.md` (M1→M4) + `part-3-build-roadmap/_index.md §2.1` ledger + `.claude/tasks/.tracker-map.json`.
**Rule:** issues are **re-homed / re-milestoned, not duplicated.** Net-new module/integration/venue issues are created at *their* cluster's gate, not here.

---

## §1. What changed

The old 35 Phase-1.0 issues (LIF-61…95) sit in **five technical-layer Projects** (① Database · ② Architecture · ③ Design System · ④ UI · ⑤ UX), sequenced **substrate-first**. The rewritten roadmap is **features-first M1→M4**. Most of these 35 are genuinely the **boot/foundation** deliverables → they collapse into one new Project **"M1.0 Boot & Connective Base."** The exceptions are the **crypto/sync** deliverables, which defer to **M3** (encryption) / **M4** (sync activation) per ADR-017/019.

**New Project structure** (roadmap §Linear-mapping):
- **M1.0 Boot & Connective Base** ← absorbs most of ①–⑤.
- **M1 module waves** (Notes, Tasks, Habits, …) · **M2** (Provider-Selection + integration families) · **M3** (Whole-OS Encryption & Security Pass) · **M4** (Sync/Server, Desktop, Mobile, Self-Host, ZK-Cloud) — **net-new issues, created at each cluster's gate** (not re-scoped from LIF-61…95).

**Disposition of the old layer-Projects:** ② Architecture · ③ Design System · ④ UI · ⑤ UX fully collapse into **M1.0** → **retire** (archive) once their issues are re-homed. ① Database **splits** (spine→M1.0 · crypto→M3 · reconciliation→M1.4) → **retire** after the split. `[DECISION — confirm at gate]`

---

## §2. The mapping (35 issues)

| LIF | Deliverable | Old Project | Status | → New home | Action |
|-----|-------------|-------------|--------|-----------|--------|
| 61 | DB-1 schema primitives | ① Database | **DONE** | M1.0 | re-home (keep DONE) |
| 62 | DB-10 seed & dogfood vault | ① Database | BACKLOG | M1.0 | re-home |
| 63 | DB-11 ADR-002 reconciliation | ① Database | BACKLOG | **M1.4** (tail) | re-home |
| 64 | DB-2 sync-metadata columns | ① Database | BACKLOG (parked) | M1.0 (cols) | re-home; scope = cols written-never-flushed; HLC-encoding deferred; **activation → M4** |
| 65 | DB-3 stream-(i) consolidation | ① Database | BACKLOG | M1.0 | re-home + **re-scope**: per-substrate as `foundation/` lands, not one upfront campaign (ADR-016) |
| 66 | DB-4 per-domain schema | ① Database | BACKLOG | M1.0 → module waves | re-home + **re-scope**: authored per-module (`db/schema/<domain>.ts`); the per-domain grain rides the M1.1–M1.3 module issues |
| 67 | DB-5 encryption boundary map | ① Database | BACKLOG | **M3** | **defer** to encryption pass |
| 68 | DB-6 repository layer | ① Database | BACKLOG | M1.0 | re-home (seam pass-through) |
| 69 | DB-7 migrations runner | ① Database | BACKLOG | M1.0 | re-home (present; per-feature) |
| 70 | DB-8 FTS5 + blind index | ① Database | BACKLOG | M1.0 **+ split** | FTS5 → M1.0; **blind index (DB-8b, keyed) → M3** — split into two issues |
| 71 | DB-9 enums & Zod | ① Database | BACKLOG | M1.0 | re-home |
| 72 | AR-1 monorepo topology | ② Architecture | BACKLOG | M1.0 | re-home (largely done) |
| 73 | AR-2 DatabaseAdapter + web-adapter | ② Architecture | BACKLOG | M1.0 | re-home; **rebuild web-adapter** (quarantined `Old/`); SQLCipher-WASM → M3 |
| 74 | AR-3 crypto/vault/key-mgmt | ② Architecture | BACKLOG | **M3** | **defer** to encryption pass |
| 75 | AR-4 state + routing + forms | ② Architecture | BACKLOG | M1.0 | re-home |
| 76 | AR-5 Sessions substrate | ② Architecture | BACKLOG | M1.0 | re-home (`foundation/sessions/`) |
| 77 | AR-6 Spaces + universal tags | ② Architecture | BACKLOG | M1.0 | re-home (`foundation/spaces/`) |
| 78 | AR-7 Capability registry + measurability + effects | ② Architecture | BACKLOG | M1.0 | re-home (`foundation/{capability,measurement,economy,effects}/`) |
| 79 | AR-8 foundation services | ② Architecture | BACKLOG | M1.0 | re-home; **re-scope**: cross-cutting only — module engines stay module-owned |
| 80 | AR-9 sync scaffolding (no-flush) | ② Architecture | BACKLOG | M1.0 **+ split** | cols/queue writes → M1.0; **engine activation → M4** — split |
| 81 | DS-1 token pipeline | ③ Design System | BACKLOG | M1.0 | re-home |
| 82 | DS-2 foundations | ③ Design System | BACKLOG | M1.0 | re-home |
| 83 | DS-3 motion foundation | ③ Design System | BACKLOG | M1.0 | re-home |
| 84 | DS-4 Tamagui + dark mode | ③ Design System | BACKLOG | M1.0 | re-home |
| 85 | DS-5 primitive contracts | ③ Design System | BACKLOG | M1.0 | re-home |
| 86 | UI-1 `@vida/ui` primitives | ④ UI | BACKLOG | M1.0 | re-home |
| 87 | UI-2 platform views | ④ UI | BACKLOG | M1.0 | re-home |
| 88 | UI-3 `@vida/editor` | ④ UI | BACKLOG | M1.0 | re-home; carries the serialization-spec (housekeeping → M1) |
| 89 | UI-4 app shell components | ④ UI | BACKLOG | M1.0 | re-home |
| 90 | UX-1 IA + navigation | ⑤ UX | BACKLOG | M1.0 | re-home |
| 91 | UX-2 command bar + search | ⑤ UX | BACKLOG | M1.0 | re-home |
| 92 | UX-3 shell layout + responsive | ⑤ UX | BACKLOG | M1.0 | re-home |
| 93 | UX-4 state conventions | ⑤ UX | BACKLOG | M1.0 | re-home |
| 94 | UX-5 vault-unlock + onboarding | ⑤ UX | BACKLOG | M1.0 **+ split** | onboarding → M1.0; **vault-unlock (UX-5b) → M3/M4** — split |
| 95 | UX-6 Home = Journal dashboard | ⑤ UX | BACKLOG | M1.0 | re-home |

**Summary:** 35 issues → **27 re-home to M1.0** · **3 split** (DB-8, AR-9, UX-5 — each keeps an M1.0 half + spins a M3/M4 half) · **2 defer whole to M3** (DB-5, AR-3) · **1 to M1.4** (DB-11) · **1 stays DONE** (DB-1) · **DB-2** re-homed with the activation half → M4. No issue is dropped or duplicated. LIF-96 (campaign) already DONE.

---

## §3. Net-new (created later, at each cluster's gate — NOT in this push)
- **M1.1–M1.3 module waves** — per-module issues (Notes, Preferences, Journals, Sessions&Scheduling incl. Pomodoro sub-type, Check-ins, Tasks, Habits, Finance, Relationships, Projects, Books, Knowledge, Learning, Routines, Purposes, Gamification, Notifications, Health×3, Skills). DB-4 per-domain schema rides these.
- **M1.4** — internal-integration hardening (summary(date), rollups, backlinks).
- **M2** — Provider-Selection (head) + integration families (Financial, Health/Wearables, AI/LLM, Fiscal rule-packs, Calendar/Extraction) + the co-built ingestion guard.
- **M3** — the encryption-pass issues beyond the re-homed DB-5/AR-3/DB-8b/UX-5b (SQLCipher, ingestion re-verification).
- **M4** — Sync/Server, Desktop, Mobile, Self-Host, ZK-Cloud (+ AR-9/DB-2 activation halves).

---

## §4. Decisions to confirm at the alignment gate (before any push)
1. **Retire the old ①–⑤ layer-Projects** after re-homing their issues (vs keep them as empty shells). *Recommend: retire/archive.*
2. **Split issues** (DB-8→+DB-8b, AR-9→+M4-activate, UX-5→+UX-5b) — create the second issue, or track the deferred half as a checklist item on the original? *Recommend: separate issues (clean milestone hygiene).*
3. **DB-2** (LIF-64, parked by ADR-017) — its Linear flip to Backlog was previously owed (permission-gated); re-home to M1.0 with the activation→M4 note. Confirm.
4. **Push order** — M1.0 first (the re-home), then net-new waves at their gates. Confirm M1.0 is the only cluster pushed in the first gated run.

---

## §5. Next
Gate this mapping (Victor alignment approval) → then **S11**: `/track-sync --approve-cluster "M1.0 Boot & Connective Base"` as the first gated push, one cluster at a time.
