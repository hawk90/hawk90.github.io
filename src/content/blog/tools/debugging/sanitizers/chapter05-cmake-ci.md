---
title: "Ch 5: CMake와 CI 통합"
date: 2026-05-17T05:00:00
description: "Sanitizer 빌드를 프로젝트에 자연스럽게 통합 — CMake 옵션, GitHub Actions, GitLab CI 실전 예시."
tags: [Sanitizer, CMake, CI, GitHub Actions, GitLab, Debugging]
series: "Sanitizers"
seriesOrder: 5
draft: false
---

## 이 장의 목표

[Ch 1](/blog/tools/debugging/sanitizers/chapter01-intro)~[Ch 4](/blog/tools/debugging/sanitizers/chapter04-tsan)에서 Sanitizer를 *손으로 켜는 방법*을 봤습니다. 실무에서는 이걸 *프로젝트에 자연스럽게 통합*해 *PR마다 자동으로* 돌게 만들어야 합니다.

이 장은 두 가지 통합 시나리오를 다룹니다.

1. **CMake 프로젝트** — `cmake -DENABLE_SANITIZERS=ON`으로 한 줄에 켜기.
2. **CI 파이프라인** — GitHub Actions와 GitLab CI에 sanitizer job 추가.

마지막에 *예시 템플릿*을 한 자리에 모읍니다.

---

## CMake 통합 — 기본 패턴

가장 단순한 통합부터.

```cmake
# CMakeLists.txt
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

이 패턴이 *작은 프로젝트*에 충분합니다. ASan/TSan/UBSan을 *옵션 한 줄로* 켜고 끌 수 있고, 둘 동시 활성화를 방지합니다.

---

## CMake 통합 — 함수로 추상화

큰 프로젝트에서는 *함수로 묶어* 재사용합니다. 여러 타겟에 sanitizer 옵션을 일관되게 적용할 때 깔끔합니다.

```cmake
# cmake/Sanitizers.cmake

