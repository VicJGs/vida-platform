import type { ReactNode } from 'react'
import { Text, View } from '@tamagui/core'

// fe-settings S3 — the option-row primitive (EC-2), the OS System specimen's `.opt` (p6-archetypes-design.html:300):
// a flex row with the label (+ optional muted description) on the left and the control slot on the right, a hairline
// divider between rows. Presentational layout only — the CONTROL carries its own accessible name (aria-label = the
// visible label; Select/Switch both support it), so the row is not a form-label element. DIRECT semantic tokens.

export interface OptionRowProps {
  label: string
  description?: string
  /** The control (Select / Switch / Button …). It must carry its own accessible name matching `label`. */
  control: ReactNode
  /** Omit the bottom divider on the last row in a section. */
  last?: boolean
}

export function OptionRow({ label, description, control, last }: OptionRowProps) {
  return (
    <View
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      gap="$16"
      paddingVertical="$12"
      borderBottomWidth={last === true ? 0 : 1}
      borderBottomColor="$colorBorderDefault"
    >
      <View flexShrink={1} gap="$4">
        <Text fontFamily="$body" fontSize="$body" color="$colorTextPrimary">
          {label}
        </Text>
        {description != null && (
          <Text fontFamily="$body" fontSize="$small" color="$colorTextMuted">
            {description}
          </Text>
        )}
      </View>
      <View flexShrink={0}>{control}</View>
    </View>
  )
}
