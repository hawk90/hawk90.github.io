#!/usr/bin/env node
// Regression tests for canonical topic hierarchy validation.

import { build } from 'vite';

const built = await build({
  configFile: false,
  logLevel: 'error',
  build: { write: false, lib: { entry: 'src/lib/content/topics.ts', formats: ['es'], fileName: 'topics' } },
});
const output = (Array.isArray(built) ? built[0] : built).output;
const chunk = output.find((item) => item.type === 'chunk');
if (!chunk) throw new Error('Could not bundle topic registry verification module.');
const { TOPIC_REGISTRY, assertTopicRegistryIntegrity } = await import(
  `data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`
);

assertTopicRegistryIntegrity(TOPIC_REGISTRY.topics);
console.log(`PASS current registry -> ${TOPIC_REGISTRY.topics.length} topics`);

for (const [name, definitions] of [
  ['duplicate ID', [{ id: 'a', label: 'A', categoryIds: [] }, { id: 'a', label: 'Again', categoryIds: [] }]],
  ['missing parent', [{ id: 'a', label: 'A', categoryIds: [], parentId: 'missing' }]],
  ['parent cycle', [{ id: 'a', label: 'A', categoryIds: [], parentId: 'b' }, { id: 'b', label: 'B', categoryIds: [], parentId: 'a' }]],
]) {
  try {
    assertTopicRegistryIntegrity(definitions);
    throw new Error(`${name} was accepted.`);
  } catch (error) {
    if (error instanceof Error && error.message === `${name} was accepted.`) throw error;
    console.log(`PASS rejects ${name}`);
  }
}
