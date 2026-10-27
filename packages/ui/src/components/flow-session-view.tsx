import { useId, type ReactNode, type Ref } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { Button } from './button'
import { Card } from './card'
import { Timeline, type TemporalState } from './timeline'
import { ListView } from './list-view'
import { EmptyState } from './empty-state'
import { HonestProgress } from './sync-status'
import { warnMissingName, type ViewState } from '../internal/data-view'

// ============================================================================
// FlowSessionView — the CODEC Flow/Session shell (fe-codec-flow-session #11, S1).
// The 4th archetype shell (Collection #4 · Dashboard #5 · Entity #6 · Flow/Session #11 ← this).
// A flow FRAME for any staged do-this-then-that surface: a title-hero header + the staged
// progression (done/current/upcoming over the shipped Timeline) + the per-stage body slot +
// the STANDARDIZED stage affordances (attach · mark-done · require-proof, EMITTING intents —
// never a write) + a read-only effect-rail log. It renders NO stage body content (consumer's
// renderStage) and FIRES no effect (ADR-004 backend). NOT the timer/HUD (#16), NOT the runtime
// page (#23), NOT the countdown (pomodoro V5). Presentational, state-as-prop (BR-2); @vida/ui is
// Tamagui-only → all types are LOCAL, no @vida/core import. Non-generic (FlowStage is concrete) →
// React-19 ref-as-prop (no forwardRef).
// Spec: docs/specs/components/ui-2-platform-views/flow-session-view.md.
// ============================================================================

/** A stage's lifecycle position in the flow (BR-FS-3 → the Timeline temporal state). */
export type StageStatus = 'done' | 'current' | 'upcoming'
/** The attach affordance kinds (BR-FS-4). */
export type AttachKind = 'document' | 'photo' | 'audio'

export interface FlowStage {
  id: string
  /** The stage eyebrow / kicker (e.g. "Stage 1") — the Timeline getEyebrow (a legit numbered sequence). */
  label: ReactNode
  /** The deliverable title — serif; current = $heading, done/upcoming = $subheading muted. */
  title: ReactNode
  /** Drives the rail temporal state + whether the standardized affordances render (current only). */
  status: StageStatus
  /** The stage BODY's own state (BR-2 / BR-FS-1); default 'success'. */
  state?: ViewState
  /** A done stage's delivered-proof summary (shown collapsed). */
  proof?: ReactNode
}

export interface FlowEffect {
  id: string
  /** The effect type label (e.g. "Logged time") — muted, sentence case. */
  kind: ReactNode
  /** What fired (e.g. "25 min to 'Write the book'"). */
  detail: ReactNode
}

export interface FlowSessionViewProps {
  /** The flow title — names the region + renders as the serif $display H1 (BR-FS-7). */
  title: string
  /** ONE quiet plain-language context line (e.g. "For 'Write the book'") — $small muted, 16px below the title (EC-5). */
  context?: ReactNode
  /** 0..1 progress fraction for the HonestProgress bar; DERIVED from stages (done / total) when omitted (BR-FS-7). */
  progress?: number
  /** The progress bar label; derived ("N of M stages done") when omitted. */
  progressLabel?: string
  /** The save-state slot (e.g. a SyncStatus pill) — right-aligned. */
  saveStatus?: ReactNode
  /** The ⋯ action SLOT — right-aligned. */
  action?: ReactNode

  /** The ordered stages (BR-FS-3). */
  stages: FlowStage[]
  /** The deliverable BODY CONTENT per stage (description / form / custom); the shell frames it + supplies the
   *  standardized affordances for the current stage (BR-FS-5). */
  renderStage?: (stage: FlowStage) => ReactNode
  /** The fulcrum "now" label (default "current stage"). */
  nowLabel?: ReactNode

  /** Standardized stage affordances — the shell renders these for the CURRENT stage, EMITTING intents (BR-FS-2/4). */
  onAttach?: (stageId: string, kind: AttachKind) => void
  onMarkDone?: (stageId: string) => void
  onRequireProof?: (stageId: string) => void

  /** The effect-rail log (BR-FS-6) — read-only; the rail renders iff `effects` is provided. */
  effects?: FlowEffect[]
  /** The effect-log state (BR-2); empty → a teaching EmptyState. */
  effectsState?: ViewState
  effectRailLabel?: ReactNode

  'aria-label'?: string
  'aria-labelledby'?: string
  /** React-19 ref-as-prop → the region element. */
  ref?: Ref<HTMLDivElement>
}

