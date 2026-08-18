#!/usr/bin/env node
/**
 * audit-reading-experience.mjs — measure the rendered reading surface.
 *
 * Every check here runs against `dist/`, not against markdown source. The
 * defects this audit exists to catch only appear after the pipeline has had
 * its say: a table's overflow depends on computed column widths, a heading
 * skip depends on which component emitted the heading, and an angle-bracket
 * placeholder only disappears once rehype has parsed it as an element.
 *
 * Checks, and the anti-pattern each one answers:
 *   AP-U-34/35  table clipped with no reachable scroll
 *   AP-U-75/76  heading level skipped
 *   AP-U-77     link with no accessible name
 *   AP-U-87/88  alt text that is a filename, or a wall of text
 *   AP-U-89     data table with no header cells
 *   AP-U-81     motion not reducible
 *   AP-U-84     no skip link
 *   AP-U-85     document language not declared
 *   AP-U-99/100 print stylesheet missing, or code clipped on paper
 *
 * Usage: node scripts/audit-reading-experience.mjs [--dist dir] [--json] [--quiet]
 * Exit code is 1 when a check fails, so it can gate a release.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const distDir = args.includes('--dist') ? args[args.indexOf('--dist') + 1] : 'dist';
const asJson = args.includes('--json');
const quiet = args.includes('--quiet');

if (!existsSync(distDir)) {
  console.error(`${distDir}/ not found — run \`npm run build\` first.`);
  process.exit(2);
}

// ── helpers ────────────────────────────────────────────────────────────────
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

/** Scripts and comments carry markup that never reaches the accessibility tree. */
const stripInert = (html) =>
  html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

const textOf = (html) => html.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').trim();

const pages = walk(distDir).sort();
const cssText = readdirSync(join(distDir, '_astro'))
  .filter((f) => f.endsWith('.css'))
  .map((f) => readFileSync(join(distDir, '_astro', f), 'utf8'))
  .join('\n');

const findings = [];
const add = (check, ap, page, detail) => findings.push({ check, ap, page, detail });

