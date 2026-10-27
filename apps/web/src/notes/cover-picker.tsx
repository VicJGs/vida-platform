// ============================================================================
// CoverPickerDialog — "Page cover" (notes-rescope R3, PLAN-R3 G9 · EC-29 · BR-R3-4).
// Three parts: an image link (http/https, checked before writing), the page's IMAGE attachments (each shown by its
// thumbnail — "Use as cover" writes `attachment:<id>`), and "Remove cover" when one is set. The attachment list rides
// `useAttachments`, a stub until R4 makes it live — so today it shows the honest empty line. Loaded lazily.
// ============================================================================
import { useId, useState } from 'react'
import { Text, View } from '@tamagui/core'
import { Button, Dialog, Input } from '@vida/ui'
import { useAttachments } from './use-attachments'
import { CoverImage } from './cover-image'

export interface CoverPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pageId: string
  current: string | null
  onChoose: (ref: string | null) => void
}

const LINK = /^https?:\/\/\S+$/i

export function CoverPickerDialog({ open, onOpenChange, pageId, current, onChoose }: CoverPickerDialogProps) {
  const [link, setLink] = useState(current != null && LINK.test(current) ? current : '')
  const [invalid, setInvalid] = useState(false)
  const errorId = useId()
  const { attachments } = useAttachments(pageId)
  const images = attachments.filter((a) => a.mime.startsWith('image/'))
  const choose = (ref: string | null) => {
    onChoose(ref)
    onOpenChange(false)
  }
  const useLink = () => {
    const value = link.trim()
    if (!LINK.test(value) || value.length > 2048) {
      setInvalid(true)
      return
    }
    choose(value)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Page cover"
      footer={
        current != null ? (
          <Button intent="ghost" onPress={() => choose(null)}>
            Remove cover
          </Button>
        ) : undefined
      }
    >
      <View gap="$16">
        <View gap="$8">
          <View flexDirection="row" gap="$8" alignItems="center">
            <View flex={1}>
              <Input
                aria-label="Image link"
                placeholder="https://…"
                value={link}
                invalid={invalid}
                aria-describedby={invalid ? errorId : undefined}
                onChangeText={(v) => {
                  setLink(v)
                  setInvalid(false)
                }}
              />
            </View>
            <Button intent="secondary" onPress={useLink}>
              Use link
            </Button>
          </View>
          {invalid ? (
            // Announced (focus stays on "Use link"), in the danger signal colour (critique I1).
            <Text id={errorId} role="alert" fontSize="$small" color="$colorSignalDanger">
              Enter an image link starting with http:// or https://
            </Text>
          ) : null}
        </View>
        <View gap="$8">
          <Text fontSize="$small" color="$colorTextMuted">
            From this page’s attachments
          </Text>
          {images.length === 0 ? (
            <Text fontSize="$small" color="$colorTextMuted">
              No image attachments on this page yet.
            </Text>
          ) : (
            images.map((a) => (
              <View key={a.id} flexDirection="row" gap="$8" alignItems="center">
                <View width={64} height={40}>
                  <CoverImage cover={`attachment:${a.id}`} variant="tile" />
                </View>
                <Text flex={1} fontSize="$small" color="$colorTextPrimary">
                  {a.filename}
                </Text>
                <Button
                  size="sm"
                  intent="ghost"
                  aria-label={`Use as cover: ${a.filename}`}
                  onPress={() => choose(`attachment:${a.id}`)}
                >
                  Use as cover
                </Button>
              </View>
            ))
          )}
        </View>
      </View>
    </Dialog>
  )
}

export default CoverPickerDialog
