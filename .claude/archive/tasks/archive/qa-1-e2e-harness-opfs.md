# Task: qa-1-e2e-harness-opfs
# Profile: Add Backend Component
# Scenario: E2E Test Harness
# Status: done
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Linear: LIF-103
# Source: AR-2 completeness audit (2026-07-27) — items 1 & 2 verification dependency

## Goal
Stand up a **browser E2E test harness (Playwright + OPFS/worker)** for `@vida/web`, and use it to **prove AR-2's
two deferred acceptance items**: the web app opens a fresh DB + reopens an existing one across reload with no
passphrase, and a Drizzle write round-trips (OPFS persistence proven). This is the real-browser coverage the Node
`better-sqlite3` contract test cannot provide — `FileSystemSyncAccessHandle` (wa-sqlite `AccessHandlePoolVFS`) exists
only in a Worker, so jsdom/Node can't exercise `web-driver.ts` / `web-adapter.ts` / `worker.ts`.

## Context
Net-new **shared test infrastructure** (every app/feature needing browser behaviour will reuse it) — surfaced by the
AR-2 audit as an unscoped dependency (no Playwright/E2E setup existed in the repo or roadmap). ADR-001 already names
Playwright for E2E. AR-2 ships the DB code + a Node contract test proving the adapter/driver/proxy CONTRACT; this
harness proves the wa-sqlite/OPFS PATH actually opens and persists in a real browser worker.

## Scope
- IN: Playwright config for `@vida/web` (Chromium; OPFS available); a worker-driven smoke that drives
  `apps/web/src/db/worker.ts` — open → write a fixture row via Drizzle → reopen → read back → assert persisted;
  first-run vs reopen via `exists()`; teardown via `destroy()`. CI wiring.
- OUT: exhaustive E2E of app flows (later); mobile/desktop harness; encryption (M3).

## Acceptance
- [ ] Playwright runs headless-Chromium against `@vida/web`; OPFS + module workers enabled.
- [ ] Smoke proves AR-2 `_index.md` §2 items 1 & 2: fresh open + reopen (no passphrase) and OPFS round-trip persistence.
- [ ] Green in CI; documented as the browser-path coverage complement to the Node contract test.
- [ ] On green: check off AR-2 `_index.md` §2 items 1 & 2 and record the closure.

## Dependencies
- Blocked by: `ar-2-database-adapter-web`  (can't E2E-test the adapter/worker until it exists — it does now)

## Notes
- Carries the AR-2 audit's deferred verification; AR-2 itself closes on contract (5/7 DoD) and unblocks the spine
  (db-6/db-7/ar-5/ar-6/ar-8/ar-9) independently of this harness.
