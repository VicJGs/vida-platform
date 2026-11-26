import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { Button } from './button'
import { RangeTransition } from './range-transition'

// fe-calendar S7 · RangeTransition stories — its first story (DSG-22, LIF-865). Switch the range to see the new region
// fade in; the first render is still. The range-transition states come with LIF-780.
//
// MEASURE: no fade on first render · each switch fades in (250ms ease-out, opacity only) · switching back to the first
// range fades too · reduced motion = instant.

const RANGES = ['Month', 'Week', 'Year'] as const

function Demo() {
  const [range, setRange] = useState<(typeof RANGES)[number]>('Month')
  return (
    <View gap={16}>
      <View flexDirection="row" gap={8}>
        {RANGES.map((r) => (
          <Button key={r} intent={r === range ? 'primary' : 'secondary'} size="sm" onPress={() => setRange(r)}>
            {r}
          </Button>
        ))}
      </View>
      <RangeTransition transitionKey={range}>
        <View padding={24} borderWidth={1} borderColor="$colorBorderDefault" borderRadius={8}>
          <Text color="$colorTextPrimary">{range} renderer</Text>
        </View>
      </RangeTransition>
    </View>
  )
}

const meta = {
  title: 'Platform Views/RangeTransition',
  component: RangeTransition,
} satisfies Meta<typeof RangeTransition>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: { transitionKey: 'Month', children: null },
  render: () => <Demo />,
}
