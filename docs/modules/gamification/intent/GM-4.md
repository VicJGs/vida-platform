---
id: GM-4
kind: intent-row
module: gamification
status: active
supersedes: []
summary: "Each currency's to-distribute, earned, locked and current quantities derive from the consequence ledger on read; stored totals and levels are caches, never the source of truth."
anchors: [docs/modules/gamification/intent.yaml]
tokens: 127
generated: true
---
# GM-4 (intent only)

Each currency's to-distribute, earned, locked and current quantities derive from the consequence ledger on read; stored totals and levels are caches, never the source of truth.

- Proof: BR-GM-1 (no test), BR-GM-8 (no test)
- Uses: ECO-3, ECO-4
- Work: LIF-526
- Open: Whether the total_xp and current_level cache columns are refreshed on each fire or dropped, since every read derives live.

Generated from `docs/modules/gamification/intent.yaml`; edit the ledger, never this unit.
