#!/usr/bin/env node

/**
 * Prepare and validate AdSense score loops without changing article content.
 * Human judgment remains responsible for A-G scores, primary-source checks,
 * double-check findings, and the final report prose.
 */

import { existsSync, readFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(new URL("..", import.meta.url).pathname);
const contentRoot = join(root, "src", "content", "blog");

function usage() {
  console.log(`Usage:
  node scripts/adsense-score-loop.mjs plan [options]
  node scripts/adsense-score-loop.mjs files --series "Series Name" --loop 1 [options]
  node scripts/adsense-score-loop.mjs gate --series "Series Name" --loop 1 [options]
  node scripts/adsense-score-loop.mjs check-report --report path

Options:
  --series NAME          Limit to one series
  --loop N               Select a 1-based loop within a series
  --batch-size N         Articles per loop (default: 10)
  --exclude-series NAME  Repeatable; omit an additional series (Modern Recipes is implicit)
  --json                 Emit machine-readable output for plan/files
`);
}

function args(argv) {
  const out = { command: null, exclude: ["Modern Embedded Recipes"] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") out.json = true;
    else if (arg === "--batch-size") out.batchSize = Number(argv[++i]);
    else if (arg === "--loop") out.loop = Number(argv[++i]);
    else if (arg === "--series") out.series = argv[++i];
    else if (arg === "--exclude-series") out.exclude.push(argv[++i]);
    else if (arg === "--report") out.report = argv[++i];
    else if (arg === "--help" || arg === "-h") out.help = true;
    else if (!out.command) out.command = arg;
    else if (out.command === "check-report" && !out.report) out.report = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  out.command ??= "plan";
  out.batchSize ??= 10;
  if (!Number.isInteger(out.batchSize) || out.batchSize < 1) {
    throw new Error("--batch-size must be a positive integer");
  }
  return out;
}

function frontmatter(text) {
  if (!text.startsWith("---\n")) return {};
  const end = text.indexOf("\n---", 4);
  if (end < 0) return {};
  const result = {};
  for (const raw of text.slice(4, end).split("\n")) {
    const match = raw.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[match[1]] = value;
  }
  return result;
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else if (entry.endsWith(".md")) files.push(path);
  }
  return files;
}

function publishedArticles() {
  return walk(contentRoot).flatMap((path) => {
    const fm = frontmatter(readFileSync(path, "utf8"));
    if (!fm.series || fm.draft === "true") return [];
    const order = Number(fm.seriesOrder);
    return [{
      path: relative(root, path),
      series: fm.series,
      order: Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER,
      title: fm.title || "(untitled)",
    }];
  });
}

function makePlan(options) {
  const excluded = new Set(options.exclude);
  const selected = publishedArticles().filter((article) => {
    return !excluded.has(article.series) &&
      (!options.series || options.series === "All published series" || article.series === options.series);
  });
  const groups = new Map();
  // Default is the operator's 10-article global loop (406 -> 41 loops).
  // Passing --series scopes the plan to one series, which keeps its order.
  const groupName = options.series || "All published series";
  groups.set(groupName, selected);
  for (const articles of groups.values()) {
    articles.sort((a, b) => a.series.localeCompare(b.series) || a.order - b.order || a.path.localeCompare(b.path));
  }
  const loops = [];
  for (const [series, articles] of groups.entries()) {
    for (let i = 0; i < articles.length; i += options.batchSize) {
      loops.push({
        series,
        loop: Math.floor(i / options.batchSize) + 1,
        articles: articles.slice(i, i + options.batchSize),
      });
    }
  }
  return loops;
}

function selectedLoop(options) {
  if (!options.series || !Number.isInteger(options.loop) || options.loop < 1) {
    throw new Error("files/gate require --series NAME and --loop N");
  }
  const loop = makePlan(options).find((item) => item.series === options.series && item.loop === options.loop);
  if (!loop) throw new Error(`Loop not found: ${options.series} #${options.loop}`);
  return loop;
}

function printPlan(plan, json) {
  if (json) return console.log(JSON.stringify(plan, null, 2));
  const total = plan.reduce((sum, item) => sum + item.articles.length, 0);
  console.log(`published articles: ${total}`);
  console.log(`score loops: ${plan.length}`);
  for (const item of plan) {
    console.log(`\n${item.series} / loop-${String(item.loop).padStart(2, "0")} (${item.articles.length})`);
    for (const article of item.articles) console.log(`  ${article.path}`);
  }
}

function printFiles(loop, json) {
  if (json) return console.log(JSON.stringify(loop, null, 2));
  for (const article of loop.articles) console.log(article.path);
}

function runGate(loop) {
  let failed = 0;
  for (const article of loop.articles) {
    const gate = spawnSync("bash", [join(root, "scripts", "audit-publish-gate.sh"), article.path], { encoding: "utf8" });
    const math = spawnSync("node", [join(root, "scripts", "check-inline-math.mjs"), article.path], { encoding: "utf8" });
    const gateRc = gate.status ?? 1;
    const mathRc = math.status ?? 1;
    console.log(`${article.path}\tgate=${gateRc}\tinline-math=${mathRc}`);
    if (gateRc !== 0 || mathRc !== 0) failed += 1;
  }
  if (failed) process.exitCode = 1;
}

function checkReport(path) {
  if (!existsSync(path)) throw new Error(`Report not found: ${path}`);
  const text = readFileSync(path, "utf8");
  const rows = [...text.matchAll(/^\| `([^`]+)` \|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*\*\*(\d+)\*\*\s*\|/gm)];
  if (!rows.length) throw new Error("No A-G score table rows found");
  const errors = [];
  for (const row of rows) {
    const values = row.slice(2, 9).map(Number);
    const total = Number(row[9]);
    const sum = values.reduce((a, b) => a + b, 0);
    if (sum !== total) errors.push(`${row[1]}: A-G sum ${sum} != ${total}`);
  }
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(`report rows=${rows.length}; score sums=OK`);
}

try {
  const options = args(process.argv.slice(2));
  if (options.help) {
    usage();
    process.exit(0);
  }
  if (options.command === "plan") printPlan(makePlan(options), options.json);
  else if (options.command === "files") printFiles(selectedLoop(options), options.json);
  else if (options.command === "gate") runGate(selectedLoop(options));
  else if (options.command === "check-report") checkReport(resolve(options.report));
  else throw new Error(`Unknown command: ${options.command}`);
} catch (error) {
  console.error(`adsense-score-loop: ${error.message}`);
  process.exitCode = 1;
}
