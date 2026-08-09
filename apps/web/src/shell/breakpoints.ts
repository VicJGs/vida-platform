// Shell breakpoint + container SSOT — UX-3 (LIF-92). APPLIES `standards/design.md §X/§IV`; invents no values.
// Data-only, NO `@tamagui` import: the shell layout regions (regions.ts) + the UI-4 chrome read from here.
//
// design.md §X mandates a MOBILE-FIRST responsive model: `mobile` is the baseline (min 0); larger widths are
// enhancements applied at min-width thresholds. `375` is the mobile design/test reference width, NOT a threshold
// (mobile styles apply from 0). `wide` (1920) is max-width containment only — not a distinct layout state.

/** The four named breakpoints (design.md §X:202-206). */
export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide'

/**
 * Mobile-first min-width thresholds. A width resolves to the LARGEST breakpoint whose `minWidth <= width`
 * (see {@link breakpointForWidth}). `[FACT: design.md §X:202-205]`
 */
export const BREAKPOINTS = {
  mobile: { minWidth: 0 }, // baseline; design/test reference width = 375
  tablet: { minWidth: 768 }, // `md:` in Tailwind
  desktop: { minWidth: 1440 }, // `lg:`/`xl:` in Tailwind
  wide: { minWidth: 1920 }, // `2xl:` — max-width containment only, not a distinct layout
} as const

/** Ordered small→large — the canonical iteration order for the mobile-first ladder. */
export const BREAKPOINT_ORDER: readonly Breakpoint[] = ['mobile', 'tablet', 'desktop', 'wide']

/** The three primary widths every layout is reviewed/tested at. `[FACT: design.md §X:213-214]` */
export const PRIMARY_TEST_WIDTHS = [375, 768, 1440] as const

/** Maximum content width, centered — a GLOBAL rule (a CSS no-op below this, caps above). `[FACT: design.md §X:224]` */
export const CONTENT_MAX_WIDTH = 1280

/** Content side padding (gutters) per breakpoint. `[FACT: design.md §X:225-227]` */
export const SIDE_PADDING = { mobile: 16, tablet: 24, desktop: 32 } as const

/** Minimum touch-target size + gap — enforced at ALL widths, not just mobile. `[FACT: design.md §X:218-219]` */
export const TOUCH_TARGET = { minSize: 44, minGap: 8 } as const

/** The named density/padding scale (vertical / horizontal). `[FACT: design.md §IV:159-162]` */
export const PADDING_SCALE = {
  compact: { v: 8, h: 12 },
  default: { v: 12, h: 16 },
  loose: { v: 16, h: 24 },
  spacious: { v: 24, h: 32 },
} as const

/**
 * Resolve a viewport width to its breakpoint (mobile-first: largest threshold `<= width`).
 * 767→mobile, 768→tablet, 1439→tablet, 1440→desktop, 1919→desktop, 1920→wide.
 */
export function breakpointForWidth(width: number): Breakpoint {
  let resolved: Breakpoint = 'mobile'
  for (const bp of BREAKPOINT_ORDER) {
    if (width >= BREAKPOINTS[bp].minWidth) resolved = bp
  }
  return resolved
}

/**
 * The RESERVED Tamagui `createMedia` config — a plain object literal in the createMedia shape (NOT a `createMedia`
 * call, NOT a `@tamagui` import). The D5 seam: UI-4 registers this into `createMedia` when it wires `@vida/ui` into
 * apps/web (`packages/ui` is out of UX-3's scope). Mobile-first: `mobile` is the empty base; the rest carry minWidth.
 */
export const TAMAGUI_MEDIA = {
  mobile: {},
  tablet: { minWidth: 768 },
  desktop: { minWidth: 1440 },
  wide: { minWidth: 1920 },
} as const
