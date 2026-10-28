// ============================================================================
// CoverImage — a page cover (notes-rescope R3, PLAN-R3 G10 · IMPL R-7/R-8 · EC-29).
// `cover` = an http(s) image URL or `attachment:<id>`:
// - a URL → a decorative <img alt=""> (the page title names the page) with NO referrer (the `/notes/<id>` path stays out
//   of the remote host's logs — the ZK stance);
// - `attachment:<id>` → that attachment's THUMBNAIL only (`getAttachmentThumbnail`, a projected read — "attachments never
//   pre-loaded; thumbnails lazy-loaded"); tiles fetch it only once in view. The object URL is made in an effect keyed on
//   the bytes and revoked in its cleanup (the query cache is shared across tiles);
// - anything else, no thumbnail, or a failed load → the neutral placeholder: on the header a `role="img"` "Cover
//   unavailable" [INTERP — PLAN G10]; on a tile decorative (no announced image per tile).
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import { Text, View } from '@tamagui/core'
import { useQuery } from '@tanstack/react-query'
import { getServices } from '../db/composition-root'

export interface CoverImageProps {
  cover: string
  variant: 'header' | 'tile'
  /** Header strip height (default 96 — today's strip, the greybox ~95 px). */
  height?: number
}

const URL_COVER = /^https?:\/\//i
const ATTACHMENT_COVER = /^attachment:(.+)$/

function useInView(enabled: boolean): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null)
  const hasIO = typeof IntersectionObserver !== 'undefined'
  const [inView, setInView] = useState(!enabled || !hasIO)
  useEffect(() => {
    if (inView || !ref.current) return
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setInView(true)
        io.disconnect()
      }
    })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [inView])
  return [ref, inView]
}

function useObjectUrl(bytes: Uint8Array | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!bytes) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(new Blob([bytes as BlobPart]))
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [bytes])
  return url
}

function Placeholder({ variant, height }: { variant: CoverImageProps['variant']; height: number | string }) {
  const named = variant === 'header'
  return (
    <View
      role={named ? 'img' : undefined}
      aria-label={named ? 'Cover unavailable' : undefined}
      aria-hidden={named ? undefined : true}
      height={height}
      width="100%"
      borderRadius="$md"
      backgroundColor="$colorSurfaceSecondary"
      alignItems="center"
      justifyContent="center"
    >
      {named ? (
        <Text fontSize="$caption" color="$colorTextMuted" textTransform="uppercase" letterSpacing={0.8} aria-hidden>
          Cover
        </Text>
      ) : null}
    </View>
  )
}

export function CoverImage({ cover, variant, height = 96 }: CoverImageProps) {
  const attachmentId = ATTACHMENT_COVER.exec(cover)?.[1] ?? null
  const isUrl = URL_COVER.test(cover)
  // Which cover failed to load — a NEW cover clears it (no remount needed; critique B1).
  const [failedFor, setFailedFor] = useState<string | null>(null)
  const failed = failedFor === cover
  const [ref, inView] = useInView(variant === 'tile' && attachmentId != null)
  const thumb = useQuery({
    queryKey: ['attachments', 'thumbnail', attachmentId],
    queryFn: async () => (await getServices()).notes.getAttachmentThumbnail(attachmentId as string),
    enabled: attachmentId != null && inView,
    staleTime: Infinity,
  })
  const objectUrl = useObjectUrl(thumb.data)
  const h = variant === 'header' ? height : '100%'

  const src = isUrl ? cover : objectUrl
  if (
    failed ||
    (!isUrl && attachmentId == null) ||
    (attachmentId != null && thumb.isSuccess && !thumb.data) ||
    thumb.isError
  ) {
    return <Placeholder variant={variant} height={h} />
  }
  return (
    <View
      ref={ref}
      height={h}
      width="100%"
      borderRadius="$md"
      overflow="hidden"
      backgroundColor="$colorSurfaceSecondary"
    >
      {src ? (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          loading={variant === 'tile' ? 'lazy' : undefined}
          onError={() => setFailedFor(cover)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : null}
    </View>
  )
}