function(enable_sanitizers target)
    if(NOT CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
        return()
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
            message(WARNING "MSan requires Clang — disabling")
            return()
        endif()
        list(APPEND sanitizers "memory")
    endif()

    if(sanitizers)
        list(JOIN sanitizers "," sanitizers_str)
        target_compile_options(${target} PRIVATE
            -fsanitize=${sanitizers_str}
            -fno-omit-frame-pointer
            -g -O1
        )
        target_link_options(${target} PRIVATE
            -fsanitize=${sanitizers_str}
        )
    endif()
endfunction()
```

```cmake
# 메인 CMakeLists.txt
include(cmake/Sanitizers.cmake)

option(ENABLE_ASAN "Enable ASan + UBSan" OFF)
option(ENABLE_TSAN "Enable ThreadSanitizer" OFF)
option(ENABLE_MSAN "Enable MemorySanitizer (Clang)" OFF)

add_executable(myapp ${SRCS})
enable_sanitizers(myapp)

add_executable(test_runner ${TEST_SRCS})
enable_sanitizers(test_runner)
```

이 함수의 좋은 점:
1. *컴파일러 검사* — MSVC에서는 자동 skip.
2. *MSan은 Clang 전용* 자동 검사.
3. *모순된 조합* 사전 차단.
4. *타겟 단위 적용* — 어떤 타겟에 sanitizer를 적용할지 명시적.

### CMakePresets로 더 깔끔하게

CMake 3.19+에서는 *프리셋*으로 빌드 모드를 묶을 수 있습니다([Ch 9](/blog/tools/build/cmake/chapter09-modern-advanced#cmakepresetsjson--빌드-설정의-표준-외부화-319)).

```json
{
  "version": 6,
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

`environment` 섹션에 *sanitizer 환경 변수까지 박아 두기* 때문에, 매번 export할 필요가 없습니다. *팀이 같은 설정으로 작업*하는 것이 자동 보장됩니다.

---

## GitHub Actions — 실전 워크플로

가장 기본적인 패턴부터 보겠습니다.

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
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y cmake ninja-build llvm

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
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y cmake ninja-build llvm

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

1. **두 job 병렬 실행** — ASan과 TSan은 별도 워크플로 job. 호환되지 않아 한 빌드에 못 합침.
2. **환경 변수 명시** — `halt_on_error=1`로 첫 에러에서 종료, *반드시 비-0 종료 코드*로 CI 실패 트리거.
3. **심볼라이저 경로** — Ubuntu의 `/usr/bin/llvm-symbolizer`. 없으면 주소만 보임.
4. **`llvm` 패키지** 설치 — `llvm-symbolizer`가 여기 들어 있음.

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

Sanitizer 빌드는 *컴파일이 1.5배 정도 느려서* 캐시 효과가 큽니다. *CMakeLists.txt 변경 없는 PR*은 캐시를 그대로 재사용해 빌드 시간을 절약.

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

10번 중 한 번이라도 실패하면 CI 전체가 실패. 데이터 레이스의 *비결정적 본성*을 극복합니다.

---

## GitLab CI — 동일 패턴

GitLab은 YAML 구조가 GitHub Actions와 약간 다릅니다.

```yaml
# .gitlab-ci.yml
stages:
  - test

.sanitizer_template: &sanitizer_template
  stage: test
  image: ubuntu:22.04
  before_script:
    - apt-get update
    - apt-get install -y cmake ninja-build llvm
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

여러 컴파일러와 OS에서 *모두 sanitizer가 통과해야* 안전합니다. GitHub Actions에서는 매트릭스로 한 줄.

```yaml
asan-ubsan:
  strategy:
    fail-fast: false
    matrix:
      os: [ubuntu-22.04, macos-14]
      compiler: [gcc, clang]
  runs-on: ${{ matrix.os }}
  steps:
    - uses: actions/checkout@v4
    - name: Set up compiler
      run: |
        if [ "${{ matrix.compiler }}" = "gcc" ]; then
          echo "CC=gcc" >> $GITHUB_ENV
          echo "CXX=g++" >> $GITHUB_ENV
        else
          echo "CC=clang" >> $GITHUB_ENV
          echo "CXX=clang++" >> $GITHUB_ENV
        fi
    - name: Configure
      run: cmake --preset asan
    - name: Build
      run: cmake --build --preset asan
    - name: Test
      env:
        ASAN_OPTIONS: halt_on_error=1:abort_on_error=1
      run: ctest --preset asan
```

`fail-fast: false`로 *한 조합이 실패해도 나머지가 끝까지* 돌아 *어디서 깨지는지* 한눈에 봅니다.

---

## 실패 진단 — *Sanitizer가 깼을 때*

CI에서 sanitizer가 깨지면 보통 다음 단계로 진단합니다.

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

`abort_on_error=1`이 *디버거에서 잡기 핵심*입니다. `exit()`는 디버거가 못 잡고, `abort()`는 잡습니다.

---

## 자주 만나는 CI 문제들

### "Sanitizer가 동작하는데 줄 번호가 안 나옴"

```
#0 0x4012a3 in main
#1 0x401aef in __libc_start_main
```

**원인**: `llvm-symbolizer` 또는 `addr2line`이 PATH에 없음.

**해결**: 패키지 설치 + 환경 변수.
```yaml
- name: Install symbolizer
  run: sudo apt-get install -y llvm

env:
  ASAN_SYMBOLIZER_PATH: /usr/bin/llvm-symbolizer
```

### "ASan + UBSan 빌드가 너무 느려"

**원인**: 큰 코드베이스에서 sanitizer 빌드는 1.5~2배 컴파일 시간이 걸립니다.

**해결**:
1. **Ninja 사용** — Make보다 빠른 빌드.
2. **빌드 캐시** — `actions/cache`로 incremental.
3. **테스트 범위 축소** — `ctest -L unit`으로 단위 테스트만 빠르게.

### "TSan이 false positive 너무 많아"

**원인**: 외부 라이브러리 / 사용자 모드 동기화 / lock-free 알고리즘.

**해결**:
1. *Suppression 파일* 작성 — 외부 라이브러리 무시.
2. *TSan annotation* — `__tsan_acquire()`, `__tsan_release()`로 직접 happens-before 알려 주기.
3. *PR 빌드 제외* — TSan은 야간 빌드로 이동.

### "macOS에서 detect_leaks가 안 됨"

**원인**: macOS는 LSan 기본 OFF.

**해결**: 환경 변수 명시.
```yaml
env:
  ASAN_OPTIONS: detect_leaks=1:halt_on_error=1
```

---

## 권장 운영 모델

규모별 권장 설정.

### 소규모 프로젝트 (소스 < 50KLoC)

- PR 빌드: **ASan + UBSan** 한 작업.
- 메인 브랜치: **TSan** 한 번 더 (멀티스레드면).
- 매트릭스: **GCC + Clang** × **Ubuntu** 한 OS.
- 전체 CI 시간: ~5~10분.

### 중규모 (50~500KLoC)

- PR 빌드: **ASan + UBSan** + 빠른 단위 테스트만.
- 메인 브랜치: **ASan + UBSan** 전체 + **TSan** 작은 시나리오.
- 야간: **TSan** 전체 + **MSan** (Clang 가능 시).
- 매트릭스: **GCC + Clang** × **Ubuntu + macOS**.
- 전체 CI 시간: PR ~15분, 야간 ~1시간.

### 대규모 (500KLoC+)

- PR 빌드: **ASan + UBSan** 작은 변경분 영향 테스트만.
- 메인 브랜치: 일부 추출된 *대표 테스트*.
- 야간: 전체 매트릭스 (ASan / TSan / MSan / 다양한 컴파일러).
- 별도 *fuzzer + sanitizer* 워크플로 — *OSS-Fuzz* 같은 외부 서비스.

큰 프로젝트일수록 *sanitizer를 빌드 인프라의 일부로* 다루게 됩니다. 단순한 옵션이 아니라 *별도 빌드 파이프라인*.

---

## 정리

- CMake 통합: `option()`으로 sanitizer 빌드 모드, 함수로 추상화.
- `CMakePresets.json`으로 *설정·환경 변수까지* 외부화.
- GitHub Actions / GitLab CI 모두 *별도 job*으로 ASan과 TSan 분리.
- 환경 변수: `halt_on_error=1`, `abort_on_error=1`, `SYMBOLIZER_PATH` 명시.
- 매트릭스 (OS × 컴파일러) + `fail-fast: false`로 *어디서 깨지는지* 한눈에.
- 진단 — CI 출력 → 로컬 재현 → 단일 테스트 → 디버거.
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

Sanitizer는 *컴파일러 한 옵션*으로 *수많은 런타임 버그를 잡는* 강력한 도구입니다. 도입 비용은 거의 0(`-fsanitize=address,undefined` 한 줄), 효과는 *수년 동안 잠재된 버그를 즉시 드러내는* 수준.

도입 순서:
1. **로컬 개발 빌드에 ASan + UBSan** — 오늘 추가.
2. **단위 테스트에 ASan** — 이번 주 안에.
3. **PR CI에 ASan + UBSan** — 다음 PR 사이클부터.
4. **멀티스레드면 TSan** — 동시성 코드 추가 시.

[Valgrind 시리즈](/blog/tools/debugging/valgrind/chapter01-intro)는 *sanitizer가 닿지 못하는 자리* — 재컴파일 불가 바이너리, 시스템 호출 추적 — 를 보완합니다.

## 참고 자료

- [Google Sanitizers Wiki](https://github.com/google/sanitizers/wiki)
- [Clang Sanitizer Manuals](https://clang.llvm.org/docs/index.html#using-clang-as-a-library) — 각 sanitizer 공식 문서
- [GitHub Actions: actions/checkout, actions/cache](https://github.com/actions)
- [GitLab CI/CD Reference](https://docs.gitlab.com/ee/ci/yaml/)
- [CMakePresets v6 Spec](https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html)

## 관련 시리즈

- [Valgrind](/blog/tools/debugging/valgrind/chapter01-intro) — sanitizer 보완
- [CMake](/blog/tools/build/cmake/chapter01-intro) — 빌드 통합 기초
- [GNU Make](/blog/tools/build/gnu-make/chapter01-intro) — 더 단순한 빌드
