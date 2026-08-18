// Points economy & consequence engine (ADR-012) — shared enums.

/** §3.2 — a currency's backing. XP is one currency (self-granted), not privileged. */
export const CURRENCY_BACKING_KIND = ['real-money', 'self-granted', 'measured-time'] as const
export type CurrencyBackingKind = (typeof CURRENCY_BACKING_KIND)[number]

/** §3.3 — a consequence_ledger entry's kind (signed by kind; amount is a positive magnitude). */
export const CONSEQUENCE_KIND = ['earn', 'lock', 'spend', 'distribute'] as const
export type ConsequenceKind = (typeof CONSEQUENCE_KIND)[number]

/** §3.5 — a `store` node's kind: a folder (`group`) or a wrapper over an existing Finance entity. */
export const STORE_NODE_KIND = ['group', 'wrapper'] as const
export type StoreNodeKind = (typeof STORE_NODE_KIND)[number]

/** §3.5 — the Finance entity a `wrapper` store node wraps (existing entities untouched). */
export const STORE_REF_TYPE = ['account', 'investment', 'asset'] as const
export type StoreRefType = (typeof STORE_REF_TYPE)[number]

/** §3.9 — a headless `rules` condition is an ADR-011 binding: event-trigger or derived-pull (DB-3 drops `manual` — a rule always has a trigger). */
export const RULE_CONDITION_BINDING_TYPE = ['event_trigger', 'derived_pull'] as const
export type RuleConditionBindingType = (typeof RULE_CONDITION_BINDING_TYPE)[number]
