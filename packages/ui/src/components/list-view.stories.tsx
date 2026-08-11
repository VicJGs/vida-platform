import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { ListView, type ViewState } from './list-view'
import { Card } from './card'

// UI-2 · V1 · list-view stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark) to
// review both modes. list-view is the data-view SPINE: generic items<T> + renderItem + getKey + the four rendered
// terminal states (loading skeletons · empty · error · success). Rows here compose an interactive Card (row
// interactivity is the consumer's, LV-5).
//
// MEASURE (v1-list-view.md §4/§VIII): success list of Card rows · density gap compact/default/spacious · dividers
// hairline · loading = N static skeleton bars (NO shimmer) · empty message · error message · dark mode (base tokens
// cross) · role per state (list / status).

type Row = { id: string; title: string; meta: string }
const ROWS: Row[] = [
  { id: '0192-a', title: 'Q3 objectives', meta: '3 of 5 complete' },
  { id: '0192-b', title: 'Sync scaffolding', meta: 'Updated 2h ago' },
  { id: '0192-c', title: 'Design system', meta: '10 primitives shipped' },
  { id: '0192-d', title: 'Platform views', meta: 'In progress' },
]

const Title = ({ children }: { children: React.ReactNode }) => (
  <Text fontFamily="$display" fontSize={15} fontWeight="600" color="$colorTextPrimary">
    {children}
  </Text>
)
const MetaText = ({ children }: { children: React.ReactNode }) => (
  <Text fontSize={13} color="$colorTextMuted">
    {children}
  </Text>
)
const row = (r: Row) => (
  <Card interactive onPress={() => {}} header={<Title>{r.title}</Title>} footer={<MetaText>{r.meta}</MetaText>} />
)

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View gap={8} marginBottom={24} width={360}>
    <Text fontSize={12} opacity={0.6} color="$colorTextPrimary">
      {label}
    </Text>
    {children}
  </View>
)

type PlaygroundArgs = { state: ViewState; density: 'compact' | 'default' | 'spacious'; dividers: boolean }

const meta: Meta<PlaygroundArgs> = {
  title: 'Platform Views/List',
  argTypes: {
    state: { control: 'select', options: ['loading', 'empty', 'error', 'success'] },
    density: { control: 'select', options: ['compact', 'default', 'spacious'] },
    dividers: { control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<PlaygroundArgs>

// Playground — drive state/density/dividers from the controls (flip `state` to see every terminal state).
export const Playground: Story = {
  args: { state: 'success', density: 'default', dividers: false },
  render: (args) => (
    <View width={360}>
      <ListView<Row>
        items={ROWS}
        getKey={(r) => r.id}
        renderItem={row}
        state={args.state}
        density={args.density}
        dividers={args.dividers}
        aria-label="Work items"
      />
    </View>
  ),
}

// The four rendered terminal states side by side.
export const TerminalStates: Story = {
  render: () => (
    <View flexDirection="row" gap={24} flexWrap="wrap">
      <Section label="success">
        <ListView<Row> items={ROWS} getKey={(r) => r.id} renderItem={row} aria-label="Work items" />
      </Section>
      <Section label="loading (5 static skeletons · no shimmer)">
        <ListView<Row> items={[]} getKey={(r) => r.id} renderItem={row} state="loading" aria-label="Work items" />
      </Section>
      <Section label="empty (role=status)">
        <ListView<Row> items={[]} getKey={(r) => r.id} renderItem={row} state="empty" />
      </Section>
      <Section label="error (role=status)">
        <ListView<Row> items={[]} getKey={(r) => r.id} renderItem={row} state="error" />
      </Section>
    </View>
  ),
}

// Density — the between-row gap.
export const Density: Story = {
  render: () => (
    <View flexDirection="row" gap={24} flexWrap="wrap">
      {(['compact', 'default', 'spacious'] as const).map((d) => (
        <Section key={d} label={`density: ${d}`}>
          <ListView<Row> items={ROWS.slice(0, 3)} getKey={(r) => r.id} renderItem={row} density={d} aria-label="Work items" />
        </Section>
      ))}
    </View>
  ),
}

// Dividers — hairline separators between rows.
export const Dividers: Story = {
  render: () => (
    <Section label="dividers">
      <ListView<Row> items={ROWS} getKey={(r) => r.id} renderItem={row} dividers aria-label="Work items" />
    </Section>
  ),
}

// Custom empty + error slots.
export const CustomSlots: Story = {
  render: () => (
    <View flexDirection="row" gap={24} flexWrap="wrap">
      <Section label="custom empty slot">
        <ListView<Row>
          items={[]}
          getKey={(r) => r.id}
          renderItem={row}
          state="empty"
          empty={
            <View alignItems="center" paddingVertical={24} gap={4}>
              <Title>No work items</Title>
              <MetaText>Create one to get started.</MetaText>
            </View>
          }
        />
      </Section>
      <Section label="custom error slot">
        <ListView<Row>
          items={[]}
          getKey={(r) => r.id}
          renderItem={row}
          state="error"
          error={
            <View alignItems="center" paddingVertical={24} gap={4}>
              <Title>Couldn&rsquo;t load work items</Title>
              <MetaText>Check your connection and retry.</MetaText>
            </View>
          }
        />
      </Section>
    </View>
  ),
}
