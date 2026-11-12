---
id: ITG-8
kind: intent-row
module: integrations
status: active
supersedes: []
summary: "An import that merges into existing data stages its rows, auto-matches them by date and amount within a tolerance and commits only what the user confirms, failing loud per row; a feed that only adds skips staging, dedups by its natural key and marks a duplicate ignored, never deleting it."
anchors: [docs/modules/integrations/intent.yaml]
tokens: 124
generated: true
---
# ITG-8 (intent only)

An import that merges into existing data stages its rows, auto-matches them by date and amount within a tolerance and commits only what the user confirms, failing loud per row; a feed that only adds skips staging, dedups by its natural key and marks a duplicate ignored, never deleting it.

- Uses: IN-8, IN-9, finance, learning, relationships, preferences, PR-22
- Work: LIF-578

Generated from `docs/modules/integrations/intent.yaml`; edit the ledger, never this unit.
