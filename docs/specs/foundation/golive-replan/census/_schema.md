# G1 census — shared schema (every auditor follows this exactly)

Ground rules: read docs/specs/foundation/golive-replan/process.md (the Entity Live Close, ELC-1…9, §2.5, §3, §5) FIRST.
No-Guessing: every row cites `path:line`. Never mark ✅ without code evidence. READ-ONLY except your one output file.

## Per unit, four tables

### A. Data legs (ELC-3/4)
| Leg (hook / route / region) | File:line | Status | Evidence |
Status: LIVE (getServices()/useQuery over a REGISTERED service) · STUB (returns empty / throws / `?sample`-only / service not in composition-root `Services`) · PARTIAL (some ops live, some not) · N/A-by-role (CODEC renderer/shell with no data of its own, process.md §5).

### B. Interactions (ELC-5)
| Interaction the unit's screen-flow / slice-map promises | Wired? (yes / no-op / missing) | File:line |

### C. Declared deferrals (DF-12 sweep)
Grep the unit's delivery docs (`docs/specs/foundation/<unit>/**`) for "stub", "defer", "OUT", "later", "seam", "first consumer".
| Deferral (quote) | Doc:line | Home named | Home status | Verdict |
Verdict: HOMED (a real, open-or-done issue that owns it) · ORPHAN (phantom / closed-unrelated / none) · BORROWED (belongs to another entity's ELC or HARD-1/HARD-3/DB-8 — name it).

### D. Envision conformance (ELC-9) — every EC in `<unit>/delivery/envision.md`
| EC | Type (structural/feel) | Assertion (short) | Status | Evidence |
Status: ✅ met (code evidence) · ❌ diverged (code contradicts it, or the affordance is absent) · ⏳ feel/live-only (needs the running app on real data) · ? unverifiable-by-reading (say why).
NOTE: census EC checks are code + Visual-Gate-ledger level; the live re-verification happens at each debt unit's close.

## Unit verdict line
`<unit> — ELC: LIVE | PARTIAL | STUB | N/A-by-role · legs S/P/L counts · ORPHANs n · EC ✅/❌/⏳/? counts · debt one-liner`

## End of file
- **ORPHAN list** (all of yours)
- **EC divergence list** (all ❌, with the EC text)
- **Cross-unit notes** (e.g. a CODEC defect seen at a consumer → owning unit)