// ── site-wide checks (CSS and shell, measured once) ────────────────────────
const siteChecks = [
  {
    check: 'reduced-motion',
    ap: 'AP-U-81',
    ok: /@media\s*\(prefers-reduced-motion/.test(cssText),
    detail: 'no prefers-reduced-motion block in the bundled CSS',
  },
  {
    check: 'print-stylesheet',
    ap: 'AP-U-99',
    ok: /@media print/.test(cssText),
    detail: 'no @media print block in the bundled CSS',
  },
  {
    check: 'print-code-wrap',
    ap: 'AP-U-100',
    ok: /@media print[\s\S]{0,2000}?white-space:\s*pre-wrap/.test(cssText),
    detail: 'print block does not wrap <pre>, so wide code is cut at the margin',
  },
  {
    check: 'table-scroll-region',
    ap: 'AP-U-35',
    // The minifier folds `overflow-x: auto; overflow-y: hidden` into the
    // `overflow: auto hidden` shorthand, so match either spelling.
    ok: /\.table-scroll\s*\{[^}]*overflow(-x)?:\s*auto/.test(cssText),
    detail: 'prose tables have no horizontal scroll container',
  },
  {
    check: 'focus-visible',
    ap: 'AP-U-73',
    ok: /:focus-visible\s*\{[^}]*outline:\s*[^;n]/.test(cssText),
    detail: 'no visible :focus-visible outline',
  },
  {
    check: 'anchor-offset',
    ap: 'AP-U-52',
    ok: /scroll-margin-top:/.test(cssText),
    detail: 'headings have no scroll-margin-top, so anchors land under the sticky header',
  },
];
for (const c of siteChecks) if (!c.ok) add(c.check, c.ap, '(site css)', c.detail);

// ── per-page checks ────────────────────────────────────────────────────────
let tableCount = 0;
let imgCount = 0;
let linkCount = 0;

for (const page of pages) {
  const raw = readFileSync(page, 'utf8');
  const html = stripInert(raw);
  const rel = page.replace(/^dist\//, '');

  // Not every .html in dist is a page a reader lands on. Search-console
  // verification stubs have no document at all, and the /random shim exists to
  // bounce the visitor onward — neither has a reading experience to audit.
  if (!/<html\b/i.test(raw)) continue;
  if (/http-equiv="refresh"/i.test(raw)) continue;

  if (!/<html[^>]*\blang=/.test(raw)) add('lang', 'AP-U-85', rel, '<html> has no lang attribute');
  if (!/skip[- ]to[- ](main|content)/i.test(raw) && !/class="[^"]*skip-link/.test(raw)) {
    add('skip-link', 'AP-U-84', rel, 'no skip link');
  }

  // Heading cascade, over the main region only — the header and footer repeat
  // on every page and are not part of the document outline a reader walks.
  const mainMatch = html.match(/<main\b[\s\S]*?<\/main>/i);
  const main = mainMatch ? mainMatch[0] : html;
  let prev = 0;
  for (const m of main.matchAll(/<h([1-6])\b/g)) {
    const level = Number(m[1]);
    if (prev && level > prev + 1) add('heading-skip', 'AP-U-76', rel, `h${prev} → h${level}`);
    prev = level;
  }

  // Tables: header cells, and a reachable scroll container.
  for (const m of main.matchAll(/<table[\s\S]*?<\/table>/gi)) {
    tableCount++;
    if (!/<th\b/i.test(m[0])) add('table-no-header', 'AP-U-89', rel, 'table has no <th>');
    const before = main.slice(Math.max(0, m.index - 200), m.index);
    if (/class="prose|container-narrow prose/.test(html) && !/table-scroll/.test(before)) {
      add('table-unwrapped', 'AP-U-35', rel, 'prose table is not inside .table-scroll');
    }
  }

  // Images.
  for (const m of main.matchAll(/<img\b(?:"[^"]*"|'[^']*'|[^>"'])*>/gi)) {
    imgCount++;
    const alt = m[0].match(/\balt="([^"]*)"/);
    if (!alt) add('img-no-alt', 'AP-U-87', rel, m[0].slice(0, 90));
    else if (/\.(svg|png|jpe?g|webp|gif)$/i.test(alt[1])) {
      add('alt-is-filename', 'AP-U-87', rel, alt[1]);
    } else if (alt[1].length > 250) {
      add('alt-too-long', 'AP-U-88', rel, `${alt[1].length} chars`);
    }
  }

  // Links with no accessible name at all.
  for (const m of main.matchAll(/<a\b((?:"[^"]*"|'[^']*'|[^>"'])*)>([\s\S]*?)<\/a>/gi)) {
    linkCount++;
    const [, attrs, inner] = m;
    if (textOf(inner)) continue;
    if (/aria-label=|title=/.test(attrs)) continue;
    if (/<img\b|<svg\b/i.test(inner)) continue;
    add('link-no-name', 'AP-U-77', rel, m[0].slice(0, 90).replace(/\s+/g, ' '));
  }

  // Markdown placeholders eaten by the HTML parser. `<addr>` in prose becomes
  // an unknown element and the reader never sees it. Attribute values are
  // blanked first: expressive-code stores the raw source in `data-code`, where
  // an unescaped `<` is legal and means nothing.
  const noAttrs = main.replace(/="[^"]*"/g, '=""');
  for (const m of noAttrs.matchAll(/<\/(addr|count|val|blk|cnt|start|end|kernel|ramdisk|fdt|var|sub|type|name|project|module|number|version)>/gi)) {
    add('placeholder-parsed-as-html', 'AP-U-41', rel, `<${m[1]}> was parsed as an element`);
  }
}

// ── report ─────────────────────────────────────────────────────────────────
const byCheck = new Map();
for (const f of findings) {
  if (!byCheck.has(f.check)) byCheck.set(f.check, []);
  byCheck.get(f.check).push(f);
}

if (asJson) {
  console.log(JSON.stringify({
    scanned: { pages: pages.length, tables: tableCount, images: imgCount, links: linkCount },
    findings,
  }, null, 2));
} else if (!quiet || findings.length) {
  console.log(`읽기 경험 감사 — ${pages.length} pages, ${tableCount} tables, ${imgCount} images, ${linkCount} links`);
  if (!findings.length) {
    console.log('\n위반 없음.');
  } else {
    for (const [check, list] of [...byCheck].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`\n${check} (${list[0].ap}) — ${list.length}건`);
      for (const f of list.slice(0, 5)) console.log(`  ${f.page}  ${f.detail}`);
      if (list.length > 5) console.log(`  … ${list.length - 5} more`);
    }
  }
}

process.exit(findings.length ? 1 : 0);
