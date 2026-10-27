// preferences-rescope R3 (LIF-247), D1 / EC-7 — the Settings pane while the persisted preferences load. Composed per
// docs/core/architecture/state-conventions.md §3.1 (no shared Skeleton primitive by design): a Card-shaped block of
// option-row-height bars on `$colorSurfaceSecondary`, `$md` radius, STATIC (no shimmer → nothing to gate under reduced
// motion), sized to the settled content so resolving causes no layout shift. `aria-busy` + a name on the region.
// Rare in practice: the boot seed fills the cache before the app renders, so this shows only after a cache eviction.
import { View, type TamaguiElement } from '@tamagui/core'
import type { Ref } from 'react'
import { SETTINGS_COPY } from './settings-copy'

const ROWS = 6 // Appearance: preset · mode · density · persona · reduce motion · arrangement

/** `ref` + `tabIndex=-1`: the surface places focus here when a Retry unmounts the button (PLAN-R3 R3-BR-6 rev 2.2). */
export function SettingsSkeleton({ ref }: { ref?: Ref<TamaguiElement> }) {
  return (
    <View ref={ref} tabIndex={-1} role="region" aria-label={SETTINGS_COPY.loadingLabel} aria-busy="true" gap="$16">
      <View height={28} width={160} borderRadius="$md" backgroundColor="$colorSurfaceSecondary" />
      <View borderRadius="$lg" borderWidth={1} borderStyle="solid" borderColor="$colorBorderDefault" padding="$24">
        {Array.from({ length: ROWS }, (_, i) => (
          <View
            key={i}
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            paddingVertical="$12"
            gap="$16"
          >
            <View gap="$8" flexShrink={1}>
              <View height={16} width={140} borderRadius="$md" backgroundColor="$colorSurfaceSecondary" />
              <View
                height={12}
                width={200}
                maxWidth="100%"
                borderRadius="$md"
                backgroundColor="$colorSurfaceSecondary"
              />
            </View>
            <View height={36} width={160} flexShrink={0} borderRadius="$md" backgroundColor="$colorSurfaceSecondary" />
          </View>
        ))}
      </View>
    </View>
  )
}
