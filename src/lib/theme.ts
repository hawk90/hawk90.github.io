import { STORAGE_KEYS, DEFAULT_CODE_THEMES } from '../consts/config';

export const CODE_THEMES = {
  dark: [
    { id: 'github-dark-dimmed', name: 'GitHub Dark' },
    { id: 'dracula', name: 'Dracula' },
    { id: 'one-dark-pro', name: 'One Dark Pro' },
    { id: 'catppuccin-mocha', name: 'Catppuccin Mocha' },
    { id: 'nord', name: 'Nord' },
    { id: 'tokyo-night', name: 'Tokyo Night' },
  ],
  light: [
    { id: 'github-light', name: 'GitHub Light' },
    { id: 'catppuccin-latte', name: 'Catppuccin Latte' },
  ],
};

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

export function getStoredCodeTheme(mode: 'dark' | 'light'): string {
  const defaultTheme = mode === 'dark' ? DEFAULT_CODE_THEMES.dark : DEFAULT_CODE_THEMES.light;
  if (typeof localStorage === 'undefined' || !isStorageAvailable()) {
    return defaultTheme;
  }
  try {
    const key = mode === 'dark' ? STORAGE_KEYS.codeThemeDark : STORAGE_KEYS.codeThemeLight;
    return localStorage.getItem(key) || defaultTheme;
  } catch {
    return defaultTheme;
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

export function setStoredCodeTheme(mode: 'dark' | 'light', themeId: string): void {
  if (!isStorageAvailable()) return;
  try {
    const key = mode === 'dark' ? STORAGE_KEYS.codeThemeDark : STORAGE_KEYS.codeThemeLight;
    localStorage.setItem(key, themeId);
  } catch {
    // Storage quota exceeded or other error - silently fail
  }
}

export function isLightMode(): boolean {
  return document.documentElement.classList.contains('light');
}

export function applyCodeTheme(): void {
  const isLight = isLightMode();
  const theme = getStoredCodeTheme(isLight ? 'light' : 'dark');
  document.documentElement.setAttribute('data-code-theme', theme);
}

export function toggleTheme(): boolean {
  const isLight = document.documentElement.classList.toggle('light');
  setStoredTheme(isLight ? 'light' : 'dark');
  applyCodeTheme();
  return isLight;
}
