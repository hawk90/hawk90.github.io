#!/usr/bin/env node
// Pre-build OG image generator.
//
// Why this exists: rendering 2,900+ social-card PNGs inside `astro build`
// (one satori + resvg pass per post) dominated CI build time. This script
// moves the work outside the build, keeps an on-disk manifest keyed by
// frontmatter hash, and only re-renders posts whose OG-relevant fields
// changed. CI caches `public/og/` + `.cache/og-manifest.json` between
// runs so steady-state cost is near zero.
//
// Flags:
//   --force     ignore manifest, regenerate everything
//   --prune     delete PNGs whose source post no longer exists

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import satori from 'satori';
import { html } from 'satori-html';
import { Resvg } from '@resvg/resvg-js';
import { DEFAULT_THEME, themeForSeriesName } from '../src/lib/og-themes.data.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const CONTENT_DIR = path.join(ROOT, 'src/content/blog');
const OUT_DIR = path.join(ROOT, 'public/og');
const DEFAULT_OUT = path.join(ROOT, 'public/og-default.png');
const FONT_PATH = path.join(ROOT, 'public/fonts/Pretendard-Bold.otf');
const CACHE_DIR = path.join(ROOT, '.cache');
const MANIFEST_PATH = path.join(CACHE_DIR, 'og-manifest.json');
const THEMES_FILE = path.join(ROOT, 'src/lib/og-themes.data.mjs');

const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force');
const PRUNE = args.has('--prune');

// ─── Minimal HTML escape (kept in sync with src/lib/utils.ts) ───
const HTML_ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (m) => HTML_ESCAPE[m]);

// ─── Site config (mirrored from src/consts/config.ts) ──────────
const SITE_TITLE = "Hawk's Blog";
const TAGLINE = 'Developer Blog';

// ─── helpers ───────────────────────────────────────────────────
async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (entry.isFile() && /\.(md|mdx)$/.test(entry.name)) yield p;
  }
}

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  try {
    return yaml.load(m[1]) ?? {};
  } catch (err) {
    console.warn(`  ! frontmatter parse error: ${err.message}`);
    return null;
  }
}

function postIdFromPath(filePath) {
  const rel = path.relative(CONTENT_DIR, filePath);
  return rel.replace(/\\/g, '/').replace(/\.(md|mdx)$/, '');
}

function hashFor(data, themesVersion) {
  const payload = JSON.stringify({
    title: data.title ?? '',
    series: data.series ?? '',
    description: data.description ?? '',
    tags: Array.isArray(data.tags) ? data.tags.slice(0, 3) : [],
    themesVersion,
  });
  return crypto.createHash('sha1').update(payload).digest('hex').slice(0, 16);
}

function postMarkup(data) {
  const theme = themeForSeriesName(data.series);
  const safeTitle = escapeHtml(data.title ?? '(untitled)');
  const safeSeries = data.series ? escapeHtml(data.series) : '';
  const safeDescription = data.description ? escapeHtml(data.description) : '';
  const safeTags = (Array.isArray(data.tags) ? data.tags.slice(0, 3) : []).map(escapeHtml);
  const safeBadge = theme.badge ? escapeHtml(theme.badge) : '';
  const safeSiteTitle = escapeHtml(SITE_TITLE);

  const badgeBlock = safeBadge
    ? `<div style="position: absolute; top: 60px; right: 60px; display: flex; align-items: center; justify-content: center; width: 110px; height: 110px; border-radius: 24px; background: ${theme.accentSoft}; border: 2px solid ${theme.accent}; color: ${theme.accent}; font-size: 28px; font-weight: bold; letter-spacing: 1px;">${safeBadge}</div>`
    : '';
  const seriesBlock = safeSeries
    ? `<div style="color: ${theme.accent}; font-size: 26px; margin-bottom: 18px; letter-spacing: 0.5px;">${safeSeries}</div>`
    : '';
  const descriptionBlock = safeDescription
    ? `<div style="color: ${theme.subtext}; font-size: 24px; line-height: 1.5;">${safeDescription}</div>`
    : '';
  const tagPills = safeTags
    .map((tag) =>
      `<div style="background: ${theme.accentSoft}; color: ${theme.accent}; padding: 8px 16px; border-radius: 9999px; font-size: 18px;">${tag}</div>`,
    )
    .join('');
  const titlePadding = safeBadge ? '160px' : '0';

  return `
    <div style="display: flex; flex-direction: column; width: 100%; height: 100%; background: linear-gradient(135deg, ${theme.bgFrom} 0%, ${theme.bgTo} 100%); padding: 60px; position: relative;">
      ${badgeBlock}
      <div style="display: flex; flex-direction: column; flex: 1; justify-content: center; padding-right: ${titlePadding};">
        ${seriesBlock}
        <div style="color: ${theme.text}; font-size: 50px; font-weight: bold; line-height: 1.25; margin-bottom: 24px;">${safeTitle}</div>
        ${descriptionBlock}
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="color: ${theme.accent}; font-size: 28px; font-weight: bold;">${safeSiteTitle}</div>
        </div>
        <div style="display: flex; gap: 8px;">${tagPills}</div>
      </div>
    </div>
  `;
}

