#!/usr/bin/env node
// Gate: deploy.yml's paths-ignore must not cover any file that can change the
// deployed site.
//
// A push to main skips the deploy when every changed file matches
// paths-ignore. A pattern that is too broad silently stops real changes from
// shipping: '**.txt' (added for audit output) also matched public/ads.txt and
// public/robots.txt, so an AdSense or crawler change would never have reached
// the site. This expands each pattern the way GitHub does and fails if it
// matches any tracked build input.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import * as yaml from 'js-yaml';

const WORKFLOW = '.github/workflows/deploy.yml';

// What the build reads (see the comment above paths-ignore in deploy.yml).
const BUILD_INPUTS = [
  /^src\//,
  /^public\//,
  /^scripts\//, // prebuild runs scripts/build-og.mjs
  /^astro\.config\.mjs$/,
  /^ec\.config\.mjs$/,
  /^tsconfig\.json$/,
  /^package(-lock)?\.json$/,
  /^\.github\/workflows\/deploy\.yml$/,
];

/**
 * GitHub filter glob → RegExp: `**` matches any characters including `/`,
 * `*` any except `/`, `?` one character except `/`. (`[]`, `!` and `+` are not
 * used in this workflow and are rejected rather than half-supported.)
 * @param {string} pattern
 */
function globToRegExp(pattern) {
  if (/[[\]!+]/.test(pattern)) throw new Error(`unsupported glob syntax in "${pattern}"`);
  let source = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*' && pattern[i + 1] === '*') {
      source += '.*';
      i++;
    } else if (c === '*') source += '[^/]*';
    else if (c === '?') source += '[^/]';
    else source += c.replace(/[.^$(){}|\\]/g, '\\$&');
  }
  return new RegExp(`^${source}$`);
}

const workflow = /** @type {any} */ (yaml.load(readFileSync(WORKFLOW, 'utf8')));
const patterns = workflow?.on?.push?.['paths-ignore'] ?? [];
const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const inputs = files.filter((file) => BUILD_INPUTS.some((re) => re.test(file)));

/** @type {string[]} */
const failures = [];
for (const pattern of patterns) {
  const re = globToRegExp(pattern);
  const hits = inputs.filter((file) => re.test(file));
  if (hits.length) {
    failures.push(`'${pattern}' ignores ${hits.length} build input(s), e.g. ${hits.slice(0, 3).join(', ')}`);
  }
}

console.log(
  `Deploy paths-ignore: ${patterns.length} pattern(s) checked against ${inputs.length} build input(s); ${failures.length} failure(s).`,
);
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
