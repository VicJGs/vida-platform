// ============================================================================
// The Margin — fe-notifications ② · S1 flagship lens. A time-spine of the OS's attention with a living
// now-line: anticipations (Sessions `dueIn`, derived — NF-3) fade in ABOVE now; settled alerts (fired
// rows) sit BELOW. One renderer over `AttentionModel`; severity is quiet (warm glyph only for
// error/warning, EC-5); NOT-25 dangling rows read "no longer available" with no live link.
// ============================================================================
import { Text, View } from '@tamagui/core'
import { Button } from '@vida/ui'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import type { AttentionEntry, AttentionModel } from './attention-model'

export interface MarginLensProps {
  model: AttentionModel
  /** "14:20" — the now-line reading. */
  nowLabel: string
  onMarkRead: (id: string) => void
  onArchive: (id: string) => void
}

function TimeLabel({ children, color = '$colorTextMuted', width = 68 }: { children: string; color?: string; width?: number }) {
  return (
    <Text width={width} textAlign="right" fontSize={11} letterSpacing={1.3} textTransform="uppercase" color={color}>
      {children}
    </Text>
  )
}

function WarmGlyph({ entry }: { entry: AttentionEntry }) {
  if (!entry.warm) return null
  return <View color={entry.marker}>{entry.type === 'error' ? <AlertCircle size={13} aria-hidden /> : <AlertTriangle size={13} aria-hidden />}</View>
}

function Marker({ entry }: { entry: AttentionEntry }) {
  return (
    <View width={16} alignSelf="stretch" alignItems="center">
      <View position="absolute" top={0} bottom={0} width={1} backgroundColor="$colorBorderDefault" />
      {entry.anticipated ? (
        <View width={9} height={9} borderRadius={99} borderWidth={1.5} borderColor={entry.marker} backgroundColor="$colorSurfacePrimary" marginTop={5} />
      ) : (
        <View width={9} height={9} borderRadius={99} backgroundColor={entry.marker} marginTop={5} />
      )}
    </View>
  )
}

function SpineRow({ entry, onMarkRead, onArchive }: { entry: AttentionEntry; onMarkRead: (id: string) => void; onArchive: (id: string) => void }) {
  return (
    <View flexDirection="row" alignItems="flex-start" gap="$12" opacity={entry.anticipated ? 0.55 : 1}>
      <TimeLabel>{entry.relTime}</TimeLabel>
      <Marker entry={entry} />
      <View flex={1} paddingBottom="$16" gap={3}>
        <View flexDirection="row" alignItems="baseline" gap="$8" flexWrap="wrap">
          <Text
            fontSize="$body"
            fontFamily="$display"
            color="$colorTextPrimary"
            fontStyle={entry.dangling ? 'italic' : 'normal'}
            fontWeight={!entry.anticipated && !entry.isRead ? '600' : '400'}
          >
            {entry.title}
          </Text>
          <WarmGlyph entry={entry} />
        </View>
        <View flexDirection="row" alignItems="center" gap="$8" flexWrap="wrap">
          {entry.dangling ? (
            <Text fontSize="$small" color="$colorTextMuted" fontStyle="italic">
              No longer available
            </Text>
          ) : entry.voice ? (
            <Text fontSize="$small" color="$colorTextMuted">
              {entry.voice}
            </Text>
          ) : null}
          {entry.entity && entry.entity !== 'General' ? (
            <View borderWidth={1} borderColor="$colorBorderDefault" borderRadius={99} paddingHorizontal="$8" paddingVertical={1}>
              <Text fontSize={11} color="$colorTextMuted">
                {entry.entity}
              </Text>
            </View>
          ) : null}
          {!entry.anticipated ? (
            <>
              <View flex={1} minWidth={8} />
              {!entry.isRead ? (
                <Button intent="ghost" size="small" onPress={() => onMarkRead(entry.id)}>
                  Mark read
                </Button>
              ) : null}
              <Button intent="ghost" size="small" aria-label="Archive notification" onPress={() => onArchive(entry.id)}>
                Archive
              </Button>
            </>
          ) : null}
        </View>
      </View>
    </View>
  )
}

export function MarginLens({ model, nowLabel, onMarkRead, onArchive }: MarginLensProps) {
  return (
    <View gap="$8">
      {model.anticipated.map((e) => (
        <SpineRow key={e.id} entry={e} onMarkRead={onMarkRead} onArchive={onArchive} />
      ))}

      {/* the signature: the living now-line */}
      <View flexDirection="row" alignItems="center" gap="$12" paddingVertical="$8" role="separator" aria-label={`Now, ${nowLabel}`}>
        <TimeLabel color="$colorBrandPrimary">now</TimeLabel>
        <View width={16} alignItems="center">
          <View width={13} height={13} borderRadius={99} borderWidth={2} borderColor="$colorBrandPrimary" backgroundColor="$colorSurfacePrimary" />
        </View>
        <View flex={1} flexDirection="row" alignItems="center" gap="$8">
          <View flex={1} height={1} backgroundColor="$colorBrandPrimary" opacity={0.5} />
          <Text fontSize="$small" color="$colorBrandPrimary">
            {nowLabel}
          </Text>
        </View>
      </View>

      {model.settled.map((e) => (
        <SpineRow key={e.id} entry={e} onMarkRead={onMarkRead} onArchive={onArchive} />
      ))}
    </View>
  )
}