function defaultMarkup() {
  return `
    <div style="display: flex; flex-direction: column; width: 100%; height: 100%; background: linear-gradient(135deg, ${DEFAULT_THEME.bgFrom} 0%, ${DEFAULT_THEME.bgTo} 100%); padding: 60px; justify-content: center; align-items: center;">
      <div style="color: ${DEFAULT_THEME.accent}; font-size: 80px; font-weight: bold; margin-bottom: 24px;">${escapeHtml(SITE_TITLE)}</div>
      <div style="color: ${DEFAULT_THEME.subtext}; font-size: 32px; text-align: center;">${escapeHtml(TAGLINE)}</div>
    </div>
  `;
}

async function renderPng(markup, fontData) {
  const svg = await satori(html(markup), {
    width: 1200,
    height: 630,
    fonts: [{ name: 'Pretendard', data: fontData, weight: 700, style: 'normal' }],
  });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  return resvg.render().asPng();
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function loadManifest() {
  try {
    const text = await fs.readFile(MANIFEST_PATH, 'utf8');
    return JSON.parse(text);
  } catch {
    return { themesVersion: '', posts: {} };
  }
}

// ─── main ──────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now();
  const fontData = await fs.readFile(FONT_PATH);
  const themesContent = await fs.readFile(THEMES_FILE, 'utf8');
  const themesVersion = crypto.createHash('sha1').update(themesContent).digest('hex').slice(0, 12);

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(CACHE_DIR, { recursive: true });

  const prev = FORCE ? { themesVersion: '', posts: {} } : await loadManifest();
  const themesChanged = prev.themesVersion !== themesVersion;
  if (themesChanged && !FORCE) {
    console.log(`Themes file changed (${prev.themesVersion || '∅'} → ${themesVersion}); rendering all posts.`);
  }

  const next = { themesVersion, posts: {} };
  const seenIds = new Set();
  let rendered = 0;
  let skipped = 0;

  for await (const file of walk(CONTENT_DIR)) {
    const raw = await fs.readFile(file, 'utf8');
    const data = parseFrontmatter(raw);
    if (!data) continue;
    if (data.draft) continue;
    if (data.seo && data.seo.ogImage) continue;

    const id = postIdFromPath(file);
    seenIds.add(id);
    const hash = hashFor(data, themesVersion);
    const outPath = path.join(OUT_DIR, `${id}.png`);

    const cached = prev.posts?.[id];
    const cacheHit = !FORCE && !themesChanged && cached?.hash === hash;
    if (cacheHit && await fileExists(outPath)) {
      next.posts[id] = cached;
      skipped++;
      continue;
    }

    await fs.mkdir(path.dirname(outPath), { recursive: true });
    const png = await renderPng(postMarkup(data), fontData);
    await fs.writeFile(outPath, png);
    next.posts[id] = { hash };
    rendered++;
    if (rendered % 100 === 0) console.log(`  rendered ${rendered}…`);
  }

  // Default OG: regenerate if missing or themes changed.
  if (FORCE || themesChanged || !(await fileExists(DEFAULT_OUT))) {
    const png = await renderPng(defaultMarkup(), fontData);
    await fs.writeFile(DEFAULT_OUT, png);
    console.log('  rendered og-default.png');
  }

  // Prune orphans (posts deleted/renamed/draft-flipped).
  let pruned = 0;
  if (PRUNE) {
    async function* walkOut(dir) {
      try {
        for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
          const p = path.join(dir, entry.name);
          if (entry.isDirectory()) yield* walkOut(p);
          else if (entry.isFile() && entry.name.endsWith('.png')) yield p;
        }
      } catch { /* dir missing */ }
    }
    for await (const p of walkOut(OUT_DIR)) {
      const id = path.relative(OUT_DIR, p).replace(/\\/g, '/').replace(/\.png$/, '');
      if (!seenIds.has(id)) {
        await fs.unlink(p);
        pruned++;
      }
    }
  }

  await fs.writeFile(MANIFEST_PATH, JSON.stringify(next, null, 2));

  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`OG: ${rendered} rendered, ${skipped} cached${pruned ? `, ${pruned} pruned` : ''} (${dt}s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
