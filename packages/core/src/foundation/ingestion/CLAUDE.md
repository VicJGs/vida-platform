# foundation/ingestion — substrate (ADR-014)
# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this substrate is
Device-mediated ingestion guard, 3 layers (native / public-reference / user-managed); server unconditionally blind; external_in_ok / external_out_ok

## Owning ADR
ADR-014

## Capabilities (framework §3)
X1-X11

## Status
Directory home only (ADR-018). Engine logic + tables are authored PER-FEATURE at build phase
(ADR-016 §3.5 / ADR-017). No feature code or DDL lives here yet.
