#!/usr/bin/env node
// Regression tests for mandatory explicit topic metadata.

import { build } from 'vite';

const built = await build({
  configFile: false,
  logLevel: 'error',
  build: { write: false, lib: { entry: 'src/lib/content/normalize.ts', formats: ['es'], fileName: 'classification' } },
});
const output = (Array.isArray(built) ? built[0] : built).output;
const chunk = output.find((item) => item.type === 'chunk');
if (!chunk) throw new Error('Could not bundle content classification verification module.');
const { classifyTopicIds } = await import(`data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`);

const cases = [
  ['explicit', classifyTopicIds('misc/example', ['embedded/hardware']), 'explicit', 'embedded/hardware'],
];
for (const [name, result, source, topics] of cases) {
  if (result.classificationSource !== source || result.topicIds.join(',') !== topics) {
    throw new Error(`${name}: unexpected result ${JSON.stringify(result)}`);
  }
  console.log(`PASS ${name} classification`);
}

try {
  classifyTopicIds('misc/example', ['not-a-topic']);
  throw new Error('Unknown topic ID was accepted.');
} catch (error) {
  if (error instanceof Error && error.message === 'Unknown topic ID was accepted.') throw error;
  console.log('PASS rejects unknown explicit topic ID');
}

try {
  classifyTopicIds('misc/example', []);
  throw new Error('Missing explicit topic IDs were accepted.');
} catch (error) {
  if (error instanceof Error && error.message === 'Missing explicit topic IDs were accepted.') throw error;
  console.log('PASS rejects missing explicit topic IDs');
}
