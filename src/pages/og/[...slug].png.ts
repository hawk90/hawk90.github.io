import type { APIContext } from 'astro';
import satori from 'satori';
import { html } from 'satori-html';
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getPublishedPosts, type BlogPost } from '../../lib/posts';
import { SITE_CONFIG } from '../../consts/config';
import { themeForSeries } from '../../lib/og-themes';

const fontPath = path.join(process.cwd(), 'public/fonts/Pretendard-Bold.otf');
const fontData = await fs.readFile(fontPath);

// Text-content escape only — we don't insert user content into attributes,
// so '&' can pass through (satori-html does not decode entities reliably).
function escapeHtml(s: string): string {
  return s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function getStaticPaths() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}

export async function GET({ props }: APIContext) {
  const { post } = props as { post: BlogPost };
  const theme = themeForSeries(post.data.series);

  const safeTitle = escapeHtml(post.data.title);
  const safeSeries = post.data.series ? escapeHtml(post.data.series) : '';
  const safeDescription = post.data.description ? escapeHtml(post.data.description) : '';
  const safeTags = post.data.tags.slice(0, 3).map((tag: string) => escapeHtml(tag));
  const safeSiteTitle = escapeHtml(SITE_CONFIG.title);
  const safeBadge = theme.badge ? escapeHtml(theme.badge) : '';

  // Build the markup as a single raw HTML string (not a tagged template)
  // so all conditional fragments are inserted as actual HTML, not escaped text.
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
    .map(
      (tag) =>
        `<div style="background: ${theme.accentSoft}; color: ${theme.accent}; padding: 8px 16px; border-radius: 9999px; font-size: 18px;">${tag}</div>`,
    )
    .join('');

  const titlePadding = safeBadge ? '160px' : '0';

  const rawMarkup = `
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

  const markup = html(rawMarkup);

  const svg = await satori(markup, {
    width: 1200,
    height: 630,
    fonts: [{ name: 'Pretendard', data: fontData, weight: 700, style: 'normal' }],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  const pngData = resvg.render();
  // Convert Node Buffer to Uint8Array to satisfy the global Response
  // BodyInit type (Node 22 has dual fetch/Buffer types).
  const pngBuffer = new Uint8Array(pngData.asPng());

  return new Response(pngBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
