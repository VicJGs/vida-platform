# Task: ci-actions-minutes-exhausted
# Status: diagnosed-needs-victor (account/billing — not repo-fixable)
# Linear: unfiled
# Profile: Generic Coding Session (triage only)
# Created: 2026-10-12

## Goal
Restore GitHub Actions CI signal — ALL checks (CI + Deploy) are currently failing before any step runs.

## Diagnosis (2026-10-12, §XXIV auto-triage — ENVIRONMENT, not code)
**Symptom:** every job in every workflow (Lint · Typecheck · Test · E2E · Format Check · Deploy) fails in
~3–5s. Observed on PR #136 **and** on plain `main` pushes (merges #133 / #134 / #135, all 2026-10-12).

**Evidence it is NOT code / workflow / setup:**
- Jobs fail with **zero steps executed** (`jobs[].steps == []` via the Actions API) — nothing ran, not even
  `actions/checkout`.
- The run's **log archive is a 22-byte empty zip** (`GET /actions/runs/<id>/logs`) — no step logs captured.
- **All workflows** (`ci.yml` + `deploy.yml`) fail identically — a code/YAML defect would not hit both.
- A **docs-only** merge (#135) fails the same way — no source changed.
- `actions/permissions` → `{"enabled": true}` — Actions are not policy-disabled.
- Timeline: PRs reported green CI before ~2026-10-12; every merge today fast-fails. Consistent with the
  monthly free-minutes pool draining mid-day under heavy parallel-session CI load.

**Root cause (one sentence):** GitHub Actions fails every job at the runner-provisioning stage — the
signature of **exhausted Actions minutes / a hit spending limit** on the account, not a repo defect.

> ⚠️ This masked the real CI state: the "Workers Builds" red (LIF-229) looked like the *only* problem, but
> in fact ALL CI has been dark since 2026-10-12. Sessions that claimed "CI green" were trusting prior runs,
> not re-checking. Re-verify CI live before claiming green.

## Resolution action — VICTOR (account, not repo)
1. github.com → **Settings → Billing and plans → Plans and usage → Actions** (personal) or the org's billing.
2. If minutes are exhausted / spending limit hit: **raise the spending limit** (or add a payment method), or
   wait for the monthly reset.
3. Re-run a CI workflow (`gh run rerun <id>` or push a trivial commit) and confirm steps now execute.
4. Once green returns, the pre-existing reds resurface as real signal again: **Format** (LIF-228, deferred)
   and **Workers Builds** (LIF-229 — clear via the CF dashboard, see `ci-workers-build-config.md`).

## Note on merging during the outage
No GitHub-hosted CI can go green until billing is resolved. Merges must rely on **local** verification
(typecheck/lint/test on Node 24) until then. PR #136 is docs + a package.json script + .gitignore — no code
logic — so it is safe to land on local verification if you choose not to wait.
