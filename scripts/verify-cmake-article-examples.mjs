import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const chapter = process.argv[2];
const chapters = { '01': 'intro', '03': 'targets', '04': 'options', '05': 'find-package', '06': 'testing', '07': 'install', '08': 'best-practices', '09': 'modern-advanced' };
assert.ok(chapters[chapter], 'Pass a supported chapter number, for example 03');
const root = fileURLToPath(new URL('../', import.meta.url));
const source = readFileSync(join(root, `src/content/blog/tools/build/cmake/chapter${chapter}-${chapters[chapter]}.md`), 'utf8');
const blocks = [...source.matchAll(/^```\w+ title="([^"]+)"\n([\s\S]*?)^```/gm)];
assert.ok(blocks.length > 0, 'Named article examples are required');
assert.equal(new Set(blocks.map((block) => block[1])).size, blocks.length, 'Example filenames must be unique');
const work = mkdtempSync(join(tmpdir(), `cmake-ch${chapter}-`));
function write(path, content) {
  mkdirSync(dirname(join(work, path)), { recursive: true });
  writeFileSync(join(work, path), content);
}
for (const [, path, content] of blocks) write(path, content);
function run(command, args, { fail, cwd = work } = {}) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  const output = (result.stdout ?? '') + (result.stderr ?? '');
  console.log(`$ ${command} ${args.join(' ')}\n${output.trim()}`);
  if (result.error) throw result.error;
  if (fail) {
    assert.notEqual(result.status, 0, 'Expected failure');
    assert.match(output, fail);
  } else assert.equal(result.status, 0, output);
  return output;
}
function configure(dir, extra = []) {
  return run('cmake', ['-S', '.', '-B', dir, '-G', 'Ninja', ...extra]);
}
const original = readFileSync(join(work, 'CMakeLists.txt'), 'utf8');
console.log(`Chapter ${chapter}; workspace=${work}`);
run('cmake', ['--version']);
if (chapter === '01') {
  for (const [dir, generator] of [['ninja', 'Ninja'], ['make', 'Unix Makefiles']]) {
    run('cmake', ['-S', '.', '-B', dir, '-G', generator, '-DCMAKE_BUILD_TYPE=Debug']);
    run('cmake', ['--build', dir]);
    assert.equal(run(join(work, dir, 'hello'), []).trim(), 'Hello, CMake!');
  }
  run('cmake', ['-S', '.', '-B', 'ninja', '-G', 'Unix Makefiles'], { fail: /Does not match the generator used previously/ });
  write('CMakeLists.txt', original + '\nmessage(STATUS "AUTORECONFIGURED")\n');
  assert.match(run('cmake', ['--build', 'ninja']), /AUTORECONFIGURED/);
}
if (chapter === '03') {
  configure('build');
  run('cmake', ['--build', 'build', '--verbose']);
  assert.equal(run(join(work, 'build/calc'), []).trim(), 'sum=5');
  write('CMakeLists.txt', original.replace('PUBLIC include', 'PRIVATE include'));
  configure('private-header');
  run('cmake', ['--build', 'private-header'], { fail: /calc.hpp.*(not found|No such file)/ });
  write('CMakeLists.txt', original.replace('INTERFACE CALC_CONSUMER', 'PRIVATE CALC_CONSUMER'));
  configure('private-macro');
  run('cmake', ['--build', 'private-macro'], { fail: /must not receive CALC_CONSUMER|must receive CALC_CONSUMER/ });
  const plain = original.replace('calc PRIVATE Calculator::calclib', 'calc Calculator::calclib');
  write('CMakeLists.txt', plain);
  configure('plain');
  run('cmake', ['--build', 'plain']);
  assert.equal(run(join(work, 'plain/calc'), []).trim(), 'sum=5');
  write('CMakeLists.txt', plain + '\ntarget_link_libraries(calc PRIVATE Calculator::calclib)\n');
  run('cmake', ['-S', '.', '-B', 'mixed', '-G', 'Ninja'], { fail: /plain signature.*already been used|all-plain or all-keyword/s });
}
if (chapter === '04') {
  configure('build', ['-DENABLE_FEATURE_Y=OFF', '-DBACKEND=cpu']);
  assert.match(readFileSync(join(work, 'build/config.h'), 'utf8'), /#define ENABLE_FEATURE_Y 0/);
  run('cmake', ['--build', 'build']);
  assert.equal(run(join(work, 'build/app'), []).trim(), 'Y=OFF\nbackend=cpu');
  configure('build', ['-DENABLE_FEATURE_Y=ON', '-DBACKEND=gpu']);
  assert.match(readFileSync(join(work, 'build/config.h'), 'utf8'), /#define ENABLE_FEATURE_Y 1/);
  run('cmake', ['--build', 'build']);
  assert.equal(run(join(work, 'build/app'), []).trim(), 'Y=ON\nbackend=gpu');
  configure('build');
  assert.match(readFileSync(join(work, 'build/CMakeCache.txt'), 'utf8'), /BACKEND:STRING=gpu/);
  run('cmake', ['-S', '.', '-B', 'invalid', '-G', 'Ninja', '-DBACKEND=typo'], { fail: /Unsupported backend: typo/ });
  write('CMakeLists.txt', original + '\noption(YES_ACCEPTED "" yes)\nset(LOCAL_OVERRIDE OFF)\noption(LOCAL_OVERRIDE "" ON)\nif(NOT YES_ACCEPTED OR LOCAL_OVERRIDE)\nmessage(FATAL_ERROR "option semantics differ")\nendif()\nget_property(HAS_CACHE CACHE LOCAL_OVERRIDE PROPERTY TYPE SET)\nif(HAS_CACHE)\nmessage(FATAL_ERROR "CMP0077 NEW must not create cache here")\nendif()\n');
  configure('option-semantics');
}
if (chapter === '05') {
  for (const [mode, args] of [['module', []], ['config', ['-DPREFER_CONFIG=ON']]]) {
    configure(`build-${mode}`, args);
    run('cmake', ['--build', `build-${mode}`]);
    assert.equal(run(join(work, `build-${mode}/app`), []).trim(), `source=${mode}\nlocal=1`);
  }
  write('CMakeLists.txt', original.replace('find_package(Demo REQUIRED)', 'find_package(Demo CONFIG REQUIRED)'));
  configure('forced-config');
  run('cmake', ['--build', 'forced-config']);
  assert.equal(run(join(work, 'forced-config/app'), []).trim(), 'source=config\nlocal=1');
  write('CMakeLists.txt', original.replace('find_package(Demo REQUIRED)', 'find_package(Demo CONFIG REQUIRED PATHS "${CMAKE_CURRENT_SOURCE_DIR}/missing" NO_DEFAULT_PATH)'));
  run('cmake', ['-S', '.', '-B', 'missing', '-G', 'Ninja'], { fail: /Could not find a package configuration file provided by "Demo"/ });
}
if (chapter === '06') {
  configure('build');
  const order = run('ctest', ['--test-dir', 'build', '-R', '^Order', '-V'], { fail: /OrderFirst.*Failed/s });
  assert.match(order, /ORDER_NEXT_RAN/);
  run('ctest', ['--test-dir', 'build', '-R', '^Fixture', '-V']);
  configure('build', ['-DFAIL_SETUP=ON']);
  const failure = run('ctest', ['--test-dir', 'build', '-R', '^Fixture', '-V'], { fail: /FixtureBody.*Not Run/s });
  assert.doesNotMatch(failure, /^\d+: FIXTURE_BODY_RAN$/m);
  assert.match(failure, /FIXTURE_CLEANUP_RAN/);
}
if (chapter === '07') {
  configure('build', ['-DCMAKE_BUILD_TYPE=Release']);
  run('cmake', ['--build', 'build']);
  run('cmake', ['--install', 'build', '--prefix', join(work, 'stage')]);
  function consumer(dir, prefix) {
    run('cmake', ['-S', 'consumer', '-B', dir, '-G', 'Ninja', `-DCMAKE_PREFIX_PATH=${prefix}`]);
    run('cmake', ['--build', dir]);
    assert.equal(run(join(work, dir, 'app'), []).trim(), 'answer=42');
  }
  consumer('consumer-build', join(work, 'stage'));
  renameSync(join(work, 'stage'), join(work, 'relocated-stage'));
  consumer('consumer-relocated', join(work, 'relocated-stage'));
  const consumerText = readFileSync(join(work, 'consumer/CMakeLists.txt'), 'utf8');
  write('consumer/CMakeLists.txt', consumerText.replace('MyLib 1.0', 'MyLib 1.9'));
  run('cmake', ['-S', 'consumer', '-B', 'too-new', '-G', 'Ninja', `-DCMAKE_PREFIX_PATH=${join(work, 'relocated-stage')}`], { fail: /not compatible|version: 1.9/s });
  run('cpack', ['--config', 'build/CPackConfig.cmake', '-G', 'TGZ', '-B', 'packages']);
  const archive = readdirSync(join(work, 'packages')).find((name) => name.endsWith('.tar.gz'));
  assert.ok(archive, 'TGZ archive must exist');
  const listing = run('cmake', ['-E', 'tar', 'tf', join(work, 'packages', archive)]);
  for (const pattern of [/mylib\/api.hpp/, /libmylib.a/, /MyLibConfig.cmake/, /MyLibConfigVersion.cmake/, /MyLibTargets.cmake/]) assert.match(listing, pattern);
}
if (chapter === '08') {
  assert.match(configure('build'), /top=ON; tests=ON/);
  run('cmake', ['--build', 'build', '--verbose']);
  run('ctest', ['--test-dir', 'build', '--output-on-failure']);
  const nested = run('cmake', ['-S', 'parent', '-B', 'parent-build', '-G', 'Ninja']);
  assert.match(nested, /top=OFF; tests=OFF/);
  run('cmake', ['--build', 'parent-build', '--verbose']);
  assert.match(run('ctest', ['--test-dir', 'parent-build', '-N']), /Total Tests: 0/);
  assert.match(run('cmake', ['-S', 'parent', '-B', 'parent-tests', '-G', 'Ninja', '-DCHECKLIST_BUILD_TESTS=ON']), /top=OFF; tests=ON/);
  run('cmake', ['--build', 'parent-tests']);
  run('ctest', ['--test-dir', 'parent-tests', '--output-on-failure']);
}
if (chapter === '09') {
  assert.match(run('cmake', ['--list-presets']), /personal/);
  run('cmake', ['--preset', 'debug']);
  assert.match(run('cmake', ['--build', '--preset', 'debug']), /Generating version.hpp/);
  assert.equal(run(join(work, 'build/debug/app'), []).trim(), 'version=1.0.0');
  assert.doesNotMatch(run('cmake', ['--build', '--preset', 'debug']), /Generating version.hpp/);
  for (let attempt = 0; attempt < 2; attempt++) assert.match(run('cmake', ['--build', 'build/debug', '--target', 'ping']), /PING/);
  run('cmake', ['--preset', 'personal']);
  run('cmake', ['--build', '--preset', 'personal']);
  assert.equal(run(join(work, 'build/personal/app'), []).trim(), 'version=1.0.0');
  write('version.hpp.in', readFileSync(join(work, 'version.hpp.in'), 'utf8').replace('1.0.0', '2.0.0'));
  assert.match(run('cmake', ['--build', '--preset', 'debug']), /Generating version.hpp/);
  assert.equal(run(join(work, 'build/debug/app'), []).trim(), 'version=2.0.0');
  const user = JSON.parse(readFileSync(join(work, 'CMakeUserPresets.json'), 'utf8'));
  user.configurePresets[0].name = 'debug';
  write('CMakeUserPresets.json', JSON.stringify(user));
  run('cmake', ['--list-presets'], { fail: /Duplicate preset/ });
}
console.log(`PASS chapter ${chapter}: article examples and negative controls`);
