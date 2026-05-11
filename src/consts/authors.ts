/**
 * Author registry. Each blog post can set `author: 'id'` in its
 * frontmatter to link to one of these. Falls back to SITE_CONFIG.author
 * when no match is found.
 *
 * To add an author:
 *   1. Append an entry below with a unique `id`
 *   2. Drop an avatar at /public/images/authors/<id>.jpg (or set a URL)
 *   3. Reference by id in post frontmatter
 */

import { defineAuthors, type AuthorConfig } from '../lib/define';

export const AUTHORS = defineAuthors([
  {
    id: 'hawk',
    name: 'Hawk',
    bio: 'System & Firmware Developer. Loves C++, ARM/RISC-V, and writing close to the hardware.',
    avatar: '/images/pic.jpg',
    url: '/about',
    social: {
      github: 'hawk90',
      email: 'hawking90a@gmail.com',
    },
  },
]);

/** Find an author by id; returns undefined if not registered. */
export function findAuthor(id?: string): AuthorConfig | undefined {
  if (!id) return undefined;
  return AUTHORS.find((a) => a.id === id);
}
