// Re-export from the new i18n module. Kept for backward compatibility
// with components that already import { t } from '../consts/ui-strings'.
// New code should import from '../i18n'.
export { t } from '../i18n';
export type { Lang, UiKey } from '../i18n';
