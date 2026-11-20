---
id: PR-8
kind: intent-row
module: preferences
status: active
supersedes: []
summary: "Settings renders Account/Security and data import/export sections but never stores their data; Auth/Account and Data/Sync own them."
anchors: [apps/web/src/settings/settings-surface.test.tsx, docs/modules/preferences/intent.yaml]
tokens: 74
generated: true
---
# PR-8 (tested)

Settings renders Account/Security and data import/export sections but never stores their data; Auth/Account and Data/Sync own them.

- Proof: PR-8 (tested by name)
- Uses: account, sync

Generated from `docs/modules/preferences/intent.yaml`; edit the ledger, never this unit.
