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

이 기본 조각은 컴파일러·런타임 지원을 사전에 확인한 작은 프로젝트용입니다. 완성된 검증 예제는 아래 함수형 구성을 사용합니다. ASan/TSan/UBSan을 *옵션 한 줄로* 켜고 끌 수 있고, 둘 동시 활성화를 방지합니다.

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

옵션을 요청했는데 지원하지 않으면 조용히 끄지 않고 구성 실패로 알립니다. compile/link probe는 런타임 기동이나 종속 라이브러리 전체의 MSan 계측까지 검증하지 않습니다. 정적 라이브러리는 자체 링크 단계가 없으므로 필요한 런타임 링크 옵션을 소비자에게 전달합니다.

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

`environment` 섹션에 *sanitizer 환경 변수까지 박아 두기* 때문에, 매번 export할 필요가 없습니다. build/test preset의 configurePreset 환경 상속을 통해 이 명령 경로에서 공유합니다. 직접 바이너리를 실행하는 셸의 환경이나 모든 개발 도구 설정까지 강제하지는 않습니다.

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

캐시의 실제 이득은 측정합니다. 이 예시는 캐시 형식 설명용이며 컴파일러·버전·플래그·의존성·생성기까지 키에 포함할지 검토합니다. CMakeLists.txt가 같다는 이유만으로 환경 호환성이 보장되지는 않습니다.

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

10번 중 한 번이라도 실패하면 CI 전체가 실패. 실행 경로와 스케줄의 표본을 늘리지만 모든 레이스를 찾았다는 증명은 아닙니다.

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

지원되는 OS·컴파일러 조합을 명시적으로 선택합니다. macOS의 gcc 명령이 GNU GCC라는 보장은 없으므로 명령 이름만 바꾼 곱집합을 만들지 않습니다. 아래는 GitHub 호스팅 러너용 구성 예시이며 원격 CI 실행을 검증한 기록은 아닙니다.

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
    - run: cmake --preset asan
    - run: cmake --build --preset asan
    - run: ctest --preset asan
```

선택한 러너에 필요한 도구를 설치하고 런타임을 먼저 확인합니다. fail-fast: false는 한 조합 실패 뒤에도 나머지 결과를 수집하는 설정입니다. leak 검사는 특히 배포 런타임의 지원 여부를 확인합니다.

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

`abort_on_error=1`이 *디버거에서 잡기 핵심*입니다. 디버거에서 SIGABRT에 중단하도록 설정할 수 있습니다. exit 경로도 breakpoint 등으로 조사할 수 있으므로 디버거가 잡지 못한다고 단정하지 않습니다.

---

## 자주 만나는 CI 문제들

### "Sanitizer가 동작하는데 줄 번호가 안 나옴"

```text
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

**확인**: 컴파일·링크·테스트 시간을 나누어 측정하고 병목을 확인합니다. 고정된 배율을 가정하지 않습니다.

**해결**:
1. **생성기·병렬도 확인** — 해당 프로젝트에서 Ninja와 Make의 실제 소요 시간을 비교합니다.
2. **빌드 캐시** — `actions/cache`로 incremental.
3. **테스트 범위 축소** — `ctest -L unit`으로 단위 테스트만 빠르게.

### "TSan이 false positive 너무 많아"

**원인**: 외부 라이브러리 / 사용자 모드 동기화 / lock-free 알고리즘.

**해결**:
1. *Suppression 파일* 작성 — 외부 라이브러리 무시.
2. *TSan annotation* — `__tsan_acquire()`, `__tsan_release()`로 직접 happens-before 알려 주기.
3. *PR 빌드 제외* — TSan은 야간 빌드로 이동.

### "macOS에서 detect_leaks가 안 됨"

**확인**: detect_leaks 설정뿐 아니라 선택한 컴파일러의 compiler-rt가 해당 타깃에서 LSan을 지원하는지 확인합니다. Apple Clang과 Homebrew LLVM을 구분합니다.

**설정 예**: 지원 런타임에서 환경 변수를 명시합니다.
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
- CI 시간은 실제 테스트 데이터와 러너에서 측정합니다.

### 중규모 (50~500KLoC)

- PR 빌드: **ASan + UBSan** + 빠른 단위 테스트만.
- 메인 브랜치: **ASan + UBSan** 전체 + **TSan** 작은 시나리오.
- 야간: **TSan** 전체 + **MSan** (Clang 가능 시).
- 매트릭스: **GCC + Clang** × **Ubuntu + macOS**.
- PR·야간의 실행 예산은 실제 측정에 맞춰 정합니다.

### 대규모 (500KLoC+)

- PR 빌드: **ASan + UBSan** 작은 변경분 영향 테스트만.
- 메인 브랜치: 일부 추출된 *대표 테스트*.
- 야간: 전체 매트릭스 (ASan / TSan / MSan / 다양한 컴파일러).
- 별도 *fuzzer + sanitizer* 워크플로 — *OSS-Fuzz* 같은 외부 서비스.

큰 프로젝트일수록 *sanitizer를 빌드 인프라의 일부로* 다루게 됩니다. 단순한 옵션이 아니라 *별도 빌드 파이프라인*.

---

## 직접 확인한 범위

위 명명된 파일을 추출해 CMake 4.4.4·Ninja·macOS·Homebrew Clang 23.1.3에서 release, ASan+UBSan, TSan+UBSan 구성·빌드·CTest를 각각 확인합니다. ASan+TSan 동시 요청과 이 예제의 macOS MSan 요청은 구성 실패를 기대합니다. 정적 라이브러리만 계측한 별도 소비자 링크도 확인합니다. 실제 GitHub/GitLab job, Linux MSan 종속 환경, 여러 러너의 결과는 로컬 빌드로 대체하지 않습니다.

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

Sanitizer는 *컴파일러 한 옵션*으로 *수많은 런타임 버그를 잡는* 강력한 도구입니다. 한 옵션으로 시작할 수 있어도 종속 라이브러리·플랫폼·테스트 비용을 확인해야 합니다. 탐지 범위는 선택한 검사와 실제 실행한 경로에 의존합니다.

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
