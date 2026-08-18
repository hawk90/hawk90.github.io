import { visit } from 'unist-util-visit';

/**
 * rehype plugin — wrap every prose `<table>` in a horizontally scrollable box.
 *
 * `.prose table` is `width: 100%`, but a table's *min-content* width is the sum
 * of its columns' longest unbreakable runs. Korean text breaks per character,
 * yet backticked identifiers (`CMAKE_PREFIX_PATH`, `absl::AnyInvocable`) do not,
 * so wide tables push past the content box. Both `html` and `body` set
 * `overflow-x: clip`, which means those columns were not merely off-screen —
 * they were unreachable, with no scrollbar and no gesture to reveal them.
 *
 * The wrapper carries `tabindex="0"` so the region is reachable by keyboard,
 * which a scrollable container needs (axe `scrollable-region-focusable`). It
 * deliberately does *not* carry `role="region"`: a role without an accessible
 * name is worse than no role, and pages here carry up to a dozen tables, so
 * naming each one would flood the landmark list.
 */
export default function rehypeTableScroll() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'table' || !parent || index == null) return;
      if (parent.type === 'element' && parent.properties?.className?.includes?.('table-scroll')) return;

      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['table-scroll'], tabIndex: 0 },
        children: [node],
      };
      // Skip the node we just re-parented; visiting it again would re-wrap it.
      return index + 1;
    });
  };
}
