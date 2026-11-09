---
id: RL-1
kind: intent-row
module: relationships
status: active
supersedes: []
summary: "A contact's identifying fields (names, nickname, email, phone, avatar, company, job title, location, birthday, how we met, social links) and the free text (an interaction's summary, follow-up notes and key takeaways, an event's title and description, a reminder's title, a group's name and message template, a network's name) are encrypted client-side [E]; the type, sentiment and frequency enums, dates, flags and counts are plaintext config. M1 is a pass-through."
anchors: [docs/modules/relationships/intent.yaml]
tokens: 167
generated: true
---
# RL-1 (intent only)

A contact's identifying fields (names, nickname, email, phone, avatar, company, job title, location, birthday, how we met, social links) and the free text (an interaction's summary, follow-up notes and key takeaways, an event's title and description, a reminder's title, a group's name and message template, a network's name) are encrypted client-side [E]; the type, sentiment and frequency enums, dates, flags and counts are plaintext config. M1 is a pass-through.

- Proof: BR-RL-S1-4 (no test), BR-RL-S1-5 (no test)
- Uses: encryption
- Work: LIF-67

Generated from `docs/modules/relationships/intent.yaml`; edit the ledger, never this unit.
