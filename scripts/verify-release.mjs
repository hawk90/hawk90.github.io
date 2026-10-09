#!/usr/bin/env node
// One canonical publish-readiness contract for local release checks and CI.

import { spawnSync } from 'node:child_process';

const checks = [
  ['tooling contracts', ['npm', 'run', 'gate:tooling']],
  ['script exec bits', ['npm', 'run', 'check:script-modes']],
  ['diagram source freshness', ['npm', 'run', 'check:diagrams']],
  ['KaTeX CSS matches renderer', ['npm', 'run', 'check:katex-css']],
  ['no accidental inline math', ['npm', 'run', 'check:inline-math']],
  ['CI supply-chain policy', ['npm', 'run', 'gate:ci-security']],
  // A too-broad paths-ignore silently stops site changes from deploying
  // ('**.txt' once covered public/ads.txt and robots.txt).
  ['deploy paths-ignore vs build inputs', ['npm', 'run', 'gate:deploy-paths']],
  ['repository object health', ['npm', 'run', 'gate:repository']],
  ['high-severity production dependency audit', ['npm', 'run', 'gate:dependencies']],
  ['search aliases', ['npm', 'run', 'test:search']],
  ['topic registry', ['npm', 'run', 'test:topics']],
  ['content classification', ['npm', 'run', 'gate:classification']],
  ['editorial relations', ['npm', 'run', 'test:relations']],
  ['shared product experience', ['npm', 'run', 'audit:product-experience']],
  ['internal links', ['npm', 'run', 'audit:links', '--', '--by-type']],
  // Runs before the build, because the build is where a collision stops being
  // visible: the loader drops one of the two posts with a warning and succeeds.
  ['route collisions', ['npm', 'run', 'audit:routes']],
  ['post URL single definition', ['npm', 'run', 'audit:content-portability']],
  ['series structure', ['npm', 'run', 'audit:series-structure']],
  // Chapter integrity, which series-structure above does not cover: duplicate
  // or gapped seriesOrder, drafts mixed into a published series. Not strict —
  // it blocks on blocking findings only, because a deliberate gap in a
  // reading order is a warning and an editorial decision, not a defect.
  ['series chapter integrity', ['npm', 'run', 'audit:series']],
  // draft:true is what keeps a "(작성 예정)" page off the site; nothing else
  // does. Blocks only when a stub or a series plan is published — unwritten
  // drafts are the backlog, not a defect.
  ['no published stubs', ['npm', 'run', 'gate:completeness']],
  // Strings a fact-check round proved wrong (data/known-falsehoods.yaml). The
  // pre-commit gate only sees staged files; this catches the same error left
  // in another series.
  ['no known falsehoods', ['npm', 'run', 'audit:falsehoods']],
  ['article connectivity', ['npm', 'run', 'audit:connectivity']],
  // Report-only: where a series belongs in a reading order is editorial, so
  // this prints the coverage gap rather than blocking a deploy on it.
  ['learning path coverage', ['npm', 'run', 'audit:paths']],
  ['diagram references', ['npm', 'run', 'audit:diagram-accessibility']],
  ['diagram asset contract', ['npm', 'run', 'audit:diagrams']],
  ['Astro type and template diagnostics', ['npm', 'run', 'check']],
  ['production build', ['npm', 'run', 'build']],
  // Reads dist/, so it can only run once the build has produced it. Table
  // clipping, heading skips, and alt coverage are properties of the rendered
  // HTML — the markdown source shows none of them.
  // First of the dist/ checks on purpose: it reads the bytes, while every gate
  // below it reads a DOM the parser has already repaired. A stray `/* ... */`
  // left in an .astro template body serialises between the doctype and <html>,
  // which relocates the whole <head> into the body — and passes `astro check`,
  // the build, and all of the checks below.
  ['document prologue', ['npm', 'run', 'audit:prologue']],
  ['rendered reading experience', ['npm', 'run', 'audit:reading']],
  // Reads dist/, so it must follow the build: a link is only broken once you
  // know which pages were actually generated.
  ['rendered link resolution', ['npm', 'run', 'audit:rendered-links']],
  // The link audit resolves pages, not #fragments. A fact-check that rewrote
  // a heading in CXL Ch 13 left Ch 4 linking to the old anchor.
  ['rendered anchor resolution', ['npm', 'run', 'audit:anchors']],
  // No page links these addresses, so the link audits cannot see them; the
  // only thing that knows they should resolve is the shape of the post URLs.
  // Gated because the fix was removed once and nothing noticed.
  ['URL prefix resolution', ['npm', 'run', 'audit:url-prefixes']],
  ['sitemap vs. robots', ['npm', 'run', 'audit:sitemap']],
  // Reads dist/ against data/published-urls.json. `slug:` being required stops
  // a URL from being lost by deleting the field; this is what stops it being
  // lost by changing the value, unpublishing, or a route that quietly stops
  // generating the page.
  ['published URL continuity', ['npm', 'run', 'audit:published-urls']],
  // Reads dist/: the hashes are added after rendering, so only the built HTML
  // shows whether every inline script is pinned in its page's CSP.
  ['CSP inline script hashes', ['npm', 'run', 'audit:csp']],
  // Reads dist/: where ad code ships, with which CSP, and whether the layout
  // reserves ad slots (AP-R-29) or keeps the ClientRouter on with ads.
  ['AdSense placement and policy', ['npm', 'run', 'audit:ads']],
  ['static admin boundary', ['npm', 'run', 'gate:security-admin', '--', '--artifact', 'dist']],
  ['production secret scan', ['npm', 'run', 'gate:secrets']],
];

for (const [name, [command, ...args]] of checks) {
  console.log(`\n=== Release gate: ${name} ===`);
  const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' } });
  if (result.status !== 0) {
    console.error(`\nRelease gate failed: ${name}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\nRelease gate passed: publish-ready artifact verified.');
