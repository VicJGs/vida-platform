// ============================================================================
// services/finance — the Journal contribution (mod-finance #47 ① · S6)
//
// FIN-32 + FIN-37: finance registers ONE JournalContribution into the Journals-owned
// registry (journals/registry.ts) — `summary(date)` feeds the daily recap (today's
// transactions + net-worth snapshot), `dueIn(range)` feeds the agenda (upcoming G9
// payment installments). The journal names no module (JR-3); finance registers itself.
// A no-data day returns a well-formed `state:'empty'` SectionData, never a throw — the
// per-section degrade is the dashboard's (IR-d). Reuses the TerminalState canon BY TYPE
// (the provider computes state from its own live read — not deriveTerminalState).
// ============================================================================

import type { TerminalState } from '../../foundation/capability/types'
import type { JournalContribution, SectionData, DataPoint, DateRange, JournalRegistry } from '../journals'
import type { FinanceService } from './types'

// The recap data points finance advertises (JR-4 — the user's per-module selection).
const DATA_POINTS: readonly DataPoint[] = [
  { id: 'net_worth', label: 'Net worth' },
  { id: 'today_spending', label: "Today's spending" },
]

/** FIN-32 + FIN-37 — the finance Journal contribution (summary recap + dueIn agenda). */
export function createFinanceJournalContribution(svc: FinanceService): JournalContribution {
  return {
    module: 'finance',
    sectionKey: 'summary',
    dataPoints: DATA_POINTS,

    // FIN-32 — today's transactions + a net-worth snapshot (+ its partial flag, ADR-011 §3.6).
    async summary(date: string): Promise<SectionData> {
      const o = await svc.getOverview({ month: date.slice(0, 7) })
      const todays = await svc.getTransactionsInRange(date, date)
      // 'empty' iff there is genuinely no finance data — derived from the OVERVIEW's presence, NOT netWorth!==0
      // (holdings that net to exactly 0, e.g. account +X / liability −X, are real data and must show 'success').
      const hasData =
        todays.length > 0 ||
        o.totalBalance !== 0 ||
        o.totalAssets !== 0 ||
        o.totalLiabilities !== 0 ||
        o.unvaluedAssets > 0 ||
        o.unvaluedLiabilities > 0
      const state: TerminalState = hasData ? 'success' : 'empty'
      return {
        sectionKey: 'summary',
        module: 'finance',
        dataPoints: DATA_POINTS,
        state,
        items: [{ netWorth: o.netWorth, netWorthPartial: o.partial, todaysTransactions: todays }],
      }
    },

    // FIN-37 — upcoming installments from the BUILT G9 payment-schedule fields (liabilities/income
    // next_payment_date) within the agenda range. NOT the deferred Commitments derive (FIN-36, no table).
    async dueIn(range: DateRange): Promise<SectionData> {
      const inRange = (d: string | null): d is string => d != null && d >= range.from && d <= range.to
      const liabilities = await svc.listLiabilities()
      const incomes = await svc.listIncomeStreams()
      const upcoming = [
        ...liabilities.flatMap((l) =>
          inRange(l.next_payment_date)
            ? [
                {
                  kind: 'liability' as const,
                  id: l.id,
                  name: l.name,
                  date: l.next_payment_date,
                  amount: l.monthly_payment ?? null,
                },
              ]
            : [],
        ),
        ...incomes.flatMap((i) =>
          inRange(i.next_payment_date)
            ? [{ kind: 'income' as const, id: i.id, name: i.name, date: i.next_payment_date, amount: i.amount }]
            : [],
        ),
      ].sort((a, b) => a.date.localeCompare(b.date))
      return {
        sectionKey: 'agenda',
        module: 'finance',
        dataPoints: DATA_POINTS,
        state: upcoming.length > 0 ? 'success' : 'empty',
        items: upcoming,
      }
    },
  }
}

/** Register the finance contribution into the Journals registry (mirrors the register-helper pattern). */
export function registerFinanceJournal(registry: JournalRegistry, svc: FinanceService): void {
  registry.register(createFinanceJournalContribution(svc))
}
