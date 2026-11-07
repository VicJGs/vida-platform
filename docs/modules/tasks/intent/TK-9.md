---
id: TK-9
kind: intent-row
module: tasks
status: active
supersedes: []
summary: "The aggregated view reads only the tasks table and resolves parent-module data through the R7 read seam (the shared ViewProviderRegistry); a source that is down degrades only its own group, and standalone tasks form the Inbox group."
anchors: [docs/modules/tasks/intent.yaml, packages/core/src/services/tasks/__tests__/service.test.ts]
tokens: 131
generated: true
---
# TK-9 (tested)

The aggregated view reads only the tasks table and resolves parent-module data through the R7 read seam (the shared ViewProviderRegistry); a source that is down degrades only its own group, and standalone tasks form the Inbox group.

- Proof: BR-TK-S7-1 (no test), BR-TK-S7-2 (no test), BR-TK-S7-5 (no test), BR-TK-S7-6 (no test), BR-TK-S7-8 (tested), TK-9 (tested by name)
- Uses: views, projects, learning, relationships

Generated from `docs/modules/tasks/intent.yaml`; edit the ledger, never this unit.
