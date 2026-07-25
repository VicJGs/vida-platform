# foundation/sessions — substrate (ADR-004)
# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this substrate is
Sessions supertype for all timed/scheduled activity (pomodoro/study/reading are sub-types); shared effect catalogue + lifecycle enum + idempotency rail

## Owning ADR
ADR-004

## Capabilities (framework §3)
S1 S4 S5

## Status
Directory home only (ADR-018). Engine logic + tables are authored PER-FEATURE at build phase
(ADR-016 §3.5 / ADR-017). No feature code or DDL lives here yet.
