// ============================================================================
// Dispatches — fe-notifications ② · S2 lens. A calm daily briefing in the System's out-loud voice:
// narrative time-groups, serif prose, whitespace-led. A second renderer over the SAME AttentionModel
// (no new data). NOT-25 dangling reads "no longer available"; severity stays quiet (prose, not markers).
// ============================================================================
import { Text, View } from '@tamagui/core'
import { Button } from '@vida/ui'
import type { AttentionEntry, AttentionModel } from './attention-model'

const DAY = 86_400_000

export interface DispatchesLensProps {
  model: AttentionModel
  now: number
  onMarkRead: (id: string) => void
  onArchive: (id: string) => void
}

function Eyebrow({ children }: { children: string }) {
  return (
    <Text
      width={104}
      textAlign="right"
      fontSize={11}
      letterSpacing={1.3}
      textTransform="uppercase"
      color="$colorTextMuted"
    >
      {children}
    </Text>
  )
}

function Line({
  entry,
  onMarkRead,
  onArchive,
}: {
  entry: AttentionEntry
  onMarkRead: (id: string) => void
  onArchive: (id: string) => void
}) {
  const prose = entry.dangling
    ? `${entry.title} — no longer available.`
    : entry.voice
      ? `${entry.title} — ${entry.voice}.`
      : `${entry.title}.`
  return (
    <View flexDirection="row" gap="$24" alignItems="baseline">
      <Eyebrow>{entry.relTime}</Eyebrow>
      <View flex={1} gap="$4">
        <Text fontSize="$subheading" fontFamily="$display" color="$colorTextPrimary" lineHeight={30}>
          {prose}
        </Text>
        {!entry.anticipated ? (
          <View flexDirection="row" gap="$8">
            {!entry.isRead ? (
              <Button intent="ghost" size="small" onPress={() => onMarkRead(entry.id)}>
                Mark read
              </Button>
            ) : null}
            <Button intent="ghost" size="small" aria-label="Archive notification" onPress={() => onArchive(entry.id)}>
              Archive
            </Button>
          </View>
        ) : null}
      </View>
    </View>
  )
}

function Section({
  when,
  entries,
  onMarkRead,
  onArchive,
}: {
  when: string
  entries: AttentionEntry[]
  onMarkRead: (id: string) => void
  onArchive: (id: string) => void
}) {
  if (entries.length === 0) return null
  return (
    <View gap="$12">
      <Text fontSize={11} letterSpacing={1.3} textTransform="uppercase" color="$colorTextMuted">
        {when}
      </Text>
      {entries.map((e) => (
        <Line key={e.id} entry={e} onMarkRead={onMarkRead} onArchive={onArchive} />
      ))}
    </View>
  )
}

export function DispatchesLens({ model, now, onMarkRead, onArchive }: DispatchesLensProps) {
  const today = model.settled.filter((e) => now - e.at < DAY)
  const earlier = model.settled.filter((e) => now - e.at >= DAY)
  const n = model.settled.length
  const opener =
    n === 0
      ? 'Nothing has asked for you yet.'
      : `${n === 1 ? 'One thing' : `${n} things`} ${n === 1 ? 'has' : 'have'} asked for you.`

  return (
    <View gap="$24" maxWidth={620}>
      <Text fontSize="$display" fontFamily="$display" color="$colorTextPrimary" lineHeight={40}>
        {opener}
      </Text>
      <View gap="$24">
        <Section when="Today" entries={today} onMarkRead={onMarkRead} onArchive={onArchive} />
        <Section when="Earlier" entries={earlier} onMarkRead={onMarkRead} onArchive={onArchive} />
        <Section when="Still ahead" entries={model.anticipated} onMarkRead={onMarkRead} onArchive={onArchive} />
      </View>
    </View>
  )
}
