---
id: MS-6
kind: intent-row
module: purposes
status: active
supersedes: []
summary: "A module advertises a queryable measure in the measurement source registry and a consumer queries it, never a table read; an unadvertised key reads null, never a fabricated value, and real sources are each module's own."
anchors: [docs/modules/purposes/intent.yaml]
tokens: 109
generated: true
---
# MS-6 (intent only)

A module advertises a queryable measure in the measurement source registry and a consumer queries it, never a table read; an unadvertised key reads null, never a fabricated value, and real sources are each module's own.

- Proof: BR-6 (no test)
- Uses: projects, PJ-26, books, BK-25, check-ins, CK-19, habits, HB-23, health

Generated from `docs/modules/purposes/intent.yaml`; edit the ledger, never this unit.
