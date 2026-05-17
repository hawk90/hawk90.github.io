import { visit } from 'unist-util-visit';

/**
 * rehype plugin — add `loading="lazy"` and `decoding="async"` to every <img>:
 *   - element nodes (markdown `![](...)` syntax, parsed via rehype-raw)
 *   - raw HTML <img> tags in markdown (raw / html node types)
 * Above-the-fold images opt out by setting `loading="eager"` explicitly.
 */
export default function rehypeImageLazy() {
  const rewriteHtmlString = (value) => {
    if (!value || !value.includes('<img')) return value;
    return value.replace(/<img\b([^>]*?)(\/?)>/gi, (_match, attrs, selfClose) => {
      const hasLoading = /\bloading\s*=/.test(attrs);
      const hasDecoding = /\bdecoding\s*=/.test(attrs);
      let injected = attrs;
      if (!hasLoading) injected += ' loading="lazy"';
      if (!hasDecoding) injected += ' decoding="async"';
      return `<img${injected}${selfClose}>`;
    });
  };

  return (tree) => {
    visit(tree, (node) => {
      if (node.type === 'element' && node.tagName === 'img') {
        node.properties = node.properties || {};
        if (node.properties.loading == null) node.properties.loading = 'lazy';
        if (node.properties.decoding == null) node.properties.decoding = 'async';
        return;
      }
      if ((node.type === 'raw' || node.type === 'html') && typeof node.value === 'string') {
        node.value = rewriteHtmlString(node.value);
      }
    });
  };
}
