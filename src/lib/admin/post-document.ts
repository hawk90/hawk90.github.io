import { serializeFrontmatter } from './github-api';

export interface PostDocumentInput {
  title: string;
  description?: string;
  tags: string[];
  date: string;
  draft: boolean;
  body: string;
}

export function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function parseTagInput(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function buildPostDocument(input: PostDocumentInput): string {
  const frontmatter: Record<string, unknown> = {
    title: input.title || 'Untitled',
    date: input.date,
    draft: input.draft,
  };

  if (input.description) {
    frontmatter.description = input.description;
  }

  if (input.tags.length > 0) {
    frontmatter.tags = input.tags;
  }

  return `${serializeFrontmatter(frontmatter)}\n\n${input.body}`;
}

export function isValidContentPathSegment(value: string): boolean {
  const safeSegment = /^[A-Za-z0-9가-힣][A-Za-z0-9가-힣._\-\/]*$/;
  return safeSegment.test(value) && !value.includes('..');
}

export function isAllowedContentFilePath(path: string, contentRoot: string): boolean {
  if (!path.startsWith(`${contentRoot}/`)) {
    return false;
  }

  if (!/\.(md|mdx)$/.test(path)) {
    return false;
  }

  const relativePath = path.slice(contentRoot.length + 1);
  return isValidContentPathSegment(relativePath);
}

export function sanitizePreviewFragment(html: string): DocumentFragment {
  if (typeof document === 'undefined') {
    throw new Error('Markdown previews can only be rendered in a browser.');
  }

  const parsed = new DOMParser().parseFromString(html, 'text/html');

  const blockedTags = new Set([
    'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META',
    'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'OPTION', 'SVG', 'MATH',
  ]);
  const urlAttributes = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'poster']);

  const sanitizeNode = (node: Element) => {
    if (blockedTags.has(node.tagName)) {
      node.remove();
      return;
    }

    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();

      if (name.startsWith('on')) {
        node.removeAttribute(attr.name);
        continue;
      }

      if (name === 'style' || name === 'srcdoc' || name === 'srcset') {
        node.removeAttribute(attr.name);
        continue;
      }

      if (urlAttributes.has(name) && !isSafePreviewUrl(value)) {
        node.removeAttribute(attr.name);
      }
    }

    for (const child of Array.from(node.children)) {
      sanitizeNode(child);
    }
  };

  for (const child of Array.from(parsed.body.children)) {
    sanitizeNode(child);
  }

  const fragment = document.createDocumentFragment();
  fragment.append(...Array.from(parsed.body.childNodes));
  return fragment;
}

function isSafePreviewUrl(value: string): boolean {
  if (value.startsWith('#') || value.startsWith('/') || value.startsWith('./') || value.startsWith('../')) {
    return true;
  }

  try {
    const protocol = new URL(value, document.baseURI).protocol;
    return protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:';
  } catch {
    return false;
  }
}
