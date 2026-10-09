// @ts-check
/**
 * Pin inline <script>s in the site's Content-Security-Policy by hash.
 *
 * BaseLayout ships the CSP as a <meta http-equiv> with script-src
 * 'self' 'unsafe-inline'. 'unsafe-inline' lets any injected inline script run,
 * which matters now that giscus keeps a login session in localStorage on this
 * origin. Astro only knows the final inline scripts (theme bootstrap, bundled
 * module scripts it chose to inline) after the build, so this runs at
 * astro:build:done and adds their SHA-256 hashes to script-src. Browsers that
 * see a hash ignore 'unsafe-inline'; it stays only as a pre-CSP2 fallback.
 *
 * Opt-in per page: only a CSP <meta> carrying `data-csp-pin-inline-scripts`
 * is pinned. With AdSense on, BaseLayout emits the ads-compatible policy
 * without the marker — ad code injects inline script, and a hash would make
 * browsers ignore the 'unsafe-inline' it needs.
 *
 * One hash set for every ClientRouter page, not one per page. A meta CSP stays
 * in force after the router removes the <meta> during a navigation, so the
 * first page's policy keeps applying to every page visited after it. With
 * per-page hashes, going from the home page to a post blocked the post-only
 * inline scripts. With the same hash set everywhere, the <meta> is identical
 * on every page, Astro keeps it across swaps instead of stacking a new one, and
 * that one policy covers every page's scripts. Pages without ClientRouter
 * (e.g. /random) are only ever loaded directly and keep their own hashes.
 *
 * Pages are read with htmlparser2's streaming parser (no DOM): tag case,
 * `</script >`, attribute order and attribute entities are handled as a
 * browser would; script bodies are raw text and CRLF is folded to LF as the
 * browser's input stream does before hashing. htmlparser2 is not a full HTML5
 * tokenizer, though: it ends a script at the first `</script>` even inside
 * `<!-- <script>` escaping, and treats <script> inside <svg>/<math> as raw text
 * (CDATA markers included). Checked in Chromium: in both cases the browser's
 * hash matches parse5's, not htmlparser2's. A page that shows either pattern
 * is therefore re-hashed with parse5 (none do today, so the build stays on the
 * fast path).
 *
 * Only the CSP <meta> is rewritten, in place, by its source offsets, keeping
 * its other attributes; the rest of each file stays byte-for-byte as Astro
 * wrote it. scripts/audit-csp-inline-scripts.mjs re-checks the result with
 * parse5.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Parser } from 'htmlparser2';

/**
 * <script type> values a browser executes: empty/absent, "module", and the
 * JavaScript MIME type essence matches from the HTML standard. Anything else
 * (application/json, application/ld+json, …) is a data block and not hashed.
 */
export const EXECUTABLE_SCRIPT_TYPES = new Set([
  '',
  'module',
  'application/ecmascript',
  'application/javascript',
  'application/x-ecmascript',
  'application/x-javascript',
  'text/ecmascript',
  'text/javascript',
  'text/javascript1.0',
  'text/javascript1.1',
  'text/javascript1.2',
  'text/javascript1.3',
  'text/javascript1.4',
  'text/javascript1.5',
  'text/jscript',
  'text/livescript',
  'text/x-ecmascript',
  'text/x-javascript',
]);

/** Attribute on a CSP <meta> that opts the page into hash pinning. */
export const PIN_MARKER = 'data-csp-pin-inline-scripts';

// Files are independent; a few at a time overlaps file I/O without holding
// the whole site in memory.
const CONCURRENCY = 16;

