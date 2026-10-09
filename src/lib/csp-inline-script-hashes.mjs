// @ts-check
/**
 * Pin every inline <script> to the page's own Content-Security-Policy.
 *
 * BaseLayout ships the CSP as a <meta http-equiv> with script-src
 * 'self' 'unsafe-inline'. 'unsafe-inline' lets any injected inline script run,
 * which matters now that giscus keeps a login session in localStorage on this
 * origin. Astro only knows the final inline scripts (theme bootstrap, bundled
 * module scripts it chose to inline) after the build, so this runs at
 * astro:build:done and rewrites each page: the SHA-256 of every executable
 * inline script on that page goes into its script-src.
 *
 * 'unsafe-inline' stays in the list on purpose: CSP Level 2+ browsers ignore it
 * once a hash is present, and only pre-CSP2 browsers fall back to it.
 *
 * Pages are read with htmlparser2's streaming parser, not regexes, so tag case,
 * `</script >`, attribute order and attribute entities are handled like a
 * browser would; script bodies are raw text, and CRLF is folded to LF as the
 * browser's input stream does before hashing. Streaming (no DOM) keeps this to
 * ~2 s over the whole site instead of ~10 s. Only the CSP <meta> is rewritten,
 * in place, by its source offsets; the rest of each file stays byte-for-byte as
 * Astro wrote it. scripts/audit-csp-inline-scripts.mjs re-checks the result
 * with a different parser (parse5).
 *
 * Data blocks (application/json, application/ld+json) are not executed, so they
 * are not hashed.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Parser } from 'htmlparser2';

const EXECUTABLE_TYPES = new Set(['', 'module', 'text/javascript', 'application/javascript']);
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

/**
 * Rewrite one page.
 * - `{ html }`: the page with its inline-script hashes added to script-src
 * - `{ skipped: 'no-inline' }`: nothing to pin
 * - `{ skipped: 'no-csp' }`: inline scripts but no CSP meta / no script-src —
 *   the page runs them without any policy, which the build reports
 * @param {string} html
 * @returns {{ html: string } | { skipped: 'no-inline' | 'no-csp' }}
 */
export function hashInlineScripts(html) {
  // Cheap pre-check: a page without "<script" in any case cannot need pinning.
  if (!/<script/i.test(html)) return { skipped: 'no-inline' };

  const hashes = new Set();
  /** @type {{ content: string, start: number, end: number } | null} */
  let meta = null;
  /** @type {string | null} null while outside an executable inline script */
  let body = null;

  const parser = new Parser(
    {
      onopentag(name, attribs) {
        if (name === 'script') {
          const type = (attribs.type ?? '').trim().toLowerCase();
          body = attribs.src === undefined && EXECUTABLE_TYPES.has(type) ? '' : null;
        } else if (
          name === 'meta' &&
          meta === null &&
          (attribs['http-equiv'] ?? '').toLowerCase() === 'content-security-policy'
        ) {
          meta = { content: attribs.content ?? '', start: parser.startIndex, end: parser.endIndex + 1 };
        }
      },
      ontext(text) {
        if (body !== null) body += text;
      },
      onclosetag(name) {
        if (name === 'script' && body !== null) {
          hashes.add(sha256Source(body.replace(/\r\n?/g, '\n')));
          body = null;
        }
      },
    },
    { decodeEntities: true },
  );
  parser.end(html);

  if (hashes.size === 0) return { skipped: 'no-inline' };
  if (meta === null) return { skipped: 'no-csp' };
  /** @type {{ content: string, start: number, end: number }} */
  const csp = meta;

  const directives = csp.content.split(';').map((d) => d.trim()).filter(Boolean);
  const i = directives.findIndex((d) => /^script-src\s/i.test(d));
  if (i === -1) return { skipped: 'no-csp' };
  directives[i] = `${directives[i]} ${[...hashes].join(' ')}`;

  const tag = `<meta http-equiv="Content-Security-Policy" content="${escapeAttribute(directives.join('; '))}">`;
  return { html: html.slice(0, csp.start) + tag + html.slice(csp.end) };
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

/** @returns {import('astro').AstroIntegration} */
export default function cspInlineScriptHashes() {
  return {
    name: 'csp-inline-script-hashes',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        let pages = 0;
        /** @type {string[]} */
        const unprotected = [];

        /** @param {string} file */
        const processFile = async (file) => {
          const result = hashInlineScripts(await readFile(file, 'utf8'));
          if ('html' in result) {
            await writeFile(file, result.html);
            pages++;
          } else if (result.skipped === 'no-csp') {
            unprotected.push(relative(root, file));
          }
        };

        /** @type {Set<Promise<void>>} */
        const running = new Set();
        for await (const file of htmlFiles(root)) {
          const task = processFile(file).finally(() => running.delete(task));
          running.add(task);
          if (running.size >= CONCURRENCY) await Promise.race(running);
        }
        await Promise.all(running);

        logger.info(`pinned inline script hashes in ${pages} page(s)`);
        if (unprotected.length) {
          logger.warn(
            `${unprotected.length} page(s) run inline scripts with no CSP: ${unprotected.sort().slice(0, 10).join(', ')}`,
          );
        }
      },
    },
  };
}
