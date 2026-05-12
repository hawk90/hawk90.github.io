import { STORAGE_KEYS, DEFAULT_CODE_THEMES } from '../consts/config';

// All available code themes (independent of site mode)
export const CODE_THEMES = [
  // Dark themes
  { id: 'github-dark-dimmed', name: 'GitHub Dark', type: 'dark' as const },
  { id: 'dracula', name: 'Dracula', type: 'dark' as const },
  { id: 'one-dark-pro', name: 'One Dark Pro', type: 'dark' as const },
  { id: 'catppuccin-mocha', name: 'Catppuccin Mocha', type: 'dark' as const },
  { id: 'nord', name: 'Nord', type: 'dark' as const },
  { id: 'tokyo-night', name: 'Tokyo Night', type: 'dark' as const },
  // Light themes
  { id: 'github-light', name: 'GitHub Light', type: 'light' as const },
  { id: 'catppuccin-latte', name: 'Catppuccin Latte', type: 'light' as const },
];

// Allowlist of code-theme IDs the inline FOUC script accepts. Kept here so
// the runtime and the FOUC script stay in sync — the inline script in
// BaseLayout embeds this same list as a string.
export const VALID_CODE_THEMES = CODE_THEMES.map((t) => t.id);

function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

export function getStoredTheme(): 'light' | 'dark' | null {
  if (typeof localStorage === 'undefined' || !isStorageAvailable()) return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.theme) as 'light' | 'dark' | null;
  } catch {
    return null;
  }
}

/**
 * Get stored code theme (independent of site mode).
 */
export function getStoredCodeTheme(): string {
  if (typeof localStorage === 'undefined' || !isStorageAvailable()) {
    return DEFAULT_CODE_THEMES.dark;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.codeTheme);
    if (stored && VALID_CODE_THEMES.includes(stored)) {
      return stored;
    }
    return DEFAULT_CODE_THEMES.dark;
  } catch {
    return DEFAULT_CODE_THEMES.dark;
  }
}

export function setStoredTheme(theme: 'light' | 'dark'): void {
  if (!isStorageAvailable()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  } catch {
    // Storage quota exceeded or other error - silently fail
  }
}

/**
 * Set code theme (independent of site mode).
 */
export function setStoredCodeTheme(themeId: string): void {
  if (!isStorageAvailable()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.codeTheme, themeId);
  } catch {
    // Storage quota exceeded or other error - silently fail
  }
}

export function isLightMode(el: HTMLElement = document.documentElement): boolean {
  return el.classList.contains('light');
}

/**
 * Mirror html[data-code-theme] onto every .expressive-code block.
 * Expressive-code matches on the block itself (not an ancestor).
 */
export function syncCodeTheme(root: ParentNode = document): void {
  const theme = document.documentElement.getAttribute('data-code-theme');
  if (!theme) return;
  root
    .querySelectorAll<HTMLElement>('.expressive-code')
    .forEach((el) => el.setAttribute('data-code-theme', theme));
}

export function applyCodeTheme(): void {
  const theme = getStoredCodeTheme();
  document.documentElement.setAttribute('data-code-theme', theme);
  syncCodeTheme();
}

/**
 * Read localStorage and apply theme state (html.light class, code-theme
 * attribute, line-numbers attribute) onto a given documentElement. Used
 * both at first paint (against `document.documentElement`) and during
 * Astro's `before-swap` (against the new document about to be installed).
 */
export function applyTheme(el: HTMLElement = document.documentElement): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.theme);
    const prefersLight =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: light)').matches;
    const isLight = stored === 'light' || (stored !== 'dark' && prefersLight);
    el.classList.toggle('light', isLight);

    // Code theme is now independent of site mode
    const codeTheme = pickCodeTheme(localStorage.getItem(STORAGE_KEYS.codeTheme));
    el.setAttribute('data-code-theme', codeTheme);

    const n = localStorage.getItem(STORAGE_KEYS.showLineNumbers);
    el.setAttribute('data-show-line-numbers', n !== 'false' ? 'true' : 'false');
  } catch {
    // localStorage may be blocked; let CSS / data-* defaults take over.
  }
}

function pickCodeTheme(v: string | null): string {
  return v && VALID_CODE_THEMES.includes(v) ? v : DEFAULT_CODE_THEMES.dark;
}

export function toggleTheme(): boolean {
  const isLight = document.documentElement.classList.toggle('light');
  setStoredTheme(isLight ? 'light' : 'dark');
  return isLight;
}

/**
 * Wire up every reactive theme path:
 *   - astro:before-swap → apply theme to the incoming document
 *   - astro:after-swap / pageshow → re-apply to current document
 *   - astro:page-load → propagate code-theme to new .expressive-code blocks
 *   - storage → cross-tab sync
 * Idempotent: safe to call multiple times (uses named handlers and
 * removes any prior installation before re-adding).
 */
const REACTIVITY_FLAG = '__themeReactivityInstalled';
export function installThemeReactivity(): void {
  if (typeof window === 'undefined') return;
  const w = window as Window & Record<string, unknown>;
  if (w[REACTIVITY_FLAG]) return;
  w[REACTIVITY_FLAG] = true;

  const onBeforeSwap = (e: Event) => {
    const ev = e as CustomEvent<{ newDocument: Document }> & { newDocument?: Document };
    const newDoc = ev.newDocument ?? ev.detail?.newDocument;
    if (newDoc) applyTheme(newDoc.documentElement);
  };
  const onAfterSwapOrShow = () => {
    applyTheme();
    syncCodeTheme();
  };
  const onStorage = (e: StorageEvent) => {
    if (!e.key) return;
    if (
      e.key !== STORAGE_KEYS.theme &&
      e.key !== STORAGE_KEYS.codeTheme &&
      e.key !== STORAGE_KEYS.showLineNumbers
    ) {
      return;
    }
    applyTheme();
    syncCodeTheme();
  };

  document.addEventListener('astro:before-swap', onBeforeSwap);
  document.addEventListener('astro:after-swap', onAfterSwapOrShow);
  document.addEventListener('astro:page-load', () => syncCodeTheme());
  window.addEventListener('pageshow', onAfterSwapOrShow);
  window.addEventListener('storage', onStorage);
}
