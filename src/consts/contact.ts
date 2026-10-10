import { defineEmail } from '../lib/define';

/**
 * Keep the public contact address split. EmailLink assembles it only after a
 * deliberate click, so the completed address is not emitted into page HTML.
 */
export const CONTACT_EMAIL = defineEmail('hawking90a', 'gmail.com');
