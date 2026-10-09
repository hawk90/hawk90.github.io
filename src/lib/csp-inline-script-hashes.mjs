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
 * Data blocks (application/json, application/ld+json) are not executed, so they
 * are not hashed.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const CSP_META = /(<meta http-equiv="Content-Security-Policy" content=")([^"]*)(")/;
const INLINE_SCRIPT = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/g;
const EXECUTABLE_TYPES = new Set(['', 'module', 'text/javascript', 'application/javascript']);

/** @param {string} attrs */
function isExecutableInline(attrs) {
  if (/\ssrc=/.test(attrs)) return false;
  const type = /\stype="([^"]*)"/.exec(attrs)?.[1] ?? '';
  return EXECUTABLE_TYPES.has(type.toLowerCase());
}

/** @param {string} body */
function sha256Source(body) {
  return `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;
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
  const hashes = new Set();
  for (const [, attrs = '', body] of html.matchAll(INLINE_SCRIPT)) {
    if (isExecutableInline(attrs)) hashes.add(sha256Source(body));
  }
  if (hashes.size === 0) return { skipped: 'no-inline' };

  const meta = CSP_META.exec(html);
  if (!meta) return { skipped: 'no-csp' };
  const directives = meta[2].split(';').map((d) => d.trim());
  const i = directives.findIndex((d) => d.startsWith('script-src '));
  if (i === -1) return { skipped: 'no-csp' };
  directives[i] = `${directives[i]} ${[...hashes].join(' ')}`;

  return { html: html.replace(CSP_META, `$1${directives.join('; ')}$3`) };
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
        for await (const file of htmlFiles(root)) {
          const result = hashInlineScripts(await readFile(file, 'utf8'));
          if ('html' in result) {
            await writeFile(file, result.html);
            pages++;
          } else if (result.skipped === 'no-csp') {
            unprotected.push(relative(root, file));
          }
        }
        logger.info(`pinned inline script hashes in ${pages} page(s)`);
        if (unprotected.length) {
          logger.warn(
            `${unprotected.length} page(s) run inline scripts with no CSP: ${unprotected.slice(0, 10).join(', ')}`,
          );
        }
      },
    },
  };
}
