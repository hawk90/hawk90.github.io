---
title: "Sanitizer를 CMake와 CI에 통합 — Multi-config 빌드 전략"
slug: "tools/debugging/sanitizers/chapter05-cmake-ci"
date: 2026-05-29T09:05:00
description: "Sanitizer 빌드를 프로젝트에 자연스럽게 통합 — CMake 옵션, GitHub Actions, GitLab CI 실전 예시."
tags: [Sanitizer, CMake, CI, github-actions, GitLab, Debugging]
series: "Sanitizers"
seriesOrder: 5
draft: false
topics: ["tools", "tools/debugging"]
---

## 이 장의 목표

[Ch 1](/blog/tools/debugging/sanitizers/chapter01-intro)~[Ch 4](/blog/tools/debugging/sanitizers/chapter04-tsan)에서 Sanitizer를 *손으로 켜는 방법*을 봤습니다. 실무에서는 이걸 *프로젝트에 자연스럽게 통합*해 *PR마다 자동으로* 돌게 만들어야 합니다.

이 장은 두 가지 통합 시나리오를 다룹니다.

1. **CMake 프로젝트** — `cmake -B build-asan -DENABLE_ASAN=ON`으로 한 줄에 켜기.
2. **CI 파이프라인** — GitHub Actions와 GitLab CI에 sanitizer job 추가.

마지막에 *예시 템플릿*을 한 자리에 모읍니다.

---

## CMake 통합 — 기본 패턴

가장 단순한 통합부터.

```cmake
# project() 이후, 검사 대상 타겟 생성 이전에 배치
option(ENABLE_ASAN "Enable AddressSanitizer + UBSan" OFF)
option(ENABLE_TSAN "Enable ThreadSanitizer" OFF)

if(ENABLE_ASAN AND ENABLE_TSAN)
    message(FATAL_ERROR "ASan and TSan cannot be enabled at the same time")
endif()

if(ENABLE_ASAN)
    add_compile_options(
        -fsanitize=address,undefined
        -fno-omit-frame-pointer
        -g -O1
    )
    add_link_options(-fsanitize=address,undefined)
endif()

if(ENABLE_TSAN)
    add_compile_options(
        -fsanitize=thread
        -fno-omit-frame-pointer
        -g -O1
    )
    add_link_options(-fsanitize=thread)
endif()
```

사용:

```bash
# ASan 빌드
cmake -B build-asan -DENABLE_ASAN=ON
cmake --build build-asan

# TSan 빌드 — 별도 디렉터리
cmake -B build-tsan -DENABLE_TSAN=ON
cmake --build build-tsan
```

ASan/TSan/UBSan을 *옵션 한 줄로* 켜고 끌 수 있고, 둘을 동시에 켜면 구성 단계에서 멈춥니다. 이 조각은 지원하지 않는 컴파일러에서도 플래그를 그대로 넘기므로, 컴파일러 검사와 링크 probe까지 넣은 아래 함수형 구성을 완성본으로 씁니다. 이 장의 CMake 실행 결과는 모두 그 함수형 구성을 파일로 옮겨 돌린 것입니다.

---

## CMake 통합 — 함수로 추상화

큰 프로젝트에서는 *함수로 묶어* 재사용합니다. 여러 타겟에 sanitizer 옵션을 일관되게 적용할 때 깔끔합니다.

