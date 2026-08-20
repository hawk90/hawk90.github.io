/**
 * Format date to Korean locale string
 */
export function formatDate(date: Date, style: 'long' | 'short' = 'long'): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: style,
    day: 'numeric',
  });
}

/**
 * Convert string to URL-safe slug
 */
export function toSlug(str: string): string {
  return str
    .trim()
    .toLowerCase()
    // replace whitespace with dash
    .replace(/\s+/g, '-')
    // remove leading/trailing dashes
    .replace(/^-+|-+$/g, '')
    // collapse multiple dashes
    .replace(/-+/g, '-');
}

/**
 * The index page for a category.
 *
 * Shares the `/blog/` prefix with post URLs but is a different route: category
 * ids come from `categories.ts`, post routes from frontmatter `slug:`. Kept
 * here so the prefix has one definition per kind of thing rather than one per
 * call site.
 */
export function getCategoryUrl(categoryId: string): string {
  return `/blog/${categoryId}`;
}

/**
 * Get tag URL from tag name
 */
export function getTagUrl(tagName: string): string {
  return `/tags/${encodeURIComponent(tagName.toLowerCase())}`;
}

/**
 * The canonical URL of a post.
 *
 * Every link to a post goes through here, including the route that generates
 * it, so there is exactly one definition of where a post lives. It currently
 * derives from the entry id, which is the file path — meaning a published URL
 * and a folder are the same fact, and moving a file breaks its links.
 *
 * That coupling is the reason this function exists. Changing the rule here is
 * a one-line edit; changing it in fourteen template literals scattered across
 * components is how a site ends up with two URLs for one post. The
 * `stable-url` control in `audit-content-portability.mjs` fails the build if a
 * caller starts building the path by hand again.
 *
 * Accepts anything carrying an `id`, so collection entries, the normalized
 * document model, and plain search-index rows all use the same path.
 */
export function getPostUrl(post: { id: string } | string): string {
  return `/blog/${getPostRouteParam(post)}`;
}

/**
 * The `[...slug]` param for a post's page.
 *
 * Split from `getPostUrl` so the route that *creates* the page and every link
 * that *points at* it read the same definition. Two expressions that happen to
 * agree today are how a link starts 404ing the day one of them changes.
 */
export function getPostRouteParam(post: { id: string } | string): string {
  // `id` is already the frozen value when a post sets `slug:` in frontmatter —
  // Astro's glob loader substitutes it there, so nothing extra is needed here.
  return typeof post === 'string' ? post : post.id;
}

/**
 * Escape HTML special characters.
 *
 * Apostrophe is intentionally omitted: numeric entities like &#039; are not
 * decoded by satori-html (used in OG image generation), so escaping ' there
 * renders literal "Hawk&#039;s Blog" into the PNG. In normal HTML output
 * Astro's auto-escape handles the remaining cases.
 */
export function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  };
  return str.replace(/[&<>"]/g, (m) => map[m]);
}
