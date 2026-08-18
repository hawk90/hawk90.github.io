import { visit } from 'unist-util-visit';
import { readFileSync, existsSync, openSync, readSync, closeSync } from 'node:fs';
import { join } from 'node:path';

/**
 * rehype plugin — make every <img> cheap to load and free of layout shift:
 *   - `loading="lazy"` and `decoding="async"`
 *   - `width`/`height` read from the file itself
 *
 * Without intrinsic dimensions the browser reserves no space, so every
 * diagram shoves the paragraph below it down the moment it decodes. Tailwind's
 * preflight already sets `img { max-width: 100%; height: auto }`, so the pair
 * acts purely as an aspect ratio — the image still scales to the column.
 *
 * Above-the-fold images opt out of lazy loading by setting `loading="eager"`.
 */

const PUBLIC_DIR = new URL('../../public/', import.meta.url).pathname;
const dimensionCache = new Map();

/** SVG carries its size in the markup: explicit width/height, else the viewBox. */
function svgDimensions(text) {
  const head = text.slice(0, 4000);
  const num = (attr) => {
    const m = head.match(new RegExp(`\\b${attr}\\s*=\\s*"([\\d.]+)(px|pt)?"`));
    return m ? parseFloat(m[1]) * (m[2] === 'pt' ? 4 / 3 : 1) : null;
  };
  const w = num('width');
  const h = num('height');
  if (w && h) return { width: Math.round(w), height: Math.round(h) };
  const vb = head.match(/viewBox\s*=\s*"\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  if (vb) return { width: Math.round(parseFloat(vb[1])), height: Math.round(parseFloat(vb[2])) };
  return null;
}

/** PNG keeps width and height in the IHDR chunk, at a fixed offset. */
function pngDimensions(fd) {
  const buf = Buffer.alloc(24);
  readSync(fd, buf, 0, 24, 0);
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** JPEG hides them in whichever SOF marker the encoder chose, so walk the segments. */
function jpegDimensions(fd, size) {
  const buf = Buffer.alloc(Math.min(size, 256 * 1024));
  readSync(fd, buf, 0, buf.length, 0);
  if (buf.readUInt16BE(0) !== 0xffd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    const length = buf.readUInt16BE(i + 2);
    // SOF0..SOF15, skipping the four markers in that range that are not frames.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + length;
  }
  return null;
}

function lookup(src) {
  if (dimensionCache.has(src)) return dimensionCache.get(src);
  let result = null;
  try {
    // Only site-absolute paths resolve to a file we can read at build time.
    if (src.startsWith('/') && !src.startsWith('//')) {
      const path = join(PUBLIC_DIR, decodeURIComponent(src.split(/[?#]/)[0]));
      if (existsSync(path)) {
        if (/\.svg$/i.test(path)) {
          result = svgDimensions(readFileSync(path, 'utf8'));
        } else {
          const fd = openSync(path, 'r');
          try {
            result = /\.png$/i.test(path)
              ? pngDimensions(fd)
              : /\.jpe?g$/i.test(path)
                ? jpegDimensions(fd, readFileSync(path).length)
                : null;
          } finally {
            closeSync(fd);
          }
        }
      }
    }
  } catch {
    result = null;
  }
  if (result && (!result.width || !result.height)) result = null;
  dimensionCache.set(src, result);
  return result;
}

export default function rehypeImageLazy() {
  const rewriteHtmlString = (value) => {
    if (!value || !value.includes('<img')) return value;
    return value.replace(/<img\b([^>]*?)(\/?)>/gi, (_match, attrs, selfClose) => {
      let injected = attrs;
      if (!/\bloading\s*=/.test(attrs)) injected += ' loading="lazy"';
      if (!/\bdecoding\s*=/.test(attrs)) injected += ' decoding="async"';
      if (!/\bwidth\s*=/.test(attrs) && !/\bheight\s*=/.test(attrs)) {
        const src = attrs.match(/\bsrc\s*=\s*"([^"]*)"/);
        const dim = src && lookup(src[1]);
        if (dim) injected += ` width="${dim.width}" height="${dim.height}"`;
      }
      return `<img${injected}${selfClose}>`;
    });
  };

  return (tree) => {
    visit(tree, (node) => {
      if (node.type === 'element' && node.tagName === 'img') {
        node.properties = node.properties || {};
        if (node.properties.loading == null) node.properties.loading = 'lazy';
        if (node.properties.decoding == null) node.properties.decoding = 'async';
        if (node.properties.width == null && node.properties.height == null) {
          const dim = typeof node.properties.src === 'string' ? lookup(node.properties.src) : null;
          if (dim) {
            node.properties.width = dim.width;
            node.properties.height = dim.height;
          }
        }
        return;
      }
      if ((node.type === 'raw' || node.type === 'html') && typeof node.value === 'string') {
        node.value = rewriteHtmlString(node.value);
      }
    });
  };
}