// status → the Timeline temporal state (BR-FS-3).
const TEMPORAL: Record<StageStatus, TemporalState> = { done: 'past', current: 'present', upcoming: 'future' }

// ── styled hosts (unnamed → base theme; no sub-theme — the LV-3 convention) ──────────────────────────────
const FlowRoot = styled(View, {
  flexDirection: 'column',
  gap: '$32',
  width: '100%',
  maxWidth: 820,
  marginHorizontal: 'auto',
})
const Header = styled(View, {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '$16',
})
const TitleGroup = styled(View, { flexShrink: 1, gap: '$16' }) // 16px title→meta rhythm (EC-5, review-2)
const MetaGroup = styled(View, { gap: '$8', maxWidth: 320 })
const HeaderAside = styled(View, { alignItems: 'flex-end', gap: '$8' })
// One wrapping row holds every affordance — nested non-wrapping sub-rows overflow the narrow card column at 375 (RNW
// flexShrink defaults to 0 → a sub-row can't shrink; the gallery-view lesson). Flat + flexWrap lets all controls reflow.
const AffordanceRow = styled(View, { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: '$8' })
const SkeletonRow = styled(View, { height: 12, borderRadius: '$sm', backgroundColor: '$colorSurfaceSecondary' })
const EffectRow = styled(View, { flexDirection: 'row', gap: '$16', alignItems: 'baseline', paddingVertical: '$8' })

// The per-stage body — done=collapsed proof · upcoming=muted preview · current=deliverable + affordances. Degrade-never-crash.
function StageBody({
  stage,
  renderStage,
  onAttach,
  onMarkDone,
  onRequireProof,
}: {
  stage: FlowStage
  renderStage?: (stage: FlowStage) => ReactNode
  onAttach?: (stageId: string, kind: AttachKind) => void
  onMarkDone?: (stageId: string) => void
  onRequireProof?: (stageId: string) => void
}) {
  const st = stage.state ?? 'success'

  if (st === 'loading')
    return (
      <Card padding="default">
        <View aria-busy="true" gap="$8">
          <SkeletonRow width="70%" />
          <SkeletonRow width="90%" />
        </View>
      </Card>
    )
  if (st === 'error')
    return (
      <Card padding="default">
        <View role="status">
          <Text fontSize="$small" color="$colorTextMuted">
            Couldn’t load this stage.
          </Text>
        </View>
      </Card>
    )

  // DONE — collapsed: the delivered proof.
  if (stage.status === 'done')
    return (
      <Card padding="default">
        <View gap="$4">
          <Text fontFamily="$display" fontSize="$subheading" color="$colorTextMuted">
            {stage.title}
          </Text>
          {stage.proof != null && (
            <Text fontSize="$caption" color="$colorTextMuted">
              ✓ {stage.proof}
            </Text>
          )}
        </View>
      </Card>
    )

  // UPCOMING — collapsed: a faded preview (the consumer's body, muted).
  if (stage.status === 'upcoming')
    return (
      <Card padding="default">
        <View gap="$4">
          <Text fontFamily="$display" fontSize="$subheading" color="$colorTextMuted">
            {stage.title}
          </Text>
          {renderStage != null && <View>{renderStage(stage)}</View>}
        </View>
      </Card>
    )

  // CURRENT — the active deliverable + the standardized affordances. The ONE prominent surface (accent spent here).
  // The affordance row renders ONLY when at least one affordance handler is provided — the DS render-when-handler
  // idiom (collection `onFilter != null`, canvas-reader ListenBar): a deliverable flow passes handlers + gets the
  // row; a non-deliverable flow (e.g. a create-wizard whose body owns its own Back/Next/Create) passes none + gets
  // no dead no-op buttons. (fe-gamification S4: the rule-authoring flow uses the staged frame, not attach/mark-done.)
  const hasAffordances = onMarkDone != null || onRequireProof != null || onAttach != null
  return (
    <Card
      padding="spacious"
      header={
        <Text fontFamily="$display" fontSize="$heading" color="$colorTextPrimary">
          {stage.title}
        </Text>
      }
      footer={
        hasAffordances ? (
          <AffordanceRow>
            {onMarkDone != null ? (
              <Button intent="primary" size="sm" onPress={() => onMarkDone(stage.id)}>
                Mark done
              </Button>
            ) : null}
            {onRequireProof != null ? (
              <Button intent="secondary" size="sm" onPress={() => onRequireProof(stage.id)}>
                Require proof
              </Button>
            ) : null}
            {onAttach != null ? (
              <>
                <Text fontSize="$small" color="$colorTextMuted" marginLeft="$4">
                  Attach
                </Text>
                <Button intent="ghost" size="sm" onPress={() => onAttach(stage.id, 'document')}>
                  Document
                </Button>
                <Button intent="ghost" size="sm" onPress={() => onAttach(stage.id, 'photo')}>
                  Photo
                </Button>
                <Button intent="ghost" size="sm" onPress={() => onAttach(stage.id, 'audio')}>
                  Audio
                </Button>
              </>
            ) : null}
          </AffordanceRow>
        ) : undefined
      }
    >
      {renderStage != null ? renderStage(stage) : null}
    </Card>
  )
}

