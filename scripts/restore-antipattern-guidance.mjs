#!/usr/bin/env node

/**
 * Restore the operational guidance that accompanied the original anti-pattern
 * review.  The archive's HTML and conversation.full.md remain the sources of
 * truth; this command creates a deterministic, reviewable Markdown derivative.
 * It never edits site content or the source archive files.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';

const args = process.argv.slice(2);
const value = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1] ?? fallback;
};
const archive = value('--archive', 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273');
const input = value('--input', join(archive, 'conversation.full.md'));
const htmlInput = value('--html', join(archive, 'page.html'));
const output = value('--output', join(archive, 'original-guidance.md'));

const markdown = await readFile(input, 'utf8');
const html = await readFile(htmlInput, 'utf8');
const hash = (content) => createHash('sha256').update(content, 'utf8').digest('hex');

const lines = markdown.split('\n');
const heading = /^(#{1,6})\s+(.+?)\s*$/;
const headings = [];
for (let index = 0; index < lines.length; index += 1) {
  const match = lines[index].match(heading);
  if (match) headings.push({ index, level: match[1].length, title: match[2] });
}

const messageBlocks = headings
  .filter(({ level, title }) => level === 2 && /^\d+\. (user|assistant)$/i.test(title))
  .map(({ index, title }) => ({ index, title }));
const sourceMessage = (lineIndex) => {
  const block = [...messageBlocks].reverse().find(({ index }) => index <= lineIndex);
  if (!block) return undefined;
  const match = block.title.match(/^(\d+)\. (user|assistant)$/i);
  return match ? { index: Number(match[1]), role: match[2].toLowerCase() } : undefined;
};

const sections = headings.map((current, position) => {
  const next = headings.slice(position + 1).find((candidate) => candidate.level <= current.level);
  const end = next?.index ?? lines.length;
  const body = lines.slice(current.index + 1, end).join('\n').trim();
  const parents = [];
  for (const candidate of headings.slice(0, position)) {
    while (parents.length && parents.at(-1).level >= candidate.level) parents.pop();
    if (candidate.level < current.level) parents.push(candidate);
  }
  return { ...current, end, body, parents, message: sourceMessage(current.index) };
});

// Headings identify most guidance, but body markers catch sections such as
// "권장 판단" where the actionable instruction is introduced in prose.
const titlePattern = /권장|추천|실행|검증|자동화|체크리스트|어떻게|workflow|implementation|remediation|acceptance|fallback|검사/i;
const bodyPattern = /(^|\n)\s*(권장|추천|실행|검증|자동화|체크리스트|검사|확인|다음 단계|해야 한다|해야 해|구체적으로|how to|implementation|verification|acceptance criteria)\b/im;
const excluded = /^(# )?ChatGPT|^\d+\. (user|assistant)$/i;
const selected = sections.filter((section) => {
  if (excluded.test(section.title)) return false;
  return titlePattern.test(section.title) || bodyPattern.test(section.body);
});

const categories = [
  ['원칙·범위', /원칙|범위|정체성|목표|경계|보존|source of truth/i],
  ['실행·로드맵', /실행|로드맵|순서|스프린트|티켓|커밋|migration/i],
  ['검증·품질', /검증|품질|테스트|체크리스트|acceptance|회귀|review/i],
  ['자동화·운영', /자동화|workflow|운영|CI|배포|관측|fallback|revalidation/i],
  ['콘텐츠·정보구조', /콘텐츠|문서|검색|추천|Topic|Hub|링크|metadata|용어/i],
];
const classify = (section) => categories.find(([, pattern]) => pattern.test(`${section.title} ${section.body}`))?.[0] || '기타';
const grouped = new Map(categories.map(([name]) => [name, []]));
grouped.set('기타', []);
for (const section of selected) grouped.get(classify(section)).push(section);

const provenance = [
  '---',
  'title: "원본 HTML 안티패턴 운영 지침 복원본"',
  `source_html: ${JSON.stringify(htmlInput)}`,
  `source_markdown: ${JSON.stringify(input)}`,
  `source_html_sha256: ${hash(html)}`,
  `source_markdown_sha256: ${hash(markdown)}`,
  `generated_at: ${new Date().toISOString()}`,
  `selected_sections: ${selected.length}`,
  'preservation: "원본 HTML과 전체 대화는 변경하지 않음"',
  '---',
  '',
  '# 원본 HTML 안티패턴 운영 지침 복원본',
  '',
  '> 이 문서는 원본 `page.html`과 `conversation.full.md`에서 실행·권장·검증 지침이 포함된 섹션을 추출한 파생본이다. 원문 손실을 막기 위해 각 항목의 본문은 편집하지 않고 그대로 보존한다.',
  '',
  '## 검토 결론',
  '',
  '- 안티패턴 카탈로그는 진단 목록이고, 이 문서는 원문에 있던 조치·검증 지침을 별도로 복원한 운영 레이어다.',
  '- 자동화 가능한 것은 구조·형식·링크·빌드·보안 정책 검사로 한정한다. 사실성·기술적 의미·시각 품질·콘텐츠 문장은 사람 또는 LLM 검토 대상으로 남긴다.',
  '- 원본 HTML은 손실 없는 보관본이다. Markdown은 LLM이 읽기 좋은 파생본이며, 불일치가 발생하면 HTML과 전체 대화를 우선한다.',
  '- 각 항목을 실제 변경에 적용할 때는 `진단 → 근거 → 조치 → 검증 → 잔여 위험` 순서를 기록한다.',
  '',
  '## 복원된 지침 색인',
  '',
  '| 분류 | 섹션 수 |',
  '| --- | ---: |',
  ...[...grouped.entries()].map(([name, items]) => `| ${name} | ${items.length} |`),
  '',
  '## 원문 지침',
  '',
];

let ordinal = 0;
for (const [category, items] of grouped) {
  if (!items.length) continue;
  provenance.push(`### ${category}`, '');
  for (const section of items) {
    ordinal += 1;
    const sourceLine = section.index + 1;
    const path = [...section.parents.map(({ title }) => title), section.title].join(' > ');
    const message = section.message ? `; message: ${section.message.index} (${section.message.role})` : '';
    provenance.push(`#### ${ordinal}. ${section.title}`, '', `<!-- source: ${input}:${sourceLine}${message}; path: ${path.replace(/-->/g, '')} -->`, '', section.body || '<!-- empty source section -->', '');
  }
}

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${provenance.join('\n')}\n`, 'utf8');
console.log(`Restored ${selected.length} guidance section(s) to ${output}`);
console.log(`Source HTML SHA-256: ${hash(html)}`);
console.log(`Source Markdown SHA-256: ${hash(markdown)}`);
