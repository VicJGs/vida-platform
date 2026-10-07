import { useRef, useState, type ReactElement, type Ref } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { Dialog } from './dialog'
import { Button } from './button'

// UI-2 · V6 · export-dialog — the reusable export modal. Composes UI-1 Dialog (via its `footer` + `description` props)
// + a hand-rolled APG radiogroup format picker + Button. Implements
// docs/specs/components/ui-2-platform-views/v6-export-dialog.md.
// - PRESENTATIONAL (the V1 boundary): @vida/ui can't import @vida/core's serializers — the dialog emits
//   `onExport(format)` and the APP wires serialization + download. `ExportFormat` is a LOCAL union (LV-3a), ≡
//   @vida/types EXPORT_FORMAT. No cross-package edge, no new dep.
// - The radios are role="radio" DIVS (no native disabled), so busy drops every radio to tabIndex=-1 (out of Dialog's
//   focus trap); the effective selection is DERIVED each render so an orphaned/empty formats list self-heals.

export type ExportFormat = 'md' | 'pdf' | 'docx' // local; ≡ @vida/types EXPORT_FORMAT

const FORMAT_META: Record<ExportFormat, { label: string; ext: string }> = {
  md: { label: 'Markdown', ext: '.md' },
  pdf: { label: 'PDF', ext: '.pdf' },
  docx: { label: 'Word', ext: '.docx' },
}
const DEFAULT_FORMATS: readonly ExportFormat[] = ['md', 'pdf', 'docx']

export interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The export intent — the APP wires @vida/core/@vida/editor serialization + download. */
  onExport: (format: ExportFormat) => void
  /** Offered formats, in order. Default ['md','pdf','docx']. */
  formats?: readonly ExportFormat[]
  /** Initially-selected format. Default formats[0]. */
  defaultFormat?: ExportFormat
  /** Dialog title. Default 'Export'. */
  title?: string
  /** What's being exported, for the copy (e.g. 'journal entry'). */
  entityLabel?: string
  /** App-driven: disables actions + shows "Exporting…" while the export runs. */
  busy?: boolean
  ref?: Ref<HTMLDivElement>
}

const RadioGroup = styled(View, { flexDirection: 'column', gap: '$8' })
// fe-codec-controls-refinement P2 (LIF-231): hover state (§VIII gap) + the selected accent is a left BAR (Toast model,
// no layout shift) with a NEUTRAL border — the bar + filled Dot are the sole accent (not a doubled brand border + bar).
const Radio = styled(View, {
  position: 'relative',
  overflow: 'hidden',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$12',
  padding: '$12',
  borderWidth: 1,
  borderColor: '$colorBorderDefault',
  borderRadius: '$md',
  cursor: 'pointer',
  hoverStyle: { backgroundColor: '$colorSurfaceSecondary' },
  focusVisibleStyle: { outlineColor: '$colorFocusRing', outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 },
  variants: {
    // selected: no border change — the accent is the AccentBar + the filled Dot (P2 R2).
    disabled: { true: { opacity: 0.5, cursor: 'not-allowed', hoverStyle: { backgroundColor: 'transparent' } } },
  } as const,
})
// The 3px left accent bar for the selected row (aria-hidden; clipped to the radius by Radio's overflow:hidden — the
// Toast accent precedent). Only the bar + Dot carry selection, so the row's border stays quiet.
const AccentBar = styled(View, { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: '$colorBrandPrimary' })
const Dot = styled(View, {
  width: 16,
  height: 16,
  borderRadius: '$full',
  borderWidth: 2,
  borderColor: '$colorTextMuted',
  alignItems: 'center',
  justifyContent: 'center',
  variants: { selected: { true: { borderColor: '$colorBrandPrimary' } } } as const,
})
const DotInner = styled(View, { width: 8, height: 8, borderRadius: '$full', backgroundColor: '$colorBrandPrimary' })

export function ExportDialog({
  open,
  onOpenChange,
  onExport,
  formats = DEFAULT_FORMATS,
  defaultFormat,
  title = 'Export',
  entityLabel,
  busy = false,
  ref,
}: ExportDialogProps): ReactElement {
  const [selState, setSelState] = useState<ExportFormat>(
    defaultFormat && formats.includes(defaultFormat) ? defaultFormat : (formats[0] ?? 'md'),
  )
  // Derive the effective selection each render → self-heals an orphaned sticky state / a changed formats list.
  const selected = formats.includes(selState) ? selState : (formats[0] ?? 'md')

  if (process.env.NODE_ENV !== 'production') {
    if (defaultFormat && !formats.includes(defaultFormat))
      // eslint-disable-next-line no-console
      console.warn(`[vida/ui] ExportDialog: defaultFormat "${defaultFormat}" is not in \`formats\` — falling back.`)
    if (formats.length === 0)
      // eslint-disable-next-line no-console
      console.warn('[vida/ui] ExportDialog: `formats` is empty — the picker has no options.')
  }

  const radioRefs = useRef<(HTMLElement | null)[]>([])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (busy || formats.length === 0) return
    const i = Math.max(0, formats.indexOf(selected))
    let next = i
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        next = (i + 1) % formats.length
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        next = (i - 1 + formats.length) % formats.length
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = formats.length - 1
        break
      case ' ':
        e.preventDefault() // already-selected radio is focused; block page scroll
        return
      default:
        return
    }
    e.preventDefault()
    const nextFmt = formats[next]
    if (nextFmt !== undefined) {
      setSelState(nextFmt) // focus + selection coupled (roving DOM focus, the Menu model)
      radioRefs.current[next]?.focus()
    }
  }

  return (
    <Dialog
      ref={ref}
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={`Export your ${entityLabel ?? 'content'} as:`}
      footer={
        <>
          <Button intent="secondary" disabled={busy} onPress={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button intent="primary" loading={busy} onPress={() => onExport(selected)}>
            {busy ? 'Exporting…' : 'Export'}
          </Button>
        </>
      }
    >
      <RadioGroup role="radiogroup" aria-label="Format" aria-busy={busy || undefined} onKeyDown={onKeyDown}>
        {formats.map((fmt, i) => {
          const isSel = fmt === selected
          const meta = FORMAT_META[fmt]
          return (
            <Radio
              key={fmt}
              ref={(el: HTMLElement | null) => {
                radioRefs.current[i] = el
              }}
              role="radio"
              aria-checked={isSel}
              aria-disabled={busy || undefined}
              tabIndex={!busy && isSel ? 0 : -1}
              disabled={busy}
              onClick={busy ? undefined : () => setSelState(fmt)}
            >
              {isSel ? <AccentBar className="vida-export-accent" aria-hidden /> : null}
              <Dot selected={isSel}>{isSel ? <DotInner /> : null}</Dot>
              <Text fontFamily="$body" fontSize="$body" color="$colorTextPrimary">
                {meta.label}
              </Text>
              <View flex={1} />
              <Text fontFamily="$body" fontSize="$small" color="$colorTextMuted">
                {meta.ext}
              </Text>
            </Radio>
          )
        })}
      </RadioGroup>
    </Dialog>
  )
}