// A plain component — non-generic (FlowStage is concrete). React 19 spreads `ref` as a prop (no forwardRef).
export function FlowSessionView({
  title,
  context,
  progress,
  progressLabel,
  saveStatus,
  action,
  stages,
  renderStage,
  nowLabel = 'current stage',
  onAttach,
  onMarkDone,
  onRequireProof,
  effects,
  effectsState = 'success',
  effectRailLabel = 'Effect rail',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ref,
}: FlowSessionViewProps) {
  const titleId = useId()
  const resolvedLabelledby = ariaLabelledby ?? (ariaLabel == null ? titleId : undefined)
  if (process.env.NODE_ENV !== 'production') warnMissingName('FlowSessionView', ariaLabel, resolvedLabelledby)

  const total = stages.length
  const done = stages.filter((s) => s.status === 'done').length
  const fraction = progress ?? (total > 0 ? done / total : 0)
  const label = progressLabel ?? `${done} of ${total} stages done`

  return (
    <FlowRoot ref={ref} role="region" aria-label={ariaLabel} aria-labelledby={resolvedLabelledby}>
      {/* Header — title-hero (BR-FS-7): serif title carries; progress is a BAR; one quiet context line 16px below. */}
      <Header>
        <TitleGroup>
          <Text id={titleId} fontFamily="$display" fontSize="$display" color="$colorTextPrimary">
            {title}
          </Text>
          <MetaGroup>
            {context != null && (
              <Text fontSize="$small" color="$colorTextMuted">
                {context}
              </Text>
            )}
            {total > 0 && <HonestProgress value={fraction} label={label} />}
          </MetaGroup>
        </TitleGroup>
        {(saveStatus != null || action != null) && (
          <HeaderAside>
            {saveStatus}
            {action}
          </HeaderAside>
        )}
      </Header>

      {/* Staged progression — the shipped Timeline (BR-FS-3): done=past · current=present · upcoming=future. */}
      <Timeline<FlowStage>
        items={stages}
        getKey={(s) => s.id}
        getEyebrow={(s) => s.label}
        getLabel={(s) => (s.status === 'done' ? '✓' : s.status === 'current' ? 'now' : '')}
        getTemporalState={(s) => TEMPORAL[s.status]}
        nowFulcrum
        nowLabel={nowLabel}
        renderItem={(s) => (
          <StageBody
            stage={s}
            renderStage={renderStage}
            onAttach={onAttach}
            onMarkDone={onMarkDone}
            onRequireProof={onRequireProof}
          />
        )}
        aria-label="Flow stages"
      />

      {/* Effect-rail LOG (BR-FS-6) — read-only; renders iff `effects` is provided. Label medium-muted (no all-caps). */}
      {effects != null && (
        <View gap="$12">
          <Text fontSize="$subheading" fontWeight="500" color="$colorTextPrimary">
            {effectRailLabel}
          </Text>
          <ListView<FlowEffect>
            items={effects}
            state={effectsState}
            getKey={(e) => e.id}
            aria-label="Effects fired this session"
            empty={
              <EmptyState title="Nothing logged yet">
                <Text fontSize="$body" color="$colorTextMuted">
                  Mark a stage done and its effects — time, experience, measurements — show up here.
                </Text>
              </EmptyState>
            }
            renderItem={(e) => (
              <EffectRow>
                <Text fontSize="$small" fontWeight="500" color="$colorTextMuted" minWidth={120}>
                  {e.kind}
                </Text>
                <Text fontSize="$body" color="$colorTextPrimary">
                  {e.detail}
                </Text>
              </EffectRow>
            )}
          />
        </View>
      )}
    </FlowRoot>
  )
}

export default FlowSessionView
