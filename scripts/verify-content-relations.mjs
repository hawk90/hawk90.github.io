#!/usr/bin/env node
// Regression tests for editorial content-relation validation.

import { build } from 'vite';

const built = await build({
  configFile: false,
  logLevel: 'error',
  build: { write: false, lib: { entry: 'src/lib/content/relations.ts', formats: ['es'], fileName: 'relations' } },
});
const output = (Array.isArray(built) ? built[0] : built).output;
const chunk = output.find((item) => item.type === 'chunk');
if (!chunk) throw new Error('Could not bundle content-relation verification module.');
const { assertContentRelationIntegrity } = await import(
  `data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`
);

const documents = [{ id: 'a', status: 'published' }, { id: 'b', status: 'published' }, { id: 'draft', status: 'draft' }];
assertContentRelationIntegrity([{ sourceId: 'a', targetId: 'b', kind: 'prerequisite' }], documents);
console.log('PASS accepts valid relation');

for (const [name, relations] of [
  ['self relation', [{ sourceId: 'a', targetId: 'a', kind: 'related' }]],
  ['missing document', [{ sourceId: 'a', targetId: 'missing', kind: 'related' }]],
  ['draft target', [{ sourceId: 'a', targetId: 'draft', kind: 'related' }]],
  ['draft source', [{ sourceId: 'draft', targetId: 'b', kind: 'related' }]],
  ['duplicate relation', [{ sourceId: 'a', targetId: 'b', kind: 'related' }, { sourceId: 'a', targetId: 'b', kind: 'related' }]],
]) {
  try {
    assertContentRelationIntegrity(relations, documents);
    throw new Error(`${name} was accepted.`);
  } catch (error) {
    if (error instanceof Error && error.message === `${name} was accepted.`) throw error;
    console.log(`PASS rejects ${name}`);
  }
}
