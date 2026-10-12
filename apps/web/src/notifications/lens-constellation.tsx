// ============================================================================
// Constellation — fe-notifications ② · S3 lens. Attention as a map of your life: alerts cluster around
// the life-areas they concern, "you" at center. A third renderer over the SAME AttentionModel (byArea).
//
// §XXVIII DEVIATION (slice-map said "the shipped NeuralGraph"): a force-directed Sigma/WebGL graph is
// built for 10K-node datasets + carries the WebGL concrete-color seam; for ~8 area-hubs a deterministic
// CSS/SVG constellation is lighter, controllable, and IS the greybox Victor visually approved. Reduced-
// motion-safe by default (no animation). Live drill-down (tap an area → its alerts) is deferred with the
// data plane. `[FACT: envision.md EC-4; approved greybox = CSS/SVG]`
// ============================================================================
import { Text, View } from '@tamagui/core'
import { Award, BookOpen, Clock, Folder, LayoutGrid, Users, Wallet } from 'lucide-react'
import type { AttentionArea, AttentionModel } from './attention-model'

const AREA_ICON: Record<string, typeof Award> = {
  Habits: Award,
  Tasks: Clock,
  Routines: Clock,
  Relationships: Users,
  Projects: Folder,
  Study: BookOpen,
  Finance: Wallet,
  General: LayoutGrid,
}

const H = 440
const HUB = 64

function Hub({ area, cx, cy }: { area: AttentionArea; cx: number; cy: number }) {
  const Icon = AREA_ICON[area.area] ?? LayoutGrid
  const count = area.entries.filter((e) => !e.isRead).length
  return (
    <View position="absolute" left={cx} top={cy} width={120} marginLeft={-60} alignItems="center" gap="$8">
      <View
        role="button"
        aria-label={`${area.area}: ${area.entries.length} notification${area.entries.length === 1 ? '' : 's'}`}
        tabIndex={0}
        width={HUB}
        height={HUB}
        borderRadius={99}
        borderWidth={1}
        borderColor="$colorBorderDefault"
        backgroundColor="$colorSurfaceSecondary"
        alignItems="center"
        justifyContent="center"
        focusVisibleStyle={{ outlineColor: '$colorFocusRing', outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 }}
      >
        <View color="$colorTextPrimary">
          <Icon size={22} aria-hidden />
        </View>
        {count > 0 ? (
          <View position="absolute" top={-4} right={4} minWidth={18} height={18} paddingHorizontal={4} borderRadius={99} backgroundColor="$colorBrandPrimary" alignItems="center" justifyContent="center">
            <Text fontSize={10} color="$colorTextInverse">
              {count}
            </Text>
          </View>
        ) : null}
        {/* alert dots orbiting the hub, colored by severity */}
        {area.entries.slice(0, 5).map((e, i) => {
          const a = (i / 5) * Math.PI * 2
          return <View key={e.id} position="absolute" left={HUB / 2 + Math.cos(a) * 42 - 4} top={HUB / 2 + Math.sin(a) * 42 - 4} width={8} height={8} borderRadius={99} backgroundColor={e.marker} />
        })}
      </View>
      <Text fontSize="$small" color="$colorTextPrimary">
        {area.area}
      </Text>
    </View>
  )
}

export function ConstellationLens({ model }: { model: AttentionModel }) {
  const areas = model.byArea
  const cx = 360
  const cy = H / 2
  const R = Math.min(170, 90 + areas.length * 14)
  const total = model.settled.length

  return (
    <View gap="$16">
      <View position="relative" height={H} borderWidth={1} borderColor="$colorBorderDefault" borderRadius="$md" backgroundColor="$colorSurfacePrimary" overflow="hidden">
        {/* connector lines center→hub */}
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, color: 'var(--colorBorderDefault)', opacity: 0.4 }} aria-hidden>
          {areas.map((_, i) => {
            const ang = (i / Math.max(1, areas.length)) * Math.PI * 2 - Math.PI / 2
            return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(ang) * R} y2={cy + Math.sin(ang) * R} stroke="currentColor" strokeWidth="1" />
          })}
        </svg>
        {/* center: you */}
        <View position="absolute" left={cx} top={cy} width={10} height={10} marginLeft={-5} marginTop={-5} borderRadius={99} backgroundColor="$colorTextMuted" />
        {areas.map((area, i) => {
          const ang = (i / Math.max(1, areas.length)) * Math.PI * 2 - Math.PI / 2
          return <Hub key={area.area} area={area} cx={cx + Math.cos(ang) * R} cy={cy + Math.sin(ang) * R} />
        })}
      </View>
      <Text fontSize="$small" color="$colorTextMuted">
        {total === 0 ? 'Nothing needs you right now.' : `${total} ${total === 1 ? 'alert' : 'alerts'} across ${areas.length} ${areas.length === 1 ? 'area' : 'areas'}. Select an area to read its notifications.`}
      </Text>
    </View>
  )
}
