// ============================================================================
// CurrenciesMode — the Currencies mode (fe-gamification ② · S2 · EC-5).
//
// ALL currencies grouped by the 3 backing kinds, over the shipped @vida/ui `CollectionView` (the slice-map's
// mandated shell): CollectionView owns the title/count/8-state + the grouped `ListView` via `renderView`; the
// `+ New currency` entry + the pager live in THIS body (CollectionView's `onNewView` is SavedView-semantic —
// hardcoded "New view" — so it is NOT the currency-create home). Icons are Lucide (EC-11, never emoji). Data is
// stubbed vs the seam (IR-G1); the create is optimistic-local (the notifications lifecycle precedent).
// ============================================================================
import { useState } from 'react'
import { Text, View } from '@tamagui/core'
import { Button, CollectionView, Input, ListView, type ViewLayout, type ViewState } from '@vida/ui'
import type { CurrencyBackingKind } from '@vida/types'
import { Lock, Plus } from 'lucide-react'
import { collapseToTerminal } from '../state-conventions/interaction-state'
import { PAGE_SIZE, useCurrencies, type CurrencyGroup, type CurrencyLine } from './use-currencies'

const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const
const LAYOUTS: readonly ViewLayout[] = ['list']
const KIND_OPTIONS: ReadonlyArray<{ value: CurrencyBackingKind; label: string }> = [
  { value: 'real-money', label: 'Real money' },
  { value: 'measured-time', label: 'Measured time' },
  { value: 'self-granted', label: 'Self-granted' },
]

/** A currency row: name + current (+ unit) + 🔒 locked + the balance-composition snippet (the "ledger snippet" — the
 *  seam exposes no per-currency ledger list; S5 Activity owns the ledger, so here it is the derived composition). */
function CurrencyRow({ line }: { line: CurrencyLine }) {
  const { def, balance } = line
  return (
    <View gap="$4">
      <View flexDirection="row" justifyContent="space-between" alignItems="baseline" gap="$12">
        <Text fontSize="$body" color="$colorTextPrimary">
          {def.name ?? def.code}
        </Text>
        <View flexDirection="row" alignItems="center" gap="$8">
          <Text fontSize="$body" color="$colorTextPrimary" style={TABULAR}>
            {balance.current.toLocaleString()}
            {def.unit ? ` ${def.unit}` : ''}
          </Text>
          {balance.locked > 0 ? (
            <View flexDirection="row" alignItems="center" gap="$4" color="$colorTextMuted">
              <Lock size={12} aria-hidden />
              <Text fontSize="$caption" color="$colorTextMuted" style={TABULAR}>
                {balance.locked.toLocaleString()} locked
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <Text fontSize="$caption" color="$colorTextMuted" style={TABULAR}>
        earned {balance.earned.toLocaleString()} · spent {balance.spent.toLocaleString()}
        {balance.distributed > 0 ? ` · shared ${balance.distributed.toLocaleString()}` : ''}
      </Text>
    </View>
  )
}

/** The `+ New currency` entry (EC-5) — reveals a minimal inline form; optimistic-local create at M1. */
function NewCurrency({ onCreate }: { onCreate: (input: { name: string; backing_kind: CurrencyBackingKind }) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<CurrencyBackingKind>('self-granted')

  if (!open) {
    return (
      <View flexDirection="row">
        <Button intent="ghost" size="small" leading={<Plus size={14} aria-hidden />} onPress={() => setOpen(true)}>
          New currency
        </Button>
      </View>
    )
  }

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate({ name: trimmed, backing_kind: kind })
    setName('')
    setKind('self-granted')
    setOpen(false)
  }

  return (
    <View gap="$12" padding="$12" borderWidth={1} borderColor="$colorBorderDefault" borderRadius="$lg" role="group" aria-label="New currency">
      <Input value={name} onChangeText={setName} placeholder="Currency name" aria-label="Currency name" />
      <View flexDirection="row" gap="$8" role="group" aria-label="Backing kind" flexWrap="wrap">
        {KIND_OPTIONS.map((o) => (
          <Button key={o.value} intent={kind === o.value ? 'secondary' : 'ghost'} size="small" aria-pressed={kind === o.value} onPress={() => setKind(o.value)}>
            {o.label}
          </Button>
        ))}
      </View>
      <View flexDirection="row" gap="$8">
        <Button intent="primary" size="small" disabled={name.trim() === ''} onPress={submit}>
          Create
        </Button>
        <Button intent="ghost" size="small" onPress={() => setOpen(false)}>
          Cancel
        </Button>
      </View>
    </View>
  )
}

/** The paginated-list pager (EC-5, 50/page) — shown whenever there is data; prev/next disabled at the bounds. */
function Pager({ index, count, total, onPage }: { index: number; count: number; total: number; onPage: (i: number) => void }) {
  const start = index * PAGE_SIZE + 1
  const end = Math.min(total, start + PAGE_SIZE - 1)
  return (
    <View flexDirection="row" alignItems="center" justifyContent="space-between" gap="$12" role="group" aria-label="Pagination">
      <Text fontSize="$caption" color="$colorTextMuted" style={TABULAR}>
        {start}–{end} of {total}
      </Text>
      {count > 1 ? (
        <View flexDirection="row" gap="$8">
          <Button intent="ghost" size="small" disabled={index === 0} onPress={() => onPage(index - 1)} aria-label="Previous page">
            Previous
          </Button>
          <Button intent="ghost" size="small" disabled={index >= count - 1} onPress={() => onPage(index + 1)} aria-label="Next page">
            Next
          </Button>
        </View>
      ) : null}
    </View>
  )
}

export function CurrenciesMode() {
  const data = useCurrencies()

  const renderView = (_layout: ViewLayout, state: ViewState) => (
    <ListView<CurrencyLine>
      sections={data.groups.map((g: CurrencyGroup) => ({ id: g.kind, title: g.label, items: g.lines }))}
      renderItem={(line) => <CurrencyRow line={line} />}
      getKey={(line) => line.def.code}
      state={state}
      aria-label="Currencies"
    />
  )

  return (
    <View gap="$16">
      <CollectionView
        title="Currencies"
        count={data.total}
        layout="list"
        layouts={LAYOUTS}
        onLayoutChange={() => {}}
        state={collapseToTerminal(data.state)}
        renderView={renderView}
        aria-label="Currencies"
      />
      {data.total > 0 ? <Pager index={data.page.index} count={data.page.count} total={data.total} onPage={data.setPage} /> : null}
      <NewCurrency onCreate={data.create} />
    </View>
  )
}

export default CurrenciesMode