```cmake title="cmake/Sanitizers.cmake"
# cmake/Sanitizers.cmake

function(enable_sanitizers target)
    if(NOT (ENABLE_ASAN OR ENABLE_TSAN OR ENABLE_MSAN))
        return()
    endif()
    if(NOT CMAKE_CXX_COMPILER_ID MATCHES "^(GNU|Clang|AppleClang)$")
        message(FATAL_ERROR "Unsupported sanitizer compiler")
    endif()

    set(sanitizers "")

    if(ENABLE_ASAN)
        list(APPEND sanitizers "address")
        list(APPEND sanitizers "undefined")
    endif()

    if(ENABLE_TSAN)
        if(sanitizers)
            message(FATAL_ERROR "ASan + TSan cannot coexist")
        endif()
        list(APPEND sanitizers "thread")
        list(APPEND sanitizers "undefined")
    endif()

    if(ENABLE_MSAN)
        if(sanitizers)
            message(FATAL_ERROR "MSan incompatible with other sanitizers")
        endif()
        if(NOT CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
            message(FATAL_ERROR "MSan requires upstream Clang")
        endif()
        if(NOT CMAKE_SYSTEM_NAME STREQUAL "Linux")
            message(FATAL_ERROR "This MSan example requires Linux")
        endif()
        list(APPEND sanitizers "memory")
    endif()

    if(sanitizers)
        list(JOIN sanitizers "," sanitizers_str)
        include(CheckCXXSourceCompiles)
        string(MAKE_C_IDENTIFIER "SAN_${sanitizers_str}" probe)
        set(CMAKE_REQUIRED_FLAGS "-fsanitize=${sanitizers_str}")
        check_cxx_source_compiles("int main() { return 0; }" ${probe})
        if(NOT ${probe})
            message(FATAL_ERROR "Sanitizer compile/link probe failed")
        endif()
        target_compile_options(${target} PRIVATE
            -fsanitize=${sanitizers_str}
            -fno-omit-frame-pointer
            -g -O1
        )
        get_target_property(target_type ${target} TYPE)
        if(target_type STREQUAL "STATIC_LIBRARY")
            target_link_options(${target} INTERFACE -fsanitize=${sanitizers_str})
        else()
            target_link_options(${target} PRIVATE -fsanitize=${sanitizers_str})
        endif()
    endif()
endfunction()
```

```cmake title="CMakeLists.txt"
cmake_minimum_required(VERSION 3.25)
project(SanitizerDemo LANGUAGES CXX)
include(CTest)
include(cmake/Sanitizers.cmake)
option(ENABLE_ASAN "Enable ASan + UBSan" OFF)
option(ENABLE_TSAN "Enable TSan + UBSan" OFF)
option(ENABLE_MSAN "Enable MSan (Linux upstream Clang)" OFF)

add_library(core STATIC core.cpp)
enable_sanitizers(core)
add_executable(test_runner main.cpp)
target_link_libraries(test_runner PRIVATE core)
enable_sanitizers(test_runner)
add_test(NAME answer COMMAND test_runner)
```

```cpp title="core.cpp"
int answer() { return 42; }
```

```cpp title="main.cpp"
#include <cstdio>
int answer();
int main() {
    std::printf("answer=%d\n", answer());
    return answer() == 42 ? 0 : 1;
}
```

옵션을 요청했는데 지원하지 않으면 조용히 끄지 않고 구성 실패로 알립니다. 위 네 파일을 CMake 4.5.0·Ninja 1.13.2로 macOS(Homebrew LLVM 23.1.5, Apple clang 21)와 Debian 13(clang 19.1.7, GCC 14.2.0, CMake는 apt 패키지)에서 구성·빌드·`ctest`까지 돌린 결과입니다.

| 요청 | Homebrew LLVM 23 | Apple clang 21 | Debian clang 19 | Debian GCC 14 |
|------|------|------|------|------|
| `release` | 빌드 통과 | 빌드 통과 | 빌드 통과 | 빌드 통과 |
| `asan` (ASan+UBSan) | 통과 | **테스트 실패** (아래) | 통과 | 통과 |
| `tsan` (TSan+UBSan) | 통과 | 통과 | 통과 | 통과 |
| `-DENABLE_MSAN=ON` | `This MSan example requires Linux` | — | 통과 | `MSan requires upstream Clang` |
| `-DENABLE_ASAN=ON -DENABLE_TSAN=ON` | `ASan + TSan cannot coexist` | — | — | — |

`release`는 test preset이 없어 구성·빌드까지만 했습니다. `SAN_address_undefined`, `SAN_thread_undefined`, `SAN_memory`라는 이름으로 `check_cxx_source_compiles` probe가 돌고 `Success`가 찍혔습니다. probe는 컴파일과 링크만 확인하므로, 런타임 기동이나 종속 라이브러리 전체의 MSan 계측까지 검증하지 않습니다.

정적 라이브러리는 자체 링크 단계가 없어서, 필요한 런타임 링크 옵션을 `INTERFACE`로 소비자에게 넘깁니다. 이 부분을 `PRIVATE`로 바꾸고 `core`만 `enable_sanitizers()`한 소비자를 만들자 Homebrew LLVM에서 `Undefined symbols for architecture arm64: "___asan_init"`으로 링크가 실패했습니다. `INTERFACE`로 되돌리면 소비자 실행 파일이 `libclang_rt.asan_osx_dynamic.dylib`에 링크되고 `answer=42`를 출력했습니다.

### CMakePresets로 더 깔끔하게

