---
id: SPC-15
kind: intent-row
module: spaces
status: active
supersedes: []
summary: "The composition root builds the whole Spaces module (the views engine and its shared provider registry, the association resolver, the templates service, the capability registry, enforcer and offered set) and each module registers its taggable types, read providers and template writers when it's composed."
anchors: [docs/modules/spaces/intent.yaml]
tokens: 121
generated: true
---
# SPC-15 (intent only)

The composition root builds the whole Spaces module (the views engine and its shared provider registry, the association resolver, the templates service, the capability registry, enforcer and offered set) and each module registers its taggable types, read providers and template writers when it's composed.

- Uses: views, templates, capabilities, sessions
- Work: LIF-450

Generated from `docs/modules/spaces/intent.yaml`; edit the ledger, never this unit.
