import { Text, View } from '@tamagui/core'
import { Card } from '@vida/ui'

// fe-settings S6 — the delegated-section placeholder (EC-9). Account/Security + Data import-export are RENDERED in
// Settings but OWNED elsewhere (PR-8, identity.md:24-25): Auth/Account (M3) + Data/Sync (M3/M4). Settings never owns
// their data — at M1 these panes are calm, muted placeholders (role="status", NOT an error), visually distinct from the
// live control panes. DIRECT semantic tokens.

export interface DelegatedPaneProps {
  title: string
  body: string
}

export function DelegatedPane({ title, body }: DelegatedPaneProps) {
  return (
    <Card
      padding="spacious"
      header={
        <Text fontFamily="$display" fontSize="$subheading" fontWeight="600" color="$colorTextPrimary">
          {title}
        </Text>
      }
    >
      <View role="status" paddingVertical="$8">
        <Text fontFamily="$body" fontSize="$body" color="$colorTextMuted">
          {body}
        </Text>
      </View>
    </Card>
  )
}

export const DELEGATED_PANES = {
  data: {
    title: 'Data',
    body: 'Import & export — part of Data & Sync, arriving in a later release. Your data stays on this device.',
  },
  account: {
    title: 'Account',
    body: 'Account & security are managed separately, arriving in a later release.',
  },
} as const
