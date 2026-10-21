# Task: notes-entity-usability
# Status: planning — gate 1 APPROVED (Approval 1, 2026-10-20); gate 2 authored + /critique REVISE→folded + /preflight PASSED; Approval 2 pending
# Linear: pending (guarded create — mint via track-sync when the tree clears, per the orphan-create guard)
# Profile: Add Frontend Component (+ a small @vida/core content-write seam)
# Created: 2026-10-20
# Milestone: M1 / M1.1.3+ (module usability — DERIVED: first-consumer-pull, the data plane is the resolving condition)
# Session: 2026-10-20-notes-entity-usability

## Goal
Complete the "open + write + persist a note" loop that fe-notes (#27) deferred because the data plane did not
exist. Now enabled by data-plane-wiring (PR #148). S1 = open-on-click + create-opens; S2 = IR-7 editor-content
persistence (@vida/core content-write seam + apps/web binding hook). Local/single-device; CRDT/Yjs sync = M4.

## Scope — DERIVED FROM EXISTING DOCS (fe-notes delivery IR-7 + page-binding.ts + MVP-PATH + surface-map)
IN: S1 nav legs (note-renderers onPress → /notes/$id; use-create-note onSuccess → navigate). S2 content
persistence (content-write path in @vida/core NOT via the updatePage LWW whitelist; the page-binding change sink
wired at the consumer; serialize/parse EditorDocument ↔ pages.content text; reload via live getPage).
OUT: CRDT/Yjs sync + multi-device merge (M4) · [E] content encryption (M3) · FTS5 (DB-8) · other surface go-lives ·
adding /notes to the top nav (shell/IA concern).

## Reinvention guard (already built — do NOT rebuild)
composition root + initVault (data-plane-wiring) · VidaEditor + canvas-editor + page-binding.ts (#7) · live getPage/
listPages hooks (#149) · updatePage metadata path · createPage · the QA-1 Playwright/Brave gate.

## Open decisions (resolve at IMPLEMENTATION-PLAN, grounded — see PLAN §5)
- Q1 content-write seam shape (writePageContent vs updatePage-with-content) — resolve from seam-contract + IR-7.
- Q2 renderer navigation mechanism (onOpen prop vs useNavigate) — house pattern.
- Q3 save cadence (debounce + on-blur).

## Build Steps
_(filled by the IMPLEMENTATION-PLAN after Approval 1 — not yet gated.)_

## Route History
- 2026-10-20 (planning) — Minted after the create-note vault-init fix (initVault in composition-root, verified live).
  Triage of "OS not usable": 3/4 reported symptoms = expected M1 stubs (home journal region, empty modules panel);
  the real gaps = open-on-click (no-op), create-opens (unwired), content persistence (IR-7 deferred). Why-IR-7-deferred
  investigated + doc-grounded (defer-to-first-consumer #7 + no-data-plane #27, both now resolved; CRDT sync stays M4).
  PLAN authored (gate 1). Home: docs/specs/foundation/notes-entity-usability/.
