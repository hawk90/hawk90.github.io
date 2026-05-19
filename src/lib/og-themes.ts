// Per-series visual themes for OG images.
//
// Theme data + procedural generator live in og-themes.data.mjs so the
// pre-build OG script (scripts/build-og.mjs) can consume the same source
// of truth without pulling TypeScript into the Node script.
import {
  DEFAULT_THEME as DATA_DEFAULT,
  themeForSeriesName,
} from './og-themes.data.mjs';

export interface OGTheme {
  /** background gradient — two colors, top-left → bottom-right */
  bgFrom: string;
  bgTo: string;
  /** accent color — series label, brand, tag pills */
  accent: string;
  /** subtle accent (rgba) used for tag pill background */
  accentSoft: string;
  /** main text color (title) */
  text: string;
  /** secondary text color (description) */
  subtext: string;
  /** short label/glyph shown in the corner — keep ≤6 chars */
  badge?: string;
}

export const DEFAULT_THEME: OGTheme = DATA_DEFAULT as OGTheme;

export function themeForSeries(series: string | undefined): OGTheme {
  return themeForSeriesName(series) as OGTheme;
}
