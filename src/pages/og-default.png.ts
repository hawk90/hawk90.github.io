import type { APIContext } from 'astro';
import satori from 'satori';
import { html } from 'satori-html';
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs/promises';
import path from 'node:path';

// Load font once from local file to avoid network dependency
const fontPath = path.join(process.cwd(), 'public/fonts/Pretendard-Bold.otf');
const fontData = await fs.readFile(fontPath);

export async function GET(_context: APIContext) {

  const markup = html`
    <div style="display: flex; flex-direction: column; width: 100%; height: 100%; background: linear-gradient(135deg, #0f0d17 0%, #1a1625 100%); padding: 60px; justify-content: center; align-items: center;">
      <div style="color: #a78bfa; font-size: 80px; font-weight: bold; margin-bottom: 24px;">Hawk's Blog</div>
      <div style="color: #b8b5c5; font-size: 32px; text-align: center;">C++ · System Programming · Embedded Development</div>
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
