// Per-series visual themes for OG images.
// Each series gets a distinct palette so the social-card image hints at the
// book at a glance, while the layout stays consistent.

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
  /** short label/glyph shown in the corner — keep ≤4 chars */
  badge?: string;
}

/** Default — used when no series matches. */
export const DEFAULT_THEME: OGTheme = {
  bgFrom: '#0f0d17',
  bgTo:   '#1a1625',
  accent: '#a78bfa',
  accentSoft: 'rgba(167, 139, 250, 0.2)',
  text: '#f0f0f2',
  subtext: '#b8b5c5',
};

const THEMES: Record<string, OGTheme> = {
  // ─── C++ books ──────────────────────────────────────────────
  'Effective Modern C++': {
    bgFrom: '#1a0f2e',
    bgTo:   '#2a1748',
    accent: '#a78bfa',
    accentSoft: 'rgba(167, 139, 250, 0.2)',
    text: '#f0f0f2',
    subtext: '#c5b8d5',
    badge: 'EMC++',
  },
  'Effective C++': {
    bgFrom: '#0c1e2e',
    bgTo:   '#103048',
    accent: '#5eead4',
    accentSoft: 'rgba(94, 234, 212, 0.2)',
    text: '#eef8f7',
    subtext: '#a8c4c0',
    badge: 'EC++',
  },
  'Beautiful C++': {
    bgFrom: '#0d2018',
    bgTo:   '#143028',
    accent: '#86efac',
    accentSoft: 'rgba(134, 239, 172, 0.2)',
    text: '#eef7ef',
    subtext: '#a8c5b0',
    badge: 'BC++',
  },

  // ─── Patterns / engineering ─────────────────────────────────
  'GoF Design Patterns': {
    bgFrom: '#2a1018',
    bgTo:   '#3a1828',
    accent: '#fb7185',
    accentSoft: 'rgba(251, 113, 133, 0.2)',
    text: '#fdeef0',
    subtext: '#d5b0b8',
    badge: 'GoF',
  },
  'UML User Guide': {
    bgFrom: '#241408',
    bgTo:   '#3a200c',
    accent: '#fb923c',
    accentSoft: 'rgba(251, 146, 60, 0.2)',
    text: '#fcf2e8',
    subtext: '#d5b8a0',
    badge: 'UML',
  },

  // ─── Algorithms / data ─────────────────────────────────────
  'Data Structures and Algorithms': {
    bgFrom: '#1a1408',
    bgTo:   '#2a200c',
    accent: '#fbbf24',
    accentSoft: 'rgba(251, 191, 36, 0.2)',
    text: '#fdf6e8',
    subtext: '#d5c5a0',
    badge: 'DSA',
  },

  // ─── Mathematics ───────────────────────────────────────────
  'Linear Algebra': {
    bgFrom: '#0c1830',
    bgTo:   '#142048',
    accent: '#818cf8',
    accentSoft: 'rgba(129, 140, 248, 0.2)',
    text: '#eef0fc',
    subtext: '#b0b8d5',
    badge: 'LA',
  },
  'Set Theory': {
    bgFrom: '#0a1428',
    bgTo:   '#102040',
    accent: '#60a5fa',
    accentSoft: 'rgba(96, 165, 250, 0.2)',
    text: '#eaf2fd',
    subtext: '#a8bcd5',
    badge: 'ST',
  },
};

export function themeForSeries(series: string | undefined): OGTheme {
  if (!series) return DEFAULT_THEME;
  return THEMES[series] ?? DEFAULT_THEME;
}
