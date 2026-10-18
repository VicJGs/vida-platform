// ============================================================================
// RuleAuthoringFlow — the rule-authoring Flow (fe-gamification ② · S4 · EC-9).
//
// A guided condition → reward → review/enable wizard over the shipped @vida/ui `FlowSessionView` (the mandated
// shell): the 3 stages drive the Timeline progression; `renderStage` supplies the CURRENT stage's form + its
// Back/Next/Create controls. On create it builds a type-correct `RuleCreateInput` and calls the stubbed
// optimistic-local `create` (IR-G1).
//
// - Condition: the advertised measurement registry is EMPTY at M1 (no enumeration API) → the measure picker shows
//   the HONEST empty-seam state; the usable M1 condition is an `event_trigger` (a named event). (EC-9)
// - Reward: grant/lock a currency (money·allowance·time = the currency's backing kind) + MAY earmark a Dream — a
//   deny-safe Purposes read, EMPTY at M1 (honest "no dreams yet"). (EC-9 / GM-7)
// - The open-ended authoring sandbox/DSL stays OUT (#85 CAP-authoring) — this is the basic guided flow.
// ============================================================================
import { useState } from 'react'
import { Text, View } from '@tamagui/core'
import { Button, FlowSessionView, Input, type FlowStage } from '@vida/ui'
import type { ConsequenceSpec } from '@vida/core'
import type { RulesData } from './use-rules'

type RewardKind = 'grant' | 'lock'
const STAGE_IDS = ['condition', 'reward', 'review'] as const
type StageId = (typeof STAGE_IDS)[number]

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View gap="$8">
      <Text fontSize="$caption" color="$colorTextMuted">
        {label}
      </Text>
      {children}
    </View>
  )
}

/** A row of Back + the forward action (Next / Create). */
function FlowControls({ onBack, forward, forwardLabel, forwardDisabled }: { onBack?: () => void; forward: () => void; forwardLabel: string; forwardDisabled?: boolean }) {
  return (
    <View flexDirection="row" gap="$8" paddingTop="$8">
      {onBack ? (
        <Button intent="ghost" size="small" onPress={onBack}>
          Back
        </Button>
      ) : null}
      <Button intent="primary" size="small" disabled={forwardDisabled} onPress={forward}>
        {forwardLabel}
      </Button>
    </View>
  )
}

