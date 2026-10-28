// ============================================================================
// RulesMode — the Rules mode (fe-gamification ② · S4 · EC-7).
//
// ALL rules over the mandated `CollectionView` (single list layout, like Currencies) — each row = name +
// condition/consequence summary + an enable/disable toggle + delete (optimistic-local, IR-G1). A `+ New <rule>`
// entry opens the rule-authoring Flow (EC-9). Register-aware copy (EC-10): Rules ↔ Quests.
// ============================================================================
import { useState } from 'react'
import { Text, View } from '@tamagui/core'
import { Button, CollectionView, ListView, type ViewLayout, type ViewState } from '@vida/ui'
import type { ConsequenceSpec, Rule, RuleCondition } from '@vida/core'
import { collapseToTerminal } from '../state-conventions/interaction-state'
import { rewardCopy } from './reward-copy'
import { RuleAuthoringFlow } from './rule-authoring-flow'
import { usePersona } from './use-persona'
import { useRules } from './use-rules'

const LAYOUTS: readonly ViewLayout[] = ['list']
const singular = (plural: string) => plural.replace(/s$/, '')

function conditionSummary(c: RuleCondition): string {
  return c.kind === 'event_trigger' ? `on ${c.eventType}` : `when ${c.measureKey} ${c.operator} ${c.threshold}`
}
function consequenceSummary(cs: ConsequenceSpec): string {
  switch (cs.effectType) {
    case 'grant_currency':
      return `grant ${cs.payload.amount} ${cs.payload.currencyId}`
    case 'lock_currency':
      return `lock ${cs.payload.amount} ${cs.payload.currencyId}`
    case 'move_money':
      return 'move money'
    case 'surface_notification':
      return 'notify'
  }
}

function RuleRow({ rule, onToggle, onRemove }: { rule: Rule; onToggle: () => void; onRemove: () => void }) {
  return (
    <View flexDirection="row" justifyContent="space-between" alignItems="center" gap="$12" flexWrap="wrap">
      <View gap="$2" flex={1} minWidth={180}>
        <Text fontSize="$body" color="$colorTextPrimary">
          {rule.name}
        </Text>
        <Text fontSize="$caption" color="$colorTextMuted">
          {conditionSummary(rule.condition)} → {rule.consequences.map(consequenceSummary).join(', ')}
        </Text>
      </View>
      <View flexDirection="row" alignItems="center" gap="$8">
        <Button
          intent={rule.isEnabled ? 'secondary' : 'ghost'}
          size="small"
          aria-pressed={rule.isEnabled}
          onPress={onToggle}
        >
          {rule.isEnabled ? 'Enabled' : 'Disabled'}
        </Button>
        <Button intent="ghost" size="small" onPress={onRemove} aria-label={`Delete ${rule.name}`}>
          Delete
        </Button>
      </View>
    </View>
  )
}

export function RulesMode() {
  const data = useRules()
  const copy = rewardCopy(usePersona())
  const noun = singular(copy.rules) // "Rule" | "Quest"
  const [authoring, setAuthoring] = useState(false)

  if (authoring) {
    return <RuleAuthoringFlow data={data} onDone={() => setAuthoring(false)} onCancel={() => setAuthoring(false)} />
  }

  const renderView = (_layout: ViewLayout, state: ViewState) => (
    <ListView<Rule>
      items={data.rules}
      renderItem={(rule) => (
        <RuleRow rule={rule} onToggle={() => data.toggle(rule.id)} onRemove={() => data.remove(rule.id)} />
      )}
      getKey={(rule) => rule.id}
      state={state}
      aria-label={copy.rules}
    />
  )

  return (
    <View gap="$16">
      <CollectionView
        title={copy.rules}
        count={data.total}
        layout="list"
        layouts={LAYOUTS}
        onLayoutChange={() => {}}
        state={collapseToTerminal(data.state)}
        renderView={renderView}
        aria-label={copy.rules}
      />
      <View flexDirection="row">
        <Button intent="ghost" size="small" onPress={() => setAuthoring(true)}>
          New {noun.toLowerCase()}
        </Button>
      </View>
    </View>
  )
}

export default RulesMode
