#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const defaults = [
    'src/content/blog/tools/debugging/embedded/chapter01-rsp-protocol.md',
    'src/content/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight.md',
    'src/content/blog/tools/debugging/embedded/chapter03-openocd.md',
    'src/content/blog/tools/debugging/embedded/chapter04-jlink.md',
    'src/content/blog/tools/debugging/embedded/chapter05-elf-map.md',
    'src/content/blog/tools/debugging/embedded/chapter06-trace.md',
    'src/content/blog/tools/debugging/embedded/chapter07-rtos-troubleshooting.md',
    'src/content/blog/tools/debugging/embedded/chapter08-cxl-link-debug.md',
    'src/content/blog/tools/debugging/embedded/chapter09-cxl-device-troubleshoot.md',
];
const paths = process.argv.slice(2).length ? process.argv.slice(2) : defaults;
const records = [];
let failures = 0;

function extractNamedBlocks(markdown, path) {
    const lines = markdown.split(/\r?\n/);
    const blocks = [];
    for (let i = 0; i < lines.length; i++) {
        const open = lines[i].match(/^```(\w+).*\btitle="([^"]+)"/);
        if (!open) continue;
        const start = i + 1;
        const body = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) body.push(lines[i++]);
        assert(i < lines.length, `${path}:${start}: unclosed named code fence`);
        blocks.push({ language: open[1], title: open[2], start, source: `${body.join('\n')}\n` });
    }
    return blocks;
}

function run(command, args, cwd) {
    const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 15000 });
    return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '', error: result.error?.message };
}

function check(block, articlePath) {
    const temp = mkdtempSync(join(tmpdir(), 'embedded-debug-verify-'));
    try {
        if (block.language === 'js' || block.language === 'javascript') {
            const file = join(temp, basename(block.title));
            writeFileSync(file, block.source);
            const result = run(process.execPath, [file], temp);
            assert.equal(result.status, 0, `${block.title}: ${result.stderr || result.error || result.stdout}`);
            return { mode: 'node-execute', output: result.stdout.trim() };
        }
        if (block.language === 'tcl') {
            const wrapper = `
set ::events {}
proc reset {args} { lappend ::events "reset:[join $args { }]" }
proc program {args} {
  lappend ::events "program:[join $args { }]"
  if {[info exists ::fail_program] && $::fail_program} { error "mock verify failure" }
}
proc echo {args} { lappend ::events "echo:[join $args { }]" }
`;
            const happy = `${wrapper}\n${block.source}\nif {$::events ne {reset:init {program:firmware.elf verify} reset:run {echo:verified and running: firmware.elf}}} { puts stderr "unexpected call sequence: $::events"; exit 2 }\n`;
            let result = spawnSync('tclsh', ['-'], { cwd: temp, encoding: 'utf8', input: happy, timeout: 15000 });
            assert.equal(result.status, 0, `${block.title} success path: ${result.stderr || result.error || result.stdout}`);
            const failure = `${wrapper}\nset ::fail_program 1\nif {![catch {\n${block.source}\n} message]} { puts stderr "expected program failure"; exit 3 }\nif {[lsearch -exact $::events reset:run] >= 0} { puts stderr "reset run followed failed program"; exit 4 }\n`;
            result = spawnSync('tclsh', ['-'], { cwd: temp, encoding: 'utf8', input: failure, timeout: 15000 });
            assert.equal(result.status, 0, `${block.title} failure path: ${result.stderr || result.error || result.stdout}`);
            return { mode: 'tcl-mock-success-and-failure', output: 'program success reaches reset run; program failure does not' };
        }
        throw new Error(`Unsupported named example language: ${block.language} in ${articlePath}`);
    } finally {
        rmSync(temp, { recursive: true, force: true });
    }
}

for (const inputPath of paths) {
    const path = resolve(inputPath);
    const markdown = readFileSync(path, 'utf8');
    const blocks = extractNamedBlocks(markdown, inputPath);
    const article = { path: inputPath, namedExamples: [] };
    for (const block of blocks) {
        try {
            article.namedExamples.push({ title: block.title, line: block.start, ...check(block, inputPath), status: 'PASS' });
        } catch (error) {
            failures++;
            article.namedExamples.push({ title: block.title, line: block.start, status: 'FAIL', error: error.message });
        }
    }
    if (!blocks.length) article.namedExamplesStatus = 'NO_NAMED_EXECUTABLE_BLOCK';
    records.push(article);
}

const output = { verifier: 'scripts/verify-embedded-debugging-examples.mjs', articles: records, failures };
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
if (failures) process.exitCode = 1;
