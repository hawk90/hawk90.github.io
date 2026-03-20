import type { APIContext } from 'astro';
import satori from 'satori';
import { html } from 'satori-html';
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getPublishedPosts, type BlogPost } from '../../lib/posts';
import { SITE_CONFIG } from '../../consts/config';

// 빌드 시 폰트를 한 번만 로드
const fontPath = path.join(process.cwd(), 'public/fonts/Pretendard-Bold.otf');
const fontData = await fs.readFile(fontPath);

export async function getStaticPaths() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

export async function GET({ props }: APIContext) {
  const { post } = props as { post: BlogPost };

  const markup = html`
    <div style="display: flex; flex-direction: column; width: 100%; height: 100%; background: linear-gradient(135deg, #0f0d17 0%, #1a1625 100%); padding: 60px;">
      <div style="display: flex; flex-direction: column; flex: 1; justify-content: center;">
        ${post.data.series ? `<div style="color: #a78bfa; font-size: 24px; margin-bottom: 16px;">${post.data.series}</div>` : ''}
        <div style="color: #f0f0f2; font-size: 48px; font-weight: bold; line-height: 1.3; margin-bottom: 24px;">${post.data.title}</div>
        ${post.data.description ? `<div style="color: #b8b5c5; font-size: 24px; line-height: 1.5;">${post.data.description}</div>` : ''}
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="color: #a78bfa; font-size: 28px; font-weight: bold;">${SITE_CONFIG.title}</div>
        </div>
        <div style="display: flex; gap: 8px;">
          ${post.data.tags.slice(0, 3).map((tag: string) => `<div style="background: rgba(167, 139, 250, 0.2); color: #a78bfa; padding: 8px 16px; border-radius: 9999px; font-size: 18px;">${tag}</div>`).join('')}
        </div>
      </div>
    </div>
  `;

  const svg = await satori(markup, {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'Pretendard',
        data: fontData,
        weight: 700,
        style: 'normal',
      },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return new Response(pngBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
