---
id: OB-3
kind: intent-row
module: onboarding
status: active
supersedes: []
summary: "The first run keys only on the device-local marker first_run:completed in app state, never on whether the database exists, which a first launch creates before the marker is read; the marker is never synced."
anchors: [apps/web/src/onboarding/first-run-repo.test.ts, apps/web/src/onboarding/first-run.test.ts, docs/modules/onboarding/intent.yaml]
tokens: 87
generated: true
---
# OB-3 (tested)

The first run keys only on the device-local marker first_run:completed in app state, never on whether the database exists, which a first launch creates before the marker is read; the marker is never synced.

- Proof: OB-3 (tested by name)

Generated from `docs/modules/onboarding/intent.yaml`; edit the ledger, never this unit.
