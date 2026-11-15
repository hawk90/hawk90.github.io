// Execute the named examples directly from the article, without modifying sources.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const article = readFileSync(resolve(root, 'src/content/blog/tools/build/cmake/chapter02-language.md'), 'utf8');
const work = mkdtempSync(join(tmpdir(), 'cmake-language-check-'));
function run(command, args) {
  const result = execFileSync(command, args, { cwd: work, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  console.log(`$ ${command} ${args.join(' ')}\n${result.trim()}`);
  return result;
}
for (const name of ['language-check.cmake', 'CMakeLists.txt', 'main.cpp']) {
  const blocks = [...article.matchAll(/^```\w+ title="([^"]+)"\n([\s\S]*?)^```/gm)];
  const matches = blocks.filter((block) => block[1] === name);
  assert.equal(matches.length, 1, `Unique article example required: ${name}`);
  writeFileSync(join(work, name), matches[0][2]);
}
console.log(`Workspace: ${work}`);
run('cmake', ['--version']);
run('ninja', ['--version']);
const scriptOutput = run('cmake', ['-P', 'language-check.cmake']);
const expected = [
  '-- path=[C:/Program Files/MyApp]', '-- paths=2', '-- bool=[OFF]:false',
  '-- bool=[]:false', '-- bool=[SOME_VALUE]:true', '-- VAR=true',
  '-- expanded=false', '-- equal=1', '-- CMP0135=NEW',
].join('\n');
assert.equal(scriptOutput.trim(), expected);

for (const config of ['Debug', 'Release']) {
  const dir = `build-${config.toLowerCase()}`;
  run('cmake', ['-S', '.', '-B', dir, '-G', 'Ninja', `-DCMAKE_BUILD_TYPE=${config}`]);
  // file(GENERATE) runs before building, not while compiling the target.
  const generated = readFileSync(join(work, dir, `config-${config}.txt`), 'utf8');
  const state = config === 'Debug' ? 'ON' : 'OFF';
  assert.equal(generated, `Config: ${config}\nDebug: ${state}\n`);
  run('cmake', ['--build', dir, '--verbose']);
  assert.equal(run(join(work, dir, 'app'), []).trim(), `DEBUG_MODE=${state}`);
}
run('cmake', ['-S', '.', '-B', 'build-multi', '-G', 'Ninja Multi-Config']);
for (const config of ['Debug', 'Release']) {
  const state = config === 'Debug' ? 'ON' : 'OFF';
  assert.equal(readFileSync(join(work, 'build-multi', `config-${config}.txt`), 'utf8'),
    `Config: ${config}\nDebug: ${state}\n`);
  run('cmake', ['--build', 'build-multi', '--config', config, '--verbose']);
  assert.equal(run(join(work, 'build-multi', config, 'app'), []).trim(), `DEBUG_MODE=${state}`);
}

// Negative and edge cases behind the article's warnings.
const ref = (name) => '$' + '{' + name + '}';
writeFileSync(join(work, 'edge-cases.cmake'), `
cmake_minimum_required(VERSION 3.25)
set(MY_VAR "")
if(${ref('MY_VAR')} STREQUAL "value")
endif()
`);
assert.throws(() => execFileSync('cmake', ['-P', 'edge-cases.cmake'], { cwd: work, stdio: 'pipe' }));
writeFileSync(join(work, 'edge-cases.cmake'), `
cmake_minimum_required(VERSION 3.25)
set(MY_VAR "")
if("${ref('MY_VAR')}" STREQUAL "value")
    message(FATAL_ERROR "Empty string must not equal value")
endif()
set(RESULT outside)
function(change_result)
    set(RESULT inside)
endfunction()
change_result()
if(NOT RESULT STREQUAL "outside")
    message(FATAL_ERROR "Function leaked its variable")
endif()
function(return_result OUT)
    set(${ref('OUT')} returned PARENT_SCOPE)
endfunction()
return_result(RESULT)
if(NOT RESULT STREQUAL "returned")
    message(FATAL_ERROR "PARENT_SCOPE did not return the value")
endif()
set(PATHS "C:/Program Files/MyApp;D:/SDK")
set(COUNT 0)
foreach(P IN LISTS PATHS)
    math(EXPR COUNT "${ref('COUNT')} + 1")
endforeach()
if(NOT COUNT EQUAL 2)
    message(FATAL_ERROR "Expected two list iterations")
endif()
message(STATUS "Edge cases passed")
`);
assert.match(run('cmake', ['-P', 'edge-cases.cmake']), /Edge cases passed/);
console.log('PASS: article output, four compiled configurations, generation timing, empty argument, scope and list cases.');
