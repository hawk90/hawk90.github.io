import { visit } from 'unist-util-visit';

const ALIAS = {
  note: 'info',
  info: 'info',
  tip: 'tip',
  warning: 'warning',
  caution: 'warning',
  danger: 'danger',
  important: 'danger',
  tldr: 'tldr',
  summary: 'tldr',
};

const DEFAULT_TITLE = {
  info: 'Note',
  tip: 'Tip',
  warning: 'Warning',
  danger: 'Important',
  tldr: 'TL;DR',
};

export default function remarkCallouts() {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type !== 'containerDirective') return;
      const variant = ALIAS[node.name];
      if (!variant) return;

      // Pull the [label] paragraph out (remark-directive marks it with
      // data.directiveLabel) and use its plain text as the title.
      let title = DEFAULT_TITLE[variant];
      const labelIndex = node.children.findIndex(
        (c) => c.data && c.data.directiveLabel,
      );
      if (labelIndex >= 0) {
        const labelNode = node.children[labelIndex];
        if (labelNode.children?.[0]?.value) {
          title = labelNode.children[0].value;
        }
        node.children.splice(labelIndex, 1);
      }

      // Emit:
      //   <aside class="callout callout-<variant> not-prose" role="note">
      //     <div class="callout-title">{title}</div>
      //     <div class="callout-body">{...children}</div>
      //   </aside>
      const wrappedBody = {
        type: 'element',
        data: { hName: 'div', hProperties: { class: 'callout-body' } },
        children: node.children,
      };
      // Use mdast wrapper paragraph-like trick: insert a "fake" mdast node that
      // emits raw HTML for the title (so it doesn't get parsed as markdown)
      const titleHtml = {
        type: 'html',
        value: `<div class="callout-title"><svg class="callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATH[variant]}</svg><span>${escapeHtml(title)}</span></div>`,
      };
      node.children = [titleHtml, wrappedBody];

      const data = (node.data ??= {});
      data.hName = 'aside';
      data.hProperties = {
        class: `callout callout-${variant} not-prose`,
        role: 'note',
      };
    });
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

const ICON_PATH = {
  info:    '<path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
  tip:     '<path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>',
  warning: '<path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>',
  danger:  '<path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
  tldr:    '<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>',
};