프리셋은 3.19에 도입됐지만 아래 schema 6 예제는 **CMake 3.25 이상**이 필요합니다([Ch 9](/blog/tools/build/cmake/chapter09-modern-advanced#cmakepresetsjson--빌드-설정의-표준-외부화-319)).

```json title="CMakePresets.json"
{
  "version": 6,
  "cmakeMinimumRequired": { "major": 3, "minor": 25, "patch": 0 },
  "configurePresets": [
    {
      "name": "asan",
      "displayName": "ASan + UBSan Build",
      "binaryDir": "${sourceDir}/build/${presetName}",
      "generator": "Ninja",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Debug",
        "ENABLE_ASAN": "ON"
      },
      "environment": {
        "ASAN_OPTIONS": "halt_on_error=1:abort_on_error=1:detect_leaks=1:symbolize=1",
        "UBSAN_OPTIONS": "halt_on_error=1:print_stacktrace=1:symbolize=1"
      }
    },
    {
      "name": "tsan",
      "displayName": "TSan Build",
      "binaryDir": "${sourceDir}/build/${presetName}",
      "generator": "Ninja",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Debug",
        "ENABLE_TSAN": "ON"
      },
      "environment": {
        "TSAN_OPTIONS": "halt_on_error=1:second_deadlock_stack=1"
      }
    },
    {
      "name": "asan-macos",
      "inherits": "asan",
      "displayName": "ASan + UBSan Build (Apple clang, no LSan)",
      "environment": {
        "ASAN_OPTIONS": "halt_on_error=1:abort_on_error=1:symbolize=1"
      }
    },
    {
      "name": "release",
      "binaryDir": "${sourceDir}/build/${presetName}",
      "generator": "Ninja",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Release"
      }
    }
  ],
  "buildPresets": [
    { "name": "asan", "configurePreset": "asan" },
    { "name": "tsan", "configurePreset": "tsan" },
    { "name": "asan-macos", "configurePreset": "asan-macos" },
    { "name": "release", "configurePreset": "release" }
  ],
  "testPresets": [
    {
      "name": "asan",
      "configurePreset": "asan",
      "output": { "outputOnFailure": true }
    },
    {
      "name": "tsan",
      "configurePreset": "tsan",
      "output": { "outputOnFailure": true }
    },
    {
      "name": "asan-macos",
      "configurePreset": "asan-macos",
      "output": { "outputOnFailure": true }
    }
  ]
}
```

```bash
# 한 명령에 한 빌드
cmake --preset asan
cmake --build --preset asan
ctest --preset asan
```

`environment` 섹션에 *sanitizer 환경 변수까지 박아 두기* 때문에, 매번 export할 필요가 없습니다. 이 동작에는 두 가지 결과가 따릅니다.

첫째, preset 값이 셸 값을 덮습니다. [cmake-presets(7)](https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html)은 각 변수가 "set regardless of whether or not a value was given to it by the process's environment"라고 적습니다. 실제로 Apple clang 21로 `asan` preset을 돌리자 `ctest --preset asan`이 `==66762==AddressSanitizer: detect_leaks is not supported on this platform.`과 함께 `Subprocess aborted`로 실패했고, `ASAN_OPTIONS=detect_leaks=0 ctest --preset asan`처럼 셸에서 덮어써도 같은 오류가 났습니다. 그래서 위 파일에 `asan`을 상속하고 `ASAN_OPTIONS`만 바꾼 `asan-macos`를 두었고, 이 preset은 Apple clang에서 통과했습니다.

둘째, preset을 거치지 않고 `./build/asan/test_runner`를 직접 실행하면 이 환경 변수는 붙지 않습니다. 같은 바이너리를 직접 돌리자 `answer=42`와 종료 코드 0이 나왔습니다.

---

## GitHub Actions — 실전 워크플로

가장 기본적인 패턴부터 보겠습니다. 이 절과 다음 GitLab 절의 YAML은 GitHub·GitLab 러너에서 실행하지 않았습니다. 각 job이 부르는 `cmake --preset`·`ctest --preset` 명령만 위 표처럼 로컬과 Debian 게스트에서 돌렸습니다.

```yaml
# .github/workflows/sanitizers.yml
name: Sanitizers

on:
  pull_request:
  push:
    branches: [main]

jobs:
  asan-ubsan:
    name: ASan + UBSan
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y cmake ninja-build llvm clang g++

      - name: Configure
        run: cmake --preset asan

      - name: Build
        run: cmake --build --preset asan

      - name: Test
        env:
          ASAN_OPTIONS: halt_on_error=1:abort_on_error=1:detect_leaks=1
          UBSAN_OPTIONS: halt_on_error=1:print_stacktrace=1
          ASAN_SYMBOLIZER_PATH: /usr/bin/llvm-symbolizer
        run: ctest --preset asan

  tsan:
    name: ThreadSanitizer
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y cmake ninja-build llvm clang g++

      - name: Configure
        run: cmake --preset tsan

      - name: Build
        run: cmake --build --preset tsan

      - name: Test
        env:
          TSAN_OPTIONS: halt_on_error=1:second_deadlock_stack=1
          TSAN_SYMBOLIZER_PATH: /usr/bin/llvm-symbolizer
        run: ctest --preset tsan
```

핵심 포인트:

1. **두 job 병렬 실행** — ASan과 TSan은 별도 워크플로 job입니다. 드라이버가 한 빌드에 둘을 거부합니다(1장).
2. **환경 변수는 preset이 이깁니다** — Test 단계의 `env:`에 적은 `ASAN_OPTIONS`·`UBSAN_OPTIONS`·`TSAN_OPTIONS`는 `ctest --preset`이 preset의 `environment`로 덮어씁니다. 위 실험처럼 셸 값은 무시되므로, 값을 바꾸려면 preset을 고칩니다. 반대로 `ASAN_SYMBOLIZER_PATH`처럼 preset에 없는 변수는 job 환경이 그대로 전달됩니다.
3. **종료 코드** — 보고가 나면 ASan은 1(`abort_on_error=1`이면 SIGABRT), UBSan은 `halt_on_error=1`일 때만 1, TSan은 66으로 끝나 CI가 실패합니다(2·4장).
4. **심볼라이저** — Debian 13에서는 `llvm` 패키지가 `/usr/bin/llvm-symbolizer`를, `llvm-19`가 실제 파일 `/usr/lib/llvm-19/bin/llvm-symbolizer`를 제공했습니다(`dpkg -S`). Ubuntu 24.04 러너의 패키지 구성은 확인하지 않았습니다. GCC의 libasan은 외부 도구 없이 libbacktrace로 줄 번호를 냈으므로, 이 변수는 clang 빌드에서 의미가 있습니다.

### 추가 최적화 — 캐시

```yaml
- name: Cache CMake build
  uses: actions/cache@v4
  with:
    path: build/asan
    key: ${{ runner.os }}-asan-${{ hashFiles('**/CMakeLists.txt') }}
    restore-keys: |
      ${{ runner.os }}-asan-
```

이 키는 `CMakeLists.txt`만 해시하므로, 러너 이미지가 바뀌어 컴파일러 버전이 달라져도 같은 캐시가 복원됩니다. CMake는 첫 구성 때 찾은 컴파일러 경로를 `CMakeCache.txt`에 고정하니, 키에 컴파일러 버전(`$CXX --version` 출력의 해시 등)과 `CMakePresets.json`도 넣습니다. 캐시로 얼마나 빨라지는지는 실제 러너에서 재지 않았습니다.

### TSan 반복 실행

[Ch 4](/blog/tools/debugging/sanitizers/chapter04-tsan)에서 본 *반복 실행으로 커버리지 확보* 패턴.

```yaml
- name: TSan stress (10x)
  env:
    TSAN_OPTIONS: halt_on_error=1
  run: |
    for i in {1..10}; do
      echo "===== Iteration $i ====="
      ctest --preset tsan || exit 1
    done
```

10번 중 한 번이라도 실패하면 CI 전체가 실패합니다. 4장의 `counter.cpp`처럼 두 접근이 매번 실행되는 레이스는 첫 반복에서 잡히고(Debian에서 10번 모두 종료 코드 66), 반복이 보태는 것은 스케줄에 따라 실행 경로가 바뀌는 테스트의 표본입니다.

---

## GitLab CI — 동일 패턴

GitLab은 YAML 구조가 GitHub Actions와 약간 다릅니다.

```yaml
# .gitlab-ci.yml
stages:
  - test

.sanitizer_template: &sanitizer_template
  stage: test
  image: ubuntu:24.04
  before_script:
    - apt-get update
    - apt-get install -y cmake ninja-build llvm clang g++
  cache:
    key: "$CI_JOB_NAME"
    paths:
      - build/

asan-ubsan:
  <<: *sanitizer_template
  variables:
    ASAN_OPTIONS: "halt_on_error=1:abort_on_error=1:detect_leaks=1"
    UBSAN_OPTIONS: "halt_on_error=1:print_stacktrace=1"
    ASAN_SYMBOLIZER_PATH: "/usr/bin/llvm-symbolizer"
  script:
    - cmake --preset asan
    - cmake --build --preset asan
    - ctest --preset asan

tsan:
  <<: *sanitizer_template
  variables:
    TSAN_OPTIONS: "halt_on_error=1:second_deadlock_stack=1"
    TSAN_SYMBOLIZER_PATH: "/usr/bin/llvm-symbolizer"
  script:
    - cmake --preset tsan
    - cmake --build --preset tsan
    - ctest --preset tsan
```

YAML 앵커(`&template`, `<<: *template`)로 *공통 설정*을 한 자리에 둡니다.

---

## Compiler / OS 매트릭스

지원되는 OS·컴파일러 조합을 명시적으로 선택합니다. 이 Mac에서 `gcc --version`은 `Apple clang version 21.0.0`을 출력했습니다. macOS의 `gcc`는 Apple clang이므로 명령 이름만 바꾼 곱집합을 만들지 않습니다. 아래 구성도 GitHub 러너에서는 실행하지 않았습니다.

```yaml
asan-ubsan:
  strategy:
    fail-fast: false
    matrix:
      include:
        - { os: ubuntu-24.04, cc: gcc, cxx: g++ }
        - { os: ubuntu-24.04, cc: clang, cxx: clang++ }
        - { os: macos-14, cc: clang, cxx: clang++ }
  runs-on: ${{ matrix.os }}
  env:
    CC: ${{ matrix.cc }}
    CXX: ${{ matrix.cxx }}
  steps:
    - uses: actions/checkout@v4
    - name: Inspect tools
      run: |
        cmake --version
        ninja --version
        "$CXX" --version
    - run: cmake --preset ${{ runner.os == 'macOS' && 'asan-macos' || 'asan' }}
    - run: cmake --build --preset ${{ runner.os == 'macOS' && 'asan-macos' || 'asan' }}
    - run: ctest --preset ${{ runner.os == 'macOS' && 'asan-macos' || 'asan' }}
```

macOS 행의 `clang`은 Apple clang이라, `asan` preset을 그대로 쓰면 앞에서 본 `detect_leaks is not supported on this platform.`으로 테스트가 실패합니다. 그래서 macOS에서만 `asan-macos` preset을 고르게 했습니다. `fail-fast: false`는 한 조합이 실패해도 나머지 조합의 결과를 끝까지 모으는 설정입니다.

---

## 실패 진단 — *Sanitizer가 깼을 때*

CI에서 sanitizer가 깨지면 다음 순서로 진단합니다.

1. **출력 확인** — CI 로그의 sanitizer 보고서. `SUMMARY:` 줄과 스택 트레이스.
2. **로컬 재현** — 같은 프리셋으로 로컬에서 동일 빌드.
   ```bash
   cmake --preset asan && cmake --build --preset asan && ctest --preset asan
   ```
3. **단일 테스트 격리** — 실패한 테스트만 따로.
   ```bash
   ctest --preset asan -R FailingTestName -V
   ```
4. **`gdb`/`lldb`로 디버깅** — Sanitizer 빌드는 `-g`가 켜져 있어 디버거 사용 가능.
   ```bash
   ASAN_OPTIONS=abort_on_error=1 gdb ./build/asan/test
   (gdb) run
   # 에러 발생 시 abort → 스택 검사
   (gdb) bt
   ```

`abort_on_error=1`이 *디버거에서 잡기 핵심*입니다. 2장의 `bounds.cpp`(`bounds bad`)를 Debian 13의 GDB 16.3으로 돌린 결과입니다.

```text
$ ASAN_OPTIONS=abort_on_error=1 gdb -q -batch -ex run -ex bt --args ./bounds bad
...
Program received signal SIGABRT, Aborted.
...
#3  0x0000aaaaaab9e4b0 [PAC] in __sanitizer::Abort() ()
#4  0x0000aaaaaab9c1a0 [PAC] in __sanitizer::Die() ()
#5  0x0000aaaaaab7c5f8 [PAC] in __asan::ScopedInErrorReport::~ScopedInErrorReport() ()
#6  0x0000aaaaaab7fa38 [PAC] in __asan::ReportGenericError(unsigned long, unsigned long, unsigned long, unsigned long, bool, unsigned long, unsigned int, bool) ()
#7  0x0000aaaaaab80e80 [PAC] in __asan_report_store4 ()
#8  0x0000aaaaaabb8e80 [PAC] in main (argc=2) at bounds.cpp:5
```

Linux 기본값인 `abort_on_error=0`으로 같은 명령을 돌리면 `[Inferior 1 (process 920) exited with code 01]`만 남고 `bt`할 프레임이 없었습니다. 옵션을 바꾸지 않고 멈추려면 보고 함수에 중단점을 겁니다. `break __asan::ReportGenericError`를 주자 `Breakpoint 1, … in __asan::ReportGenericError(…)`에서 멈췄고, `bt`의 #2가 `main (argc=2) at bounds.cpp:5`였습니다.

macOS의 LLDB(lldb-2103.0.34.407)는 따로 설정하지 않아도 `AddressSanitizer report breakpoint hit.`을 찍고 `stop reason = Heap buffer overflow`로 멈춰 `bounds.cpp:5:19`의 소스 줄을 보여 줬습니다. `abort_on_error=0`을 줘도 같은 자리에서 멈췄습니다.

TSan 바이너리를 GDB로 볼 때는 [TSan 문서](https://clang.llvm.org/docs/ThreadSanitizer.html#limitations)의 경고를 기억합니다. GDB는 기본으로 ASLR을 끄는데, Linux에서 ASLR이 꺼지면 TSan이 shadow 메모리를 못 잡고 `FATAL: ThreadSanitizer can not mmap the shadow memory`로 멈출 수 있습니다. 문서가 권하는 실행은 `gdb -ex 'set disable-randomization off' --args ./a.out`입니다.

---

## 자주 만나는 CI 문제들

### "Sanitizer가 동작하는데 줄 번호가 안 나옴"

```text
    #0 0x0001044ec5d8 in process_data+0x48 (/…/withg:arm64+0x1000005d8)
```

**원인**: 이 줄은 macOS에서 `ASAN_SYMBOLIZER_PATH`를 없는 경로로 줬을 때 나왔습니다. 런타임이 `WARNING: invalid path to external symbolizer!`를 먼저 찍었으므로 로그 위쪽의 `WARNING:` 줄부터 봅니다. `-g` 없이 빌드해도 같은 `함수+오프셋` 형태가 됩니다(2장). Debian 13에서는 `PATH`를 비워도 GCC 빌드(libbacktrace)와 clang 19 빌드 모두 줄 번호가 나왔으므로, Linux에서 이 증상을 보면 `-g`와 `ASAN_SYMBOLIZER_PATH` 값을 먼저 의심합니다.

**해결**: 심볼라이저 설치 + 올바른 경로.
```yaml
- name: Install symbolizer
  run: sudo apt-get install -y llvm

env:
  ASAN_SYMBOLIZER_PATH: /usr/bin/llvm-symbolizer
```

### "ASan + UBSan 빌드가 너무 느려"

**확인**: 컴파일·링크·테스트 시간을 나누어 잽니다. ASan 문서의 "typical slowdown"은 2x이지만, 2장에서 정렬 작업 하나를 잰 값은 거의 1배였습니다. 작업마다 배율이 다르니 어느 단계가 늘었는지부터 봅니다.

**해결**:
1. **생성기·병렬도 확인** — 프로젝트에서 Ninja와 Make의 실제 소요 시간을 비교합니다.
2. **빌드 캐시** — `actions/cache`로 incremental.
3. **테스트 범위 축소** — `ctest -L unit`으로 단위 테스트만 빠르게.

### "TSan이 false positive 너무 많아"

**원인**: 외부 라이브러리 / 사용자 모드 동기화 / lock-free 알고리즘.

**해결**:
1. *Suppression 파일* 작성 — 외부 라이브러리 무시. `race:` 대신 `race_top:`이나 함수 이름처럼 좁은 규칙을 씁니다. 4장에서 `race:libstdc++.so` 한 줄이 진짜 레이스를 지웠습니다.
2. *TSan annotation* — `sanitizer/tsan_interface.h`의 `__tsan_acquire(void *addr)`/`__tsan_release(void *addr)`로, 이미 존재하는 사용자 정의 동기화를 TSan에 알려 줍니다.
3. *PR 빌드 제외* — TSan은 야간 빌드로 이동.

### "macOS에서 detect_leaks가 안 됨"

**원인**: 3장의 실행 결과로 정리됩니다. Apple clang 21의 ASan 런타임은 `detect_leaks=1`을 받으면 `detect_leaks is not supported on this platform.`으로 abort하고, `-fsanitize=leak`은 컴파일 단계에서 거부합니다. Homebrew LLVM 23.1.5는 `detect_leaks` 기본값이 `false`라 켜야 보고합니다.

**설정 예**: macOS에서 누수를 봐야 하면 Homebrew LLVM으로 빌드하는 job을 따로 두고, 그 job의 preset 환경에 `detect_leaks=1`을 넣습니다. preset이 셸 환경을 덮으므로 job의 `env:`가 아니라 preset 쪽에 적습니다. Apple clang job은 위 `asan-macos`처럼 `detect_leaks`를 빼고 돌립니다.

---

## 권장 운영 모델

규모별 권장 설정입니다. 기준은 코드 줄 수가 아니라 *sanitizer 빌드로 전체 테스트를 돌리는 데 걸리는 시간*입니다. 그 시간이 PR 대기 시간 안에 들어오는지에 따라 단계를 고릅니다.

### 전체 테스트가 PR 시간 안에 끝나는 프로젝트

- PR 빌드: **ASan + UBSan** 한 작업.
- 메인 브랜치: **TSan** 한 번 더 (멀티스레드면).
- 매트릭스: **GCC + Clang** × **Linux** 한 OS.

### PR에는 일부만 돌릴 수 있는 프로젝트

- PR 빌드: **ASan + UBSan** + 빠른 단위 테스트만.
- 메인 브랜치: **ASan + UBSan** 전체 + **TSan** 작은 시나리오.
- 야간: **TSan** 전체 + **MSan** (Linux clang, 종속 라이브러리까지 MSan으로 빌드할 수 있을 때).
- 매트릭스: **GCC + Clang** × **Linux + macOS**. macOS job은 `asan-macos`처럼 LSan을 뺀 preset을 씁니다.

### 야간에도 전체를 돌리기 어려운 프로젝트

- PR 빌드: **ASan + UBSan** 작은 변경분 영향 테스트만.
- 메인 브랜치: 일부 추출된 *대표 테스트*.
- 야간: 전체 매트릭스 (ASan / TSan / MSan / 다양한 컴파일러).
- 별도 *fuzzer + sanitizer* 워크플로 — [OSS-Fuzz](https://google.github.io/oss-fuzz/) 같은 외부 서비스. [OSS-Fuzz 프로젝트 가이드](https://google.github.io/oss-fuzz/getting-started/new-project-guide/)에 따르면 `project.yaml`의 `sanitizers` 값은 `address`·`memory`·`undefined` 중에서 고르고, 기본값은 `address`와 `undefined`입니다. `memory`는 계측하지 않은 시스템 의존성 때문에 오탐이 잦아 기본에서 빠져 있습니다.

큰 프로젝트일수록 *sanitizer를 빌드 인프라의 일부로* 다루게 됩니다. 단순한 옵션이 아니라 *별도 빌드 파이프라인*.

---

## 직접 확인한 범위

이 장에서 직접 돌린 것과 돌리지 않은 것을 나눠 적습니다.

| 항목 | 결과 |
|------|------|
| `cmake/Sanitizers.cmake`·`CMakeLists.txt`·`core.cpp`·`main.cpp`·`CMakePresets.json` 추출 후 release/asan/tsan preset | Homebrew LLVM 23.1.5, Debian clang 19.1.7, Debian GCC 14.2.0에서 모두 통과. Apple clang 21은 `asan`만 `detect_leaks` 때문에 실패, `asan-macos`로 통과 |
| `-DENABLE_MSAN=ON` | Debian clang 19 통과, GCC 14·macOS는 의도한 `FATAL_ERROR` |
| `-DENABLE_ASAN=ON -DENABLE_TSAN=ON` | `ASan + TSan cannot coexist`로 구성 실패 |
| 정적 라이브러리만 계측한 소비자 | `INTERFACE`일 때 링크·실행 성공, `PRIVATE`로 바꾸면 `___asan_init` 미정의 |
| preset 환경 vs 셸 환경 | preset이 이김 (셸 `ASAN_OPTIONS=detect_leaks=0` 무시) |
| GDB 16.3 / LLDB에서 ASan 중단 | 위 출력대로 |
| GitHub Actions·GitLab CI job, Ubuntu 24.04·macos-14 러너, 캐시 효과 | 실행하지 않음 |

로컬 CMake는 4.5.0(macOS), Ninja는 1.13.2였습니다. MSan은 이 예제의 `core`·`main` 두 파일만 계측했고, 계측한 libc++까지 갖춘 실제 MSan 환경은 만들지 않았습니다.

## 정리

- CMake 통합: `option()`으로 sanitizer 빌드 모드, 함수로 추상화.
- `CMakePresets.json`으로 *설정·환경 변수까지* 외부화.
- GitHub Actions / GitLab CI 모두 *별도 job*으로 ASan과 TSan 분리.
- 환경 변수는 preset의 `environment`가 셸·job 환경을 덮습니다. Apple clang에서는 `detect_leaks=1`이 든 preset이 테스트를 abort시키므로 macOS용 preset을 따로 둡니다.
- 매트릭스 (OS × 컴파일러) + `fail-fast: false`로 *어디서 깨지는지* 한눈에.
- 진단 — CI 출력 → 로컬 재현 → 단일 테스트 → 디버거. GDB에서는 `abort_on_error=1`이나 `__asan::ReportGenericError` 중단점으로 멈추고, LLDB는 ASan 보고에서 스스로 멈춥니다.
- 운영 모델은 *프로젝트 규모에 맞춰* 단순 → 복잡으로 진화.

## 시리즈 마무리

Sanitizer 시리즈 다섯 챕터를 마칩니다.

| 장 | 주제 |
|----|------|
| Ch 1 | 개요 — ASan / UBSan / LSan / TSan / MSan |
| Ch 2 | ASan + UBSan 실전 설정 |
| Ch 3 | LSan과 누수 분석 |
| Ch 4 | TSan과 데이터 레이스 |
| Ch 5 | CMake / CI 통합 |

Sanitizer는 *컴파일러 한 옵션*으로 *수많은 런타임 버그를 잡는* 강력한 도구입니다. 시리즈에서 돌린 결과가 그 한계도 보여 줬습니다. Apple clang에는 LSan·MSan이 없었고, `-O1`은 상수 `strcpy` 오버플로와 초기화 안 된 지역 변수 검사를 지웠으며, libstdc++의 vector 검사는 매크로를 줘야 켜졌습니다. 어떤 검사가 *어느 컴파일러·어느 빌드에서* 실제로 도는지를 한 번씩 재현해 두는 것이 도입의 첫 단계입니다.

도입 순서:
1. **로컬 개발 빌드에 ASan + UBSan** — 오늘 추가.
2. **단위 테스트에 ASan** — 이번 주 안에.
3. **PR CI에 ASan + UBSan** — 다음 PR 사이클부터.
4. **멀티스레드면 TSan** — 동시성 코드 추가 시.

[Valgrind 시리즈](/blog/tools/debugging/valgrind/chapter01-intro)는 재컴파일할 수 없는 바이너리나 시스템 호출 추적처럼 *sanitizer가 닿지 못하는 자리*를 보완합니다.

## 참고 자료

- [Google Sanitizers Wiki](https://github.com/google/sanitizers/wiki)
- [Clang AddressSanitizer Manual](https://clang.llvm.org/docs/AddressSanitizer.html) — 각 sanitizer 공식 문서
- [GitHub Actions: actions/checkout, actions/cache](https://github.com/actions)
- [GitLab CI/CD Reference](https://docs.gitlab.com/ee/ci/yaml/)
- [CMakePresets v6 Spec](https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html)

## 관련 항목

- [Ch 4: TSan으로 데이터 레이스 디버깅](/blog/tools/debugging/sanitizers/chapter04-tsan) — 이 장에서 별도 job으로 분리한 TSan 빌드의 내용
- [Ch 1: Sanitizer 종류 비교](/blog/tools/debugging/sanitizers/chapter01-intro) — 시리즈 출발점, 어떤 sanitizer를 켤지 결정
- [CMake Ch 6: 테스트와 CTest](/blog/tools/build/cmake/chapter06-testing) — sanitizer job이 호출하는 `ctest` 쪽 설정
- [Valgrind Ch 5: Suppression과 실무 운용](/blog/tools/debugging/valgrind/chapter05-suppressions) — 야간 빌드에서 Valgrind를 함께 돌릴 때의 CI 통합
- [Sanitizers wiki: SanitizerCommonFlags](https://github.com/google/sanitizers/wiki/SanitizerCommonFlags) — CI 환경 변수에 쓰는 공통 플래그 원문
- [GNU Make 시리즈](/blog/tools/build/gnu-make/chapter01-intro) — CMake를 안 쓰는 프로젝트에 같은 sanitizer 플래그를 붙일 때
