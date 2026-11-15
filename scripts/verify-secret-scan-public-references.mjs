import assert from 'node:assert/strict';
import { isReviewedPublicReference } from './secret-scan-public-references.mjs';

const url='https://news.skhynix.com/en/sk-hynix-begins-volume-production-of-the-world-first-12-layer-hbm3e/';
const pattern=/\bsk-[A-Za-z0-9_-]{32,}\b/g;
for (const text of [`[source](${url})`, `<a href="${url}">source</a>`]) {
  const matches=[...text.matchAll(pattern)];
  assert.equal(matches.length,1);
  assert.equal(isReviewedPublicReference(text,matches[0]),true);
}
for (const text of [
  url.split('/').at(-2),
  url.replace('news.skhynix.com','news.skhynix.com.example.org'),
  url+'?value=demo', url+'extra',
  'https://example.org/'+url.split('/').at(-2),
  'sk-'+ 'x'.repeat(40),
]) {
  for (const match of text.matchAll(pattern)) assert.equal(isReviewedPublicReference(text,match),false,text);
}
const mixed=`[source](${url}) sk-${'x'.repeat(40)}`;
const matches=[...mixed.matchAll(pattern)];
assert.equal(matches.length,2);
assert.equal(isReviewedPublicReference(mixed,matches[0]),true);
assert.equal(isReviewedPublicReference(mixed,matches[1]),false);
console.log('PASS: exact citation URLs accepted; standalone tokens, other hosts, query/suffix mutations and adjacent credential-shaped tokens remain findings.');
