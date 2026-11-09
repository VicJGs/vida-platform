---
id: RL-7
kind: intent-row
module: relationships
status: active
supersedes: []
summary: "A reminder group's message template reminds the user and never sends anything; no contact data leaves in an off-device push (the device composes the nudge after decrypting); a group can fire relative to each member's birthday, and can target the user's important people by closeness."
anchors: [docs/modules/relationships/intent.yaml]
tokens: 131
generated: true
---
# RL-7 (intent only)

A reminder group's message template reminds the user and never sends anything; no contact data leaves in an off-device push (the device composes the nudge after decrypting); a group can fire relative to each member's birthday, and can target the user's important people by closeness.

- Proof: BR-RL-S4-2 (no test), BR-RL-S4-4 (no test), BR-RL-S4-5 (no test)
- Uses: notifications, encryption
- Work: LIF-496

Generated from `docs/modules/relationships/intent.yaml`; edit the ledger, never this unit.
