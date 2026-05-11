/**
 * Identity helper that gives autocomplete when defining a locale
 * dictionary. Kept in its own module to avoid a circular import:
 * locales import this, and the i18n index imports the locales.
 */
export const defineLocale = <T extends Record<string, string>>(d: T) => d;
