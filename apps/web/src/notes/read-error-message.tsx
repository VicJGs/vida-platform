// ============================================================================
// ReadErrorMessage — the in-place read-error state (notes-rescope R1, E-2 / BR-R1-8): a calm message (a polite
// `role="status"` — the SENTENCE only; a live region holds no controls) + a Retry button OUTSIDE it. While retrying the
// button is `loading` (spinner, `aria-busy`, activation suppressed, label kept — the `@vida/ui` Button canon). One element
// instance across `retrying` flips, so keyboard focus stays on the button.
// ============================================================================
import { Text, View } from '@tamagui/core'
import { Button } from '@vida/ui'

export interface ReadErrorMessageProps {
  message: string
  retry: () => void
  retrying: boolean
}

export function ReadErrorMessage({ message, retry, retrying }: ReadErrorMessageProps) {
  return (
    <View gap="$12" alignItems="flex-start">
      <View role="status">
        <Text fontSize="$small" color="$colorTextMuted">
          {message}
        </Text>
      </View>
      <Button intent="secondary" size="sm" loading={retrying} onPress={retry}>
        Retry
      </Button>
    </View>
  )
}