/** @param {string} body */
function sha256Source(body) {
  return `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;
}

/** @param {string} value */
function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

/** @param {string} type */
function isExecutableType(type) {
  // Parameters (e.g. "; charset=utf-8") do not change the essence.
  return EXECUTABLE_SCRIPT_TYPES.has(type.split(';')[0].trim().toLowerCase());
}

/**
 * @typedef {object} PageScan
 * @property {Set<string>} hashes  CSP sources for the page's executable inline scripts
 * @property {{ attribs: Record<string, string>, start: number, end: number } | null} csp  first CSP <meta>
 * @property {boolean} router  page uses Astro's ClientRouter
 */

/**
 * Read one page: its inline-script hashes, its CSP <meta> and whether it uses
 * the ClientRouter.
 * @param {string} html
 * @returns {Promise<PageScan>}
 */
export async function scanPage(html) {
  /** @type {PageScan} */
  const scan = { hashes: new Set(), csp: null, router: false };
  // Cheap pre-check: skip the parse for a page that has neither a script nor
  // a CSP meta (a ClientRouter page with no inline script still needs the
  // shared hash set, or its <meta> would differ from the others).
  if (!/<script|content-security-policy/i.test(html)) return scan;

  /** @type {string | null} null while outside an executable inline script */
  let body = null;
  let foreignDepth = 0; // inside <svg>/<math>
  let needsExactParse = false;
  const parser = new Parser(
    {
      onopentag(name, attribs) {
        if (name === 'svg' || name === 'math') foreignDepth++;
        if (name === 'script') {
          body = attribs.src === undefined && isExecutableType(attribs.type ?? '') ? '' : null;
          if (body !== null && foreignDepth > 0) needsExactParse = true;
        } else if (name === 'meta') {
          if (attribs.name === 'astro-view-transitions-enabled') scan.router = true;
          if (
            scan.csp === null &&
            (attribs['http-equiv'] ?? '').toLowerCase() === 'content-security-policy'
          ) {
            scan.csp = { attribs: { ...attribs }, start: parser.startIndex, end: parser.endIndex + 1 };
          }
        }
      },
      ontext(text) {
        if (body !== null) body += text;
      },
      onclosetag(name) {
        if ((name === 'svg' || name === 'math') && foreignDepth > 0) foreignDepth--;
        if (name === 'script' && body !== null) {
          // "<!--" inside a script may start HTML5 script-data escaping, which
          // htmlparser2 does not model.
          if (body.includes('<!--')) needsExactParse = true;
          scan.hashes.add(sha256Source(body.replace(/\r\n?/g, '\n')));
          body = null;
        }
      },
    },
    { decodeEntities: true },
  );
  parser.end(html);
  if (needsExactParse) scan.hashes = await exactScriptHashes(html);
  return scan;
}

/**
 * Inline-script hashes from a full HTML5 parse (parse5 via cheerio), for the
 * pages htmlparser2 cannot read the way a browser does. Loaded on demand.
 * @param {string} html
 * @returns {Promise<Set<string>>}
 */
async function exactScriptHashes(html) {
  const { load } = await import('cheerio');
  const $ = load(html);
  return new Set(
    $('script')
      .toArray()
      .filter((el) => el.attribs.src === undefined && isExecutableType(el.attribs.type ?? ''))
      .map((el) => sha256Source(el.children.map((child) => ('data' in child ? child.data : '')).join(''))),
  );
}

/**
 * Put `hashes` into the CSP <meta> described by `csp`. Hashes already in
 * script-src are not repeated, so running twice does not grow the list. The
 * meta's other attributes are kept. Returns null when the policy has no
 * script-src.
 * @param {string} html
 * @param {{ attribs: Record<string, string>, start: number, end: number }} csp
 * @param {Iterable<string>} hashes
 */
export function withScriptHashes(html, csp, hashes) {
  const directives = (csp.attribs.content ?? '').split(';').map((d) => d.trim()).filter(Boolean);
  const i = directives.findIndex((d) => /^script-src\s/i.test(d));
  if (i === -1) return null;
  const sources = directives[i].split(/\s+/);
  for (const hash of hashes) if (!sources.includes(hash)) sources.push(hash);
  directives[i] = sources.join(' ');
  const attributes = Object.entries({ ...csp.attribs, content: directives.join('; ') })
    .map(([name, value]) => `${name}="${escapeAttribute(value)}"`)
    .join(' ');
  return `${html.slice(0, csp.start)}<meta ${attributes}>${html.slice(csp.end)}`;
}

/**
 * @param {string} dir
 * @returns {AsyncGenerator<string>}
 */
async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

/**
 * Run `task` over `items` with at most CONCURRENCY in flight.
 * @template T
 * @param {AsyncIterable<T> | Iterable<T>} items
 * @param {(item: T) => Promise<void>} task
 */
async function forEachLimited(items, task) {
  /** @type {Set<Promise<void>>} */
  const running = new Set();
  for await (const item of items) {
    const p = task(item).finally(() => running.delete(p));
    running.add(p);
    if (running.size >= CONCURRENCY) await Promise.race(running);
  }
  await Promise.all(running);
}

/** @returns {import('astro').AstroIntegration} */
export default function cspInlineScriptHashes() {
  return {
    name: 'csp-inline-script-hashes',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);

        // Pass 1: scan every page. Only offsets and hashes are kept, not HTML.
        /** @type {Map<string, PageScan>} */
        const scans = new Map();
        let optedOut = 0;
        await forEachLimited(htmlFiles(root), async (file) => {
          const scan = await scanPage(await readFile(file, 'utf8'));
          if (scan.csp && !(PIN_MARKER in scan.csp.attribs)) {
            optedOut++;
            return;
          }
          // Router pages get the shared set even with no inline script of
          // their own; other pages only need work if they have scripts.
          if (scan.hashes.size > 0 || (scan.router && scan.csp)) scans.set(file, scan);
        });

        // One sorted set for every ClientRouter page, so their <meta> is identical.
        const routerHashes = [
          ...new Set([...scans.values()].filter((s) => s.router).flatMap((s) => [...s.hashes])),
        ].sort();

        // Pass 2: write. Files are re-read; nothing has touched them since pass 1.
        let pages = 0;
        /** @type {string[]} */
        const unprotected = [];
        await forEachLimited(scans, async ([file, scan]) => {
          const html = scan.csp && withScriptHashes(
            await readFile(file, 'utf8'),
            scan.csp,
            scan.router ? routerHashes : [...scan.hashes].sort(),
          );
          if (!html) {
            unprotected.push(relative(root, file));
            return;
          }
          await writeFile(file, html);
          pages++;
        });

        logger.info(
          `pinned ${routerHashes.length} inline script hash(es) site-wide; ${pages} page(s) updated` +
            (optedOut ? `; ${optedOut} page(s) use an unpinned CSP (no ${PIN_MARKER})` : ''),
        );
        if (unprotected.length) {
          logger.warn(
            `${unprotected.length} page(s) run inline scripts with no CSP script-src: ${unprotected.sort().slice(0, 10).join(', ')}`,
          );
        }
      },
    },
  };
}
