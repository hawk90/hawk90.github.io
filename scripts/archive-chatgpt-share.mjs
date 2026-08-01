#!/usr/bin/env node

/**
 * Archive a public ChatGPT share page as the original HTML plus Markdown/JSON.
 * The original HTML and per-message HTML are deliberately retained: Markdown is
 * a readable derivative, not the source of truth for unsupported rich blocks.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { basename, extname, join } from 'node:path';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const args = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
};
const source = args.find((arg) => !arg.startsWith('--') && arg !== option('--input') && arg !== option('--output'));
const input = option('--input');
const output = option('--output');

if ((!source && !input) || (source && input)) {
  console.error('Usage: node scripts/archive-chatgpt-share.mjs <share-url> [--output directory]');
  console.error('   or: node scripts/archive-chatgpt-share.mjs --input page.html [--output directory]');
  process.exit(1);
}

const sourceUrl = source && new URL(source);
const slug = sourceUrl
  ? sourceUrl.pathname.split('/').filter(Boolean).at(-1)
  : basename(input, extname(input));
const archiveDir = output || join('archives', `chatgpt-${slug}`);
const assetDir = join(archiveDir, 'assets');
await mkdir(assetDir, { recursive: true });

const html = input
  ? await readFile(input, 'utf8')
  : await fetch(sourceUrl, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36',
        accept: 'text/html,application/xhtml+xml',
      },
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Could not download ${sourceUrl}: HTTP ${response.status}`);
      return response.text();
    });

await writeFile(join(archiveDir, 'page.html'), html);
const $ = cheerio.load(html, { decodeEntities: false });
const turndown = new TurndownService({ codeBlockStyle: 'fenced', emDelimiter: '_', bulletListMarker: '-' });
turndown.use(gfm);
turndown.addRule('katex', {
  filter: (node) => node.type === 'tag' && ($(node).hasClass('katex') || $(node).hasClass('katex-display')),
  replacement: (_content, node) => {
    const latex = $(node).find('annotation[encoding="application/x-tex"]').first().text();
    const display = $(node).hasClass('katex-display');
    return latex ? (display ? `\n\n$$\n${latex}\n$$\n\n` : `$${latex}$`) : $(node).toString();
  },
});
turndown.addRule('unknownRichBlock', {
  filter: ['details', 'dialog', 'canvas'],
  replacement: (_content, node) => `\n\n${$(node).toString()}\n\n`,
});

const downloaded = new Map();
let assetNumber = 0;
async function localizeImage(element) {
  const original = $(element).attr('src');
  if (!original || original.startsWith('data:')) return;
  let remote;
  try { remote = new URL(original, sourceUrl || `file://${input}`); } catch { return; }
  if (!/^https?:$/.test(remote.protocol)) return;
  if (!downloaded.has(remote.href)) {
    try {
      const response = await fetch(remote, { headers: { 'user-agent': 'Mozilla/5.0' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const type = response.headers.get('content-type') || '';
      const suffix = /image\/png/.test(type) ? '.png'
        : /image\/jpe?g/.test(type) ? '.jpg'
        : /image\/gif/.test(type) ? '.gif'
        : /image\/webp/.test(type) ? '.webp'
        : /image\/svg\+xml/.test(type) ? '.svg'
        : extname(remote.pathname).slice(0, 8) || '.bin';
      const filename = `asset-${String(++assetNumber).padStart(3, '0')}${suffix}`;
      await writeFile(join(assetDir, filename), Buffer.from(await response.arrayBuffer()));
      downloaded.set(remote.href, `assets/${filename}`);
    } catch (error) {
      console.warn(`Keeping remote image URL (${error.message}): ${remote.href}`);
      downloaded.set(remote.href, remote.href);
    }
  }
  $(element).attr('src', downloaded.get(remote.href));
}

// Public share pages currently put the conversation in a React Router/devalue
// stream rather than server-rendered message elements. This reader intentionally
// extracts only text parts; page.html remains the lossless original for every
// unsupported field in that private transport format.
function messagesFromRouterStream() {
  const stream = $('script').toArray()
    .map((script) => $(script).text())
    .find((text) => text.includes('window.__reactRouterContext.streamController.enqueue('));
  if (!stream) return [];
  const match = stream.match(/enqueue\((.*)\);?$/s);
  if (!match) return [];

  let table;
  try { table = JSON.parse(JSON.parse(match[1])); } catch { return []; }
  const resolving = new Set();
  const resolve = (ref) => {
    if (typeof ref !== 'number') return ref;
    if (ref < 0 || ref >= table.length || resolving.has(ref)) return undefined;
    resolving.add(ref);
    const value = table[ref];
    let result;
    if (Array.isArray(value)) result = value.map(resolve);
    else if (value && typeof value === 'object') {
      result = {};
      for (const [encodedKey, encodedValue] of Object.entries(value)) {
        const key = encodedKey.startsWith('_') ? resolve(Number(encodedKey.slice(1))) : encodedKey;
        if (typeof key === 'string') result[key] = resolve(encodedValue);
      }
    } else result = value;
    resolving.delete(ref);
    return result;
  };

  const entries = [];
  const seenIds = new Set();
  for (const item of table) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const messageKey = Object.keys(item).find((key) => key.startsWith('_') && table[Number(key.slice(1))] === 'message');
    if (!messageKey) continue;
    const idKey = Object.keys(item).find((key) => key.startsWith('_') && table[Number(key.slice(1))] === 'id');
    const id = idKey ? resolve(item[idKey]) : undefined;
    if (id && seenIds.has(id)) continue;
    const message = resolve(item[messageKey]);
    const textParts = message?.content?.parts?.filter((part) => typeof part === 'string');
    if (!['user', 'assistant'].includes(message?.author?.role) || !textParts?.length) continue;
    if (id) seenIds.add(id);
    entries.push({
      id,
      role: message.author.role,
      createdAt: message.create_time ? new Date(message.create_time * 1000).toISOString() : undefined,
      markdown: textParts.join('\n\n').trim(),
      html: null,
    });
  }
  return entries
    .sort((left, right) => (left.createdAt || '').localeCompare(right.createdAt || ''))
    .map(({ id, role, markdown, createdAt }, index) => ({ index: index + 1, id, role, createdAt, markdown, html: null }));
}

// Prefer the source Markdown in the share-page data stream. DOM conversion is
// only a fallback for ordinary browser-saved HTML, where no stream is present.
const messages = messagesFromRouterStream();
if (!messages.length) {
  const roleNodes = $('[data-message-author-role]').toArray();
  const candidates = roleNodes.length
    ? roleNodes
    : $('main article, main .markdown, main [class*="prose"], article').toArray();
  const seen = new Set();
  for (const node of candidates) {
    const element = $(node);
    const content = element.find('.markdown, [class*="markdown"], [class*="prose"]').first();
    const body = content.length ? content : element;
    const key = body.html();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    body.find('button, script, style, noscript, [aria-hidden="true"]').remove();
    for (const image of body.find('img').toArray()) await localizeImage(image);
    const role = element.attr('data-message-author-role') || 'unknown';
    const blockHtml = body.html();
    const markdown = turndown.turndown(blockHtml).trim();
    messages.push({ index: messages.length + 1, role, html: blockHtml, markdown });
  }
}
if (!messages.length) throw new Error('No conversation blocks found. page.html was saved; pass a browser-saved HTML file with rendered messages using --input.');

const title = $('title').text().trim() || $('meta[property="og:title"]').attr('content') || 'ChatGPT conversation';
const capturedAt = new Date().toISOString();
const fingerprint = ({ role, markdown: content }) => createHash('sha256').update(`${role}\0${content}`, 'utf8').digest('hex');
const retained = new Map();
const duplicates = [];
for (const message of messages) {
  const hash = fingerprint(message);
  if (retained.has(hash)) {
    duplicates.push({
      removedOriginalIndex: message.index,
      removedId: message.id,
      keptOriginalIndex: retained.get(hash).index,
      keptId: retained.get(hash).id,
      role: message.role,
      sha256: hash,
    });
  } else retained.set(hash, message);
}
const uniqueMessages = [...retained.values()].map((message, index) => ({ ...message, sourceIndex: message.index, index: index + 1 }));
const deduplicatedIndexByOriginalIndex = new Map(uniqueMessages.map((message) => [message.sourceIndex, message.index]));
for (const duplicate of duplicates) duplicate.keptDeduplicatedIndex = deduplicatedIndexByOriginalIndex.get(duplicate.keptOriginalIndex);
const metadata = { title, source: source || input, capturedAt, messages };
await writeFile(join(archiveDir, 'conversation.json'), `${JSON.stringify(metadata, null, 2)}\n`);
await writeFile(join(archiveDir, 'duplicates.json'), `${JSON.stringify({
  algorithm: 'Exact SHA-256 of role + NUL + original Markdown',
  originalBlocks: messages.length,
  retainedBlocks: uniqueMessages.length,
  duplicates,
}, null, 2)}\n`);

function renderConversation(blocks) {
  return [
  '---',
  `title: ${JSON.stringify(title)}`,
  `source: ${JSON.stringify(source || input)}`,
  `archived_at: ${capturedAt}`,
  '---',
  '',
  `# ${title}`,
  '',
  ...blocks.flatMap(({ index, role, markdown: content }) => [
    `## ${index}. ${role}`,
    '',
    content || '<!-- Empty message; inspect conversation.json for its original HTML. -->',
    '',
  ]),
  ].join('\n');
}
await writeFile(join(archiveDir, 'conversation.full.md'), renderConversation(messages));
await writeFile(join(archiveDir, 'conversation.md'), renderConversation(uniqueMessages));

const topicDir = join(archiveDir, 'topics');
await mkdir(topicDir, { recursive: true });
const topics = [];
const usedTopicNames = new Set();
const topicName = (titleText, index) => {
  const base = titleText.normalize('NFKC').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'untitled';
  let name = `${String(index).padStart(3, '0')}-${base}`;
  while (usedTopicNames.has(name)) name = `${name}-copy`;
  usedTopicNames.add(name);
  return `${name}.md`;
};
for (const message of uniqueMessages) {
  if (message.role !== 'assistant') continue;
  const headings = [...message.markdown.matchAll(/^#\s+(.+?)\s*$/gm)];
  for (let part = 0; part < headings.length; part += 1) {
    const start = headings[part].index;
    const end = headings[part + 1]?.index ?? message.markdown.length;
    const content = message.markdown.slice(start, end).trim();
    const topicTitle = headings[part][1].replace(/\s+#*$/, '');
    const filename = topicName(topicTitle, topics.length + 1);
    await writeFile(join(topicDir, filename), [
      '---',
      `title: ${JSON.stringify(topicTitle)}`,
      `source_message: ${message.index}`,
      `source_role: ${message.role}`,
      '---',
      '',
      content,
      '',
    ].join('\n'));
    topics.push({ index: topics.length + 1, title: topicTitle, file: `topics/${filename}`, sourceMessage: message.index });
  }
}
await writeFile(join(topicDir, 'index.json'), `${JSON.stringify({ generatedAt: capturedAt, topics }, null, 2)}\n`);
const antiPatternPrefixes = new Set(['A', 'C', 'I', 'P', 'S', 'U', 'M', 'SEC', 'O', 'G', 'L', 'K', 'T', 'R', 'D']);
const antiPatterns = [];
const phases = [];
for (const message of uniqueMessages) {
  if (message.role !== 'assistant') continue;
  const headings = [...message.markdown.matchAll(/^(#{1,6})\s+([A-Z]{1,5})-(\d{1,3})[.\s-]+(.+?)\s*$/gm)]
    .map((match) => ({ start: match.index, level: match[1].length, prefix: match[2], number: Number(match[3]), title: match[0].replace(/^#{1,6}\s+/, '').trim() }));
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const next = headings.slice(index + 1).find((candidate) => candidate.level <= heading.level);
    const content = message.markdown.slice(heading.start, next?.start ?? message.markdown.length).trim();
    const record = {
      id: `${heading.prefix}-${String(heading.number).padStart(2, '0')}`,
      title: heading.title,
      sourceMessage: message.index,
      sourceMessageId: message.id,
      level: heading.level,
      markdown: content,
    };
    (antiPatternPrefixes.has(heading.prefix) ? antiPatterns : phases).push(record);
  }
}
const renderCatalog = (catalogTitle, sections) => [
  '---',
  `title: ${JSON.stringify(catalogTitle)}`,
  `source: ${JSON.stringify(source || input)}`,
  `generated_at: ${capturedAt}`,
  '---',
  '',
  `# ${catalogTitle}`,
  '',
  ...sections.flatMap(({ sourceMessage, markdown: content }) => [
    `<!-- source message: ${sourceMessage} -->`,
    '',
    content,
    '',
  ]),
].join('\n');
await writeFile(join(archiveDir, 'antipatterns.md'), renderCatalog('기술 포트폴리오 안티패턴', antiPatterns));
await writeFile(join(archiveDir, 'phases.md'), renderCatalog('실행 페이즈 및 작업 항목', phases));
await writeFile(join(archiveDir, 'classification.json'), `${JSON.stringify({
  generatedAt: capturedAt,
  antiPatternPrefixes: [...antiPatternPrefixes],
  antiPatterns: antiPatterns.map(({ markdown: _markdown, ...record }) => record),
  phases: phases.map(({ markdown: _markdown, ...record }) => record),
}, null, 2)}\n`);
const roleCounts = Object.groupBy(messages, ({ role }) => role);
const verification = {
  extraction: {
    source: messages[0]?.id ? 'ChatGPT React Router stream' : 'rendered HTML fallback',
    totalBlocks: messages.length,
    uniqueMessageIds: new Set(messages.map(({ id }) => id).filter(Boolean)).size,
    emptyMarkdownBlocks: messages.filter(({ markdown: content }) => !content).length,
    roles: Object.fromEntries(Object.entries(roleCounts).map(([role, blocks]) => [role, blocks.length])),
  },
  deduplication: {
    retainedBlocks: uniqueMessages.length,
    removedExactDuplicates: duplicates.length,
    fingerprint: 'SHA-256(role + NUL + original Markdown)',
  },
  topicSplit: {
    topLevelTopics: topics.length,
    missingSourceMessages: topics.filter(({ sourceMessage }) => !uniqueMessages.some(({ index }) => index === sourceMessage)).length,
  },
  classification: {
    antiPatterns: antiPatterns.length,
    phases: phases.length,
    unclassifiedNumberedHeadings: 0,
  },
};
await writeFile(join(archiveDir, 'verification.json'), `${JSON.stringify(verification, null, 2)}\n`);
console.log(`Archived ${messages.length} block(s), retained ${uniqueMessages.length}, and split ${topics.length} topic(s) in ${archiveDir}`);
