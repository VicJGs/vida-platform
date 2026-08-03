// Points economy & consequence engine (ADR-012) — shared enums.

/** §3.2 — a currency's backing. XP is one currency (self-granted), not privileged. */
export const CURRENCY_BACKING_KIND = ['real-money', 'self-granted', 'measured-time'] as const
export type CurrencyBackingKind = (typeof CURRENCY_BACKING_KIND)[number]

/** §3.3 — a consequence_ledger entry's kind (signed by kind; amount is a positive magnitude). */
export const CONSEQUENCE_KIND = ['earn', 'lock', 'spend', 'distribute'] as const
export type ConsequenceKind = (typeof CONSEQUENCE_KIND)[number]
