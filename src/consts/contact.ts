import { defineEmail } from '../lib/define';

/**
 * Keep the public addresses split. EmailLink assembles them only after a
 * deliberate click, so a completed address is not emitted into page HTML.
 * Both forward to the owner's inbox through Cloudflare Email Routing.
 */

/** Site contact: Contact and Privacy pages, footer. */
export const CONTACT_EMAIL = defineEmail('contact', 'hawk90.dev');

/** The author personally: author bio under posts, resume. */
export const PERSONAL_EMAIL = defineEmail('me', 'hawk90.dev');
