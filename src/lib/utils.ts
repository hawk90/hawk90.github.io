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
 * Get series URL from series name
 */
export function getSeriesUrl(seriesName: string): string {
  return `/series/${toSlug(seriesName)}`;
}

/**
 * Get tag URL from tag name
 */
export function getTagUrl(tagName: string): string {
  return `/tags/${encodeURIComponent(tagName.toLowerCase())}`;
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
