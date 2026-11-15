import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const names = { '01': 'pdb-basics', '02': 'debugpy-ide', '03': 'asyncio', '04': 'py-spy', '05': 'faulthandler-tracemalloc' };
const chapter = process.argv[2];
assert.ok(names[chapter], 'Pass a supported chapter number');
const root = fileURLToPath(new URL('../', import.meta.url));
const article = readFileSync(join(root, `src/content/blog/tools/debugging/python/chapter${chapter}-${names[chapter]}.md`), 'utf8');
const work = mkdtempSync(join(tmpdir(), `python-debug-ch${chapter}-`));
const python = process.env.DEBUG_PYTHON ?? 'python3';
function write(path, text) {
  mkdirSync(dirname(join(work, path)), { recursive: true });
  writeFileSync(join(work, path), text);
}
const blocks = [...article.matchAll(/^```[\w+]+ title="([^"]+)"\n([\s\S]*?)^```/gm)];
assert.ok(blocks.length > 0);
assert.equal(new Set(blocks.map((b) => b[1])).size, blocks.length);
for (const [, path, text] of blocks) write(path, text);
function run(args, { input, fail } = {}) {
  const result = spawnSync(python, args, { cwd: work, encoding: 'utf8', timeout: 20000,
    env: { ...process.env, PYTHON_COLORS: '0', PYTHONBREAKPOINT: 'pdb.set_trace' }, input });
  const output = (result.stdout ?? '') + (result.stderr ?? '');
  console.log(`$ ${python} ${args.join(' ')}\n${output.trim()}`);
  if (result.error) throw result.error;
  if (fail) { assert.notEqual(result.status, 0); assert.match(output, fail); }
  else assert.equal(result.status, 0, output);
  return output;
}
run(['--version']);
console.log(`Workspace: ${work}`);
if (chapter === '01') {
  const output = run(['postmortem.py'], { input: 'p numerator\nwhere\ncontinue\n', fail: /ZeroDivisionError/ });
  assert.match(output, /42/);
  assert.match(output, /divide/);
  assert.doesNotMatch(output, /NameError|Error in sys.excepthook/);
  const text = readFileSync(join(work, 'postmortem.py'), 'utf8').replace('import traceback\n', '');
  write('broken.py', text);
  run(['broken.py'], { input: '', fail: /NameError.*traceback/s });
}
if (chapter === '02') {
  const config = JSON.parse(readFileSync(join(work, 'launch.json'), 'utf8'));
  assert.equal(config.configurations.length, 3);
  assert.equal(config.configurations.find((c) => c.request === 'attach').connect.host, '127.0.0.1');
  const output = run(['debug-start.py']);
  assert.equal(output.trim(), 'application ready');
  assert.match(run(['-m', 'debugpy', '--help']), /--listen/);
}
if (chapter === '03') {
  assert.equal(run(['runners.py']).trim(), 'sequential=1,1\nnested=blocked');
  assert.equal(run(['cancellation.py']).trim(), 'cleanup=True');
  assert.equal(run(['race.py']).trim(), 'unlocked=1\nlocked=2');
}
if (chapter === '04') {
  assert.equal(run(['workload.py', '--rounds', '2']).trim(), 'checksum=666566670000');
  console.log('NOT RUN: py-spy attach/record and SVG collection; workload baseline only.');
}
if (chapter === '05') {
  assert.equal(run(['memory-check.py']).trim(), 'payload_bytes=32768\ngrowth_positive=True\nrelease_negative=True');
  assert.equal(run(['gc-check.py']).trim(), 'saved=True\nreleased=True');
  const trace = run(['traceback-check.py']);
  assert.match(trace, /capture/);
  assert.match(trace, /traceback captured/);
}
console.log(`PASS Python Debugging chapter ${chapter}`);
