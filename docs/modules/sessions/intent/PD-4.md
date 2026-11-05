---
id: PD-4
kind: intent-row
module: sessions
status: active
supersedes: []
summary: "Interval type (focus, short_break, long_break) and status (running, paused, completed, cancelled) are fixed enums mirrored by a database constraint, and a long break follows every sessions_before_long focus intervals."
anchors: [docs/modules/sessions/intent.yaml]
tokens: 93
generated: true
---
# PD-4 (intent only)

Interval type (focus, short_break, long_break) and status (running, paused, completed, cancelled) are fixed enums mirrored by a database constraint, and a long break follows every sessions_before_long focus intervals.

- Proof: BR-21 (no test), BR-24 (no test)

Generated from `docs/modules/sessions/intent.yaml`; edit the ledger, never this unit.