export function RuleAuthoringFlow({ data, onDone, onCancel }: { data: RulesData; onDone: () => void; onCancel: () => void }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [eventName, setEventName] = useState('')
  const [rewardKind, setRewardKind] = useState<RewardKind>('grant')
  const [currencyId, setCurrencyId] = useState(data.rewardCurrencies[0]?.code ?? 'XP')
  const [amount, setAmount] = useState('')

  const amountNum = Number.parseInt(amount, 10)
  const amountValid = Number.isFinite(amountNum) && amountNum > 0
  const conditionReady = name.trim() !== '' && eventName.trim() !== ''

  const stages: FlowStage[] = STAGE_IDS.map((id, i) => ({
    id,
    label: `Stage ${i + 1}`,
    title: id === 'condition' ? 'When this happens' : id === 'reward' ? 'Then grant a reward' : 'Review & enable',
    status: i < step ? 'done' : i === step ? 'current' : 'upcoming',
    proof:
      id === 'condition' && i < step ? (
        <Text fontSize="$small" color="$colorTextMuted">
          “{name}” · on {eventName}
        </Text>
      ) : id === 'reward' && i < step ? (
        <Text fontSize="$small" color="$colorTextMuted">
          {rewardKind === 'grant' ? 'Grant' : 'Lock'} {amountNum} {currencyId}
        </Text>
      ) : undefined,
  }))

  const submit = () => {
    const consequence: ConsequenceSpec = { effectType: rewardKind === 'grant' ? 'grant_currency' : 'lock_currency', payload: { currencyId, amount: amountNum } }
    data.create({ name: name.trim(), condition: { kind: 'event_trigger', eventType: eventName.trim() }, consequences: [consequence] })
    onDone()
  }

  const renderStage = (stage: FlowStage) => {
    if (stage.status !== 'current') return null
    const id = stage.id as StageId

    if (id === 'condition') {
      return (
        <View gap="$16">
          <Field label="Rule name">
            <Input value={name} onChangeText={setName} placeholder="e.g. Daily focus reward" aria-label="Rule name" />
          </Field>
          {/* the advertised measurement registry is empty at M1 — honest empty-seam (EC-9) */}
          <View gap="$4" role="status">
            <Text fontSize="$caption" color="$colorTextMuted">
              Measures to watch
            </Text>
            <Text fontSize="$small" color="$colorTextMuted">
              No measures are available yet — they appear here as modules (finance, habits, …) start advertising them.
            </Text>
          </View>
          <Field label="For now, trigger on a named event">
            <Input value={eventName} onChangeText={setEventName} placeholder="e.g. week.ended" aria-label="Trigger event" />
          </Field>
          <FlowControls onBack={onCancel} forward={() => setStep(1)} forwardLabel="Next" forwardDisabled={!conditionReady} />
        </View>
      )
    }

    if (id === 'reward') {
      return (
        <View gap="$16">
          <Field label="Reward">
            <View flexDirection="row" gap="$8" role="group" aria-label="Reward kind">
              {(['grant', 'lock'] as const).map((k) => (
                <Button key={k} intent={rewardKind === k ? 'secondary' : 'ghost'} size="small" aria-pressed={rewardKind === k} onPress={() => setRewardKind(k)}>
                  {k === 'grant' ? 'Grant' : 'Lock'}
                </Button>
              ))}
            </View>
          </Field>
          <Field label="Currency (money · allowance · time)">
            <View flexDirection="row" gap="$8" flexWrap="wrap" role="group" aria-label="Currency">
              {data.rewardCurrencies.map((c) => (
                <Button key={c.code} intent={currencyId === c.code ? 'secondary' : 'ghost'} size="small" aria-pressed={currencyId === c.code} onPress={() => setCurrencyId(c.code)}>
                  {c.name}
                </Button>
              ))}
            </View>
          </Field>
          <Field label="Amount">
            <Input value={amount} onChangeText={setAmount} placeholder="e.g. 50" inputMode="numeric" aria-label="Amount" />
          </Field>
          {/* earmark a Dream (GM-7) — deny-safe Purposes read, empty at M1 */}
          <View gap="$4">
            <Text fontSize="$caption" color="$colorTextMuted">
              Earmark a Dream (optional)
            </Text>
            {data.dreams.length === 0 ? (
              <Text fontSize="$small" color="$colorTextMuted">
                No dreams to earmark yet — add one in Purposes.
              </Text>
            ) : null}
          </View>
          <FlowControls onBack={() => setStep(0)} forward={() => setStep(2)} forwardLabel="Next" forwardDisabled={!amountValid} />
        </View>
      )
    }

    // review
    return (
      <View gap="$16">
        <View gap="$8">
          <Text fontSize="$body" color="$colorTextPrimary">
            “{name.trim()}”
          </Text>
          <Text fontSize="$small" color="$colorTextMuted">
            When <Text color="$colorTextPrimary">{eventName.trim()}</Text> happens, {rewardKind === 'grant' ? 'grant' : 'lock'}{' '}
            <Text color="$colorTextPrimary">
              {amountNum} {currencyId}
            </Text>
            .
          </Text>
        </View>
        <FlowControls onBack={() => setStep(1)} forward={submit} forwardLabel="Create rule" />
      </View>
    )
  }

  return <FlowSessionView title="New rule" context="Author a condition and its reward" stages={stages} renderStage={renderStage} aria-label="Rule authoring" />
}

export default RuleAuthoringFlow
