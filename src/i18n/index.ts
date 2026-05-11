/**
 * i18n — typed translation strings keyed by language.
 *
 * Add new languages by extending the `Lang` union and supplying a full
 * record. `t(key)` looks up the active language from SITE_CONFIG.lang
 * with `ko` as the final fallback.
 *
 * The strings live in src/i18n/locales/<lang>.ts so files stay small
 * and translators can edit one file at a time.
 */

import { SITE_CONFIG } from '../consts/config';
import ko from './locales/ko';
import en from './locales/en';
import ja from './locales/ja';
import zh from './locales/zh';

/** Languages the theme ships with. Add more by editing this union and
 *  dropping a new file in `./locales`. */
export type Lang = 'ko' | 'en' | 'ja' | 'zh';

export type UiKey = keyof typeof ko;
export type Dict = Record<UiKey, string>;

const dicts: Record<Lang, Dict> = { ko, en, ja, zh };

// `defineLocale` lives in ./define to avoid a circular import (the
// locale files use it; the index imports the locale files).
export { defineLocale } from './define';

/**
 * Look up a UI string in the active language.
 * Falls back to Korean, then to the key itself.
 */
export function t(key: UiKey): string {
  const lang = SITE_CONFIG.lang as Lang;
  return dicts[lang]?.[key] ?? dicts.ko[key] ?? (key as string);
}

/** Get the full dictionary for a specific language (useful for
 *  passing strings into client-side scripts). */
export function dictFor(lang: Lang): Dict {
  return dicts[lang] ?? dicts.ko;
}
