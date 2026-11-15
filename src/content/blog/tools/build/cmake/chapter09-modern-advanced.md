---
title: "Modern CMake 고급 — BUILD/INSTALL_INTERFACE·Presets·cmake -E"
slug: "tools/build/cmake/chapter09-modern-advanced"
date: 2026-06-02T09:09:00
description: "Modern CMake의 고급 도구 모음 — 자주 안 보이지만 실무에서 결정적인 기능들."
tags: [cmake, build, cpp, advanced, presets]
series: "CMake"
seriesOrder: 9
draft: false
topics: ["tools", "tools/build"]
---

## 이 장에서 다루는 것

[Ch 1](/blog/tools/build/cmake/chapter01-intro)~[Ch 8](/blog/tools/build/cmake/chapter08-best-practices)을 모두 마쳤다면 *실무에 쓸 만한 Modern CMake 프로젝트*를 만들 수 있습니다. 이 장은 *그 위에 올라가는* 고급 도구 모음입니다 — 매번 등장하진 않지만, *결정적인 자리*에서 쓰입니다.

- **`target_*` 패밀리 전체** — `target_sources` / `target_link_options` / `target_precompile_headers` / `set_target_properties` / `target_compile_features`
- **`BUILD_INTERFACE` vs `INSTALL_INTERFACE`** — 라이브러리의 두 얼굴
- **`add_custom_command` vs `add_custom_target`** — 코드 생성·후처리 도구
- **CMakePresets.json** — 빌드 설정의 표준 외부화 (3.19+)
- **`cmake -E`** — 크로스 플랫폼 셸 유틸리티

이 장은 *순차적 학습*이 아니라 *참조용*에 가깝습니다. 필요한 자리만 찾아 읽으면 됩니다.

실행 기준은 CMake 4.4.4·Ninja 1.13.2·macOS·AppleClang 21입니다. 마지막 예제는 정상 빌드, 변경 없는 재빌드, 입력 변경 후 재생성, 개인 프리셋 상속을 실제로 비교합니다. JSON 스키마 version 6과 최소 정책 기준은 CMake 3.25를 사용합니다.

---

## 커스텀 타겟 — `add_custom_command` vs `add_custom_target`

`add_executable`·`add_library`는 *컴파일러 기반*의 타겟을 만듭니다. 하지만 빌드 중에 *컴파일러가 아닌 도구*를 호출해야 할 때가 있습니다. 코드 생성기(protoc, yacc, swig), 셰이더 컴파일러, 문서 생성기(doxygen), 파일 변환기 등.

CMake는 이를 위해 두 가지 명령을 제공합니다 — `add_custom_command`와 `add_custom_target`. 둘은 *비슷해 보이지만 동작이 완전히 다릅니다*.

### `add_custom_command` — *파일을 만드는* 명령

```cmake
add_custom_command(
    OUTPUT  ${CMAKE_CURRENT_BINARY_DIR}/messages.pb.cc
            ${CMAKE_CURRENT_BINARY_DIR}/messages.pb.h
    COMMAND protoc --cpp_out=${CMAKE_CURRENT_BINARY_DIR}
                   --proto_path=${CMAKE_CURRENT_SOURCE_DIR}/proto
                   ${CMAKE_CURRENT_SOURCE_DIR}/proto/messages.proto
    DEPENDS ${CMAKE_CURRENT_SOURCE_DIR}/proto/messages.proto
    COMMENT "Generating messages.pb.{h,cc} from messages.proto"
)
```

핵심은 `OUTPUT`입니다. *이 명령이 생성하는 파일을 미리 알려 줍니다*. CMake는 이 파일을 *그 자체로는 빌드하지 않습니다*. 다른 타겟이 *이 OUTPUT 파일을 의존성으로 들고 있을 때만* 명령이 실행됩니다.

```cmake
add_executable(myapp
    src/main.cpp
    ${CMAKE_CURRENT_BINARY_DIR}/messages.pb.cc    # ← 이걸 소스로 추가
)
```

`myapp`이 `messages.pb.cc`를 소스로 가지므로, CMake는 *이 파일을 누가 만드는지* 찾아 `add_custom_command`의 `OUTPUT`을 발견하고 그 명령을 실행 단계에 추가합니다. `messages.proto`가 수정되면 `DEPENDS` 추적으로 *재생성*도 자동입니다.

요약: `add_custom_command(OUTPUT)`은 *Make의 일반 규칙*과 같은 모델입니다. "이 파일은 이 명령으로 만들어진다"를 선언하고, *누군가 그 파일을 필요로 할 때만* 실행됩니다.

### `add_custom_target` — *실행 동작*을 묶는 명령

```cmake
add_custom_target(docs
    COMMAND doxygen Doxyfile
    WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
    COMMENT "Generating API documentation"
)
```

이 타겟 자체에는 최신 여부를 판단할 OUTPUT 파일이 없습니다. 실행 명령이 파일을 만들 수는 있지만 타겟은 항상 오래된 것으로 취급합니다. Make의 `.PHONY` 타겟과 비슷한 역할입니다.

특징:

- *항상 out-of-date 상태*로 취급되어 호출할 때마다 실행됩니다.
- 다른 타겟의 *디폴트 빌드*에는 포함되지 않습니다(아래에서 다룸).
- 사용자가 직접 호출하거나 다른 타겟의 의존성에 포함되면 실행합니다.

### 두 명령의 *조합* — 가장 흔한 패턴

`add_custom_command(OUTPUT ...)`은 파일을 만들고, `add_custom_target`은 그 파일을 *디폴트 빌드에 포함*시킵니다.

```cmake
add_custom_command(
    OUTPUT "${CMAKE_CURRENT_BINARY_DIR}/version.h"
    COMMAND "${CMAKE_COMMAND}"
            "-DVERSION_FILE=${CMAKE_CURRENT_SOURCE_DIR}/VERSION"
            "-DOUTPUT_FILE=${CMAKE_CURRENT_BINARY_DIR}/version.h"
            -P "${CMAKE_CURRENT_SOURCE_DIR}/generate_version.cmake"
    DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/VERSION"
            "${CMAKE_CURRENT_SOURCE_DIR}/generate_version.cmake"
    VERBATIM
)

# 디폴트 빌드에 포함되도록 phony 타겟으로 묶기
add_custom_target(generate_version ALL
    DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/version.h
)
```

위 조각은 VERSION과 OUTPUT_FILE 인자를 처리하는 별도 생성 스크립트를 제공해야 합니다. `ALL`은 타겟을 기본 빌드에 연결하지만 OUTPUT을 매번 강제 재생성하지는 않습니다. 출력이 없거나 의존 입력이 더 새로울 때 출력 규칙을 실행합니다. 전체 실행 예제는 아래에서 외부 생성기 없이 제공합니다.

또는, 생성된 파일을 *직접 다른 타겟의 소스로* 넣는 게 더 깔끔할 때도 있습니다.

```cmake
add_executable(myapp
    src/main.cpp
    ${CMAKE_CURRENT_BINARY_DIR}/version.h    # 의존성 자동 연결
)
```

이 방식은 별도 `add_custom_target`이 필요 없고, `myapp`을 빌드할 때 *자동으로* `version.h`가 생성됩니다.

### 선택 기준

| 상황 | 선택 |
|------|-----|
| 컴파일러가 소비할 *파일을 만든다* | `add_custom_command(OUTPUT ...)` |
| 빌드 후 *정해진 동작*(테스트, 문서, 배포) | `add_custom_target` |
| 위 동작을 *디폴트 빌드*에 포함 | `add_custom_target(... ALL ...)` |
| 다른 타겟 빌드 *전/후*에 끼워 넣고 싶다 | `add_custom_command(TARGET ... POST_BUILD/PRE_BUILD ...)` |

마지막 `TARGET` 형태도 짧게 봅시다.

```cmake
add_custom_command(TARGET myapp POST_BUILD
    COMMAND ${CMAKE_STRIP} $<TARGET_FILE:myapp>
    COMMENT "Stripping debug symbols"
)
```

`myapp` 빌드가 끝난 *직후*에 자동으로 strip을 실행합니다. CI에서 산물 후처리(코드 사이닝, 압축, 카피)를 자동화할 때 자주 등장합니다.

---

## 모던 타겟 명령 — `target_*` 패밀리 전체

[Ch 3](/blog/tools/build/cmake/chapter03-targets)에서 본 `target_link_libraries`·`target_include_directories`·`target_compile_options`·`target_compile_definitions`·`target_compile_features` 다섯이 가장 자주 등장합니다. 그 외에도 *Modern CMake의 타겟 명령 패밀리*에는 몇 가지가 더 있습니다.

### `target_sources()` — 타겟에 소스 *추가*

```cmake
add_library(mylib)
target_sources(mylib PRIVATE
    src/main.cpp
    src/utils.cpp
)
```

`add_library()`나 `add_executable()` 시점에 *모든 소스를 다 알 필요 없이*, *나중에 추가*할 수 있습니다. 큰 프로젝트에서 모듈별 `add_subdirectory`가 *공통 라이브러리에 자기 소스를 더하는* 패턴이 자주 등장합니다.

```cmake
# 최상위
add_library(mylib)

# libs/math/CMakeLists.txt
target_sources(mylib PRIVATE sin.cpp cos.cpp)

# libs/string/CMakeLists.txt
target_sources(mylib PRIVATE format.cpp)
```

CMake 3.23+부터 *공개 헤더*도 `target_sources`로 등록할 수 있습니다.

```cmake
target_sources(mylib
    PUBLIC FILE_SET HEADERS
    BASE_DIRS include
    FILES include/mylib/api.hpp
)
```

설치에도 포함하려면 아래처럼 FILE_SET 설치 규칙을 명시합니다. BASE_DIRS 아래의 상대 구조가 보존됩니다. 헤더 목록을 등록하는 것만으로 설치되는 것은 아닙니다.

```cmake
install(TARGETS mylib FILE_SET HEADERS DESTINATION include)
```

### `target_link_options()` — 링커 옵션 (libraries와 다름)

```cmake
target_link_libraries(myapp PRIVATE pthread)   # 라이브러리 (-lpthread)
target_link_options(myapp PRIVATE -Wl,--as-needed)   # 링커 플래그
```

`target_link_libraries`는 *링크할 라이브러리*, `target_link_options`는 *링커에게 줄 옵션*. 자주 헷갈리는 자리입니다. `-flto`, `-static`, `-fuse-ld=lld`, `-Wl,-rpath,...` 같은 옵션은 *`target_link_options`*에 속합니다.

### `target_precompile_headers()` — PCH (3.16+)

```cmake
target_precompile_headers(myapp PRIVATE
    <vector>
    <string>
    <unordered_map>
    "common.hpp"
)
```

PCH는 자주 쓰는 헤더의 전처리·파싱 결과를 재사용하는 기능입니다. PUBLIC은 소비자에게 PCH용 헤더 목록을 전파하는 것이며, 이미 컴파일된 같은 PCH 산출물을 공유하는 뜻은 아닙니다. 산출물 재사용은 `target_precompile_headers(consumer REUSE_FROM producer)`라는 별도 형식입니다. 두 타겟의 컴파일 옵션·정의 등이 맞아야 합니다. [PCH 문서](https://cmake.org/cmake/help/v4.4/command/target_precompile_headers.html)의 전파와 재사용을 구분합니다.

성능 효과는 빌드 환경과 헤더 구성에 따라 측정합니다. 이 글은 PCH 시간 단축 수치나 REUSE_FROM 실행 결과를 제공하지 않습니다.

### `set_target_properties()` — 일반화된 속성 설정

```cmake
set_target_properties(mylib PROPERTIES
    VERSION 1.0.0
    SOVERSION 1
    POSITION_INDEPENDENT_CODE ON
    INTERPROCEDURAL_OPTIMIZATION TRUE
)
```

`target_*` 명령 카테고리에 *맞는 게 없는* 속성을 설정합니다. 대표적인 자리:

- `VERSION` / `SOVERSION` — 동적 라이브러리 ABI 버전.
- `POSITION_INDEPENDENT_CODE ON` — 해당 toolchain의 위치 독립 코드 생성 설정을 요청합니다. 모든 플랫폼에서 문자 그대로 -fPIC를 붙인다는 뜻은 아닙니다.
- `INTERPROCEDURAL_OPTIMIZATION TRUE` — LTO 켜기.
- `EXPORT_NAME` — export한 타겟의 이름 부분을 지정합니다. ALIAS 타겟을 만드는 명령과는 다릅니다.

`target_*` 명령으로 못하는 게 있으면 `set_target_properties`가 거의 답입니다.

### `target_compile_features` vs `set(CMAKE_CXX_STANDARD)`

```cmake
# 권장
target_compile_features(myapp PUBLIC cxx_std_17)

# 옛 방식 — 가능하면 피하세요
set(CMAKE_CXX_STANDARD 17)
```

`CMAKE_CXX_STANDARD`는 그 뒤 생성하는 타겟의 CXX_STANDARD 속성 기본값을 초기화합니다. 타겟 하나에만 국한되는 대입문은 아닙니다. 소비자에게 언어 수준을 전달하려면 라이브러리의 PUBLIC 또는 INTERFACE 컴파일 기능으로 요구사항을 명시합니다.

---

## `BUILD_INTERFACE` vs `INSTALL_INTERFACE` — 라이브러리의 두 얼굴

[Ch 7](/blog/tools/build/cmake/chapter07-install)에서 잠깐 본 이 두 제너레이터 식은 *라이브러리가 개발 중*인지 *설치된 후*인지에 따라 *다른 경로*를 사용하게 합니다.

```cmake
target_include_directories(mylib PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:include>
)
```

*같은 라이브러리, 두 상황.*

- **빌드 중** — `mylib`를 *바로 사용*하는 자매 타겟(같은 빌드의 `myapp` 등). `BUILD_INTERFACE`가 활성화되어 `/path/to/source/include`를 인클루드 경로로 받음.
- **설치 후** — `mylib`이 *설치되고* `find_package(MyLib)`로 가져온 외부 프로젝트. `INSTALL_INTERFACE`가 활성화되어 `/usr/local/include`를 받음.

소스 경로와 설치 경로가 다를 때 이 패턴을 사용합니다. FILE_SET이나 install의 INCLUDES DESTINATION처럼 헤더 사용 요구사항을 제공하는 다른 방법도 있습니다. 설치 결과와 소비자 검증은 [Ch 7의 완성 예제](/blog/tools/build/cmake/chapter07-install#실전-예시--설치한-라이브러리를-별도-프로젝트에서-사용하기)를 참고합니다.

### 헤더 설치와 함께 가는 표준 패턴

```cmake
include(GNUInstallDirs)
add_library(mylib src/mylib.cpp)

target_include_directories(mylib PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
)

install(TARGETS mylib EXPORT MyLibTargets
    INCLUDES DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
)
install(DIRECTORY include/ DESTINATION ${CMAKE_INSTALL_INCLUDEDIR})
```

`$<INSTALL_INTERFACE>`이 *INCLUDES DESTINATION*과 같은 경로를 가리키게 두면, 설치된 라이브러리를 가져오는 쪽에서 자동으로 올바른 헤더 경로가 잡힙니다.

---

## CMakePresets.json — 빌드 설정의 표준 외부화 (3.19+)

`-DCMAKE_BUILD_TYPE=Release -DENABLE_TESTS=OFF -G Ninja -DCMAKE_INSTALL_PREFIX=/opt/myapp` 같은 긴 명령어를 매번 치는 대신, *프리셋 파일*에 모아 둡니다.

```json
{
  "version": 6,
  "configurePresets": [
    {
      "name": "default",
      "generator": "Ninja",
      "binaryDir": "${sourceDir}/build/${presetName}",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Release",
        "CMAKE_INSTALL_PREFIX": "/opt/myapp"
      }
    },
    {
      "name": "debug",
      "inherits": "default",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Debug",
        "ENABLE_SANITIZERS": "ON"
      }
    }
  ],
  "buildPresets": [
    { "name": "default", "configurePreset": "default" },
    { "name": "debug", "configurePreset": "debug" }
  ],
  "testPresets": [
    { "name": "default", "configurePreset": "default", "output": { "verbosity": "verbose" } }
  ]
}
```

```bash
cmake --preset default
cmake --build --preset default
ctest --preset default
```

장점들:

- *VCS로 공유 가능*. 팀 전체가 같은 설정을 쓰게 됨.
- *IDE 1급 지원*. CLion·VS Code·Visual Studio 모두 프리셋을 자동 인식.
- *상속*. `inherits`로 공통 설정을 빼고 차이만 정의.
- *CI 일관성*. CI에서도 같은 프리셋을 호출.

`CMakeUserPresets.json`은 개인용이며 저장소에서 제외합니다. 두 파일에 같은 종류·같은 이름의 프리셋을 중복 정의하면 오류이며, User 파일이 공유 정의를 덮어쓰지 않습니다. 개인 설정은 새로운 이름을 만들고 공유 프리셋을 상속합니다. [프리셋 형식과 상속](https://cmake.org/cmake/help/v4.4/manual/cmake-presets.7.html#format)을 기준으로 구분합니다.

---

## `cmake -E` — 크로스 플랫폼 셸 유틸리티

CMake는 내부에 *셸 명령 대체*를 가지고 있습니다. `cmake -E <command>` 형태로 호출합니다.

```cmake
# 디렉터리 복사
add_custom_command(TARGET myapp POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory
            ${CMAKE_SOURCE_DIR}/assets
            $<TARGET_FILE_DIR:myapp>/assets
)

# 파일 복사
add_custom_command(...
    COMMAND ${CMAKE_COMMAND} -E copy file1.txt file2.txt
)

# 환경 변수와 함께 실행
add_custom_command(...
    COMMAND ${CMAKE_COMMAND} -E env LD_LIBRARY_PATH=/opt/lib ./myapp
)
```

자주 쓰는 서브명령:

| 명령 | 의미 |
|------|------|
| `copy` / `copy_if_different` / `copy_directory` | 파일 복사 |
| `make_directory` | `mkdir -p` |
| `remove` / `remove_directory` | 삭제 |
| `rename` | 이름 변경 |
| `chdir <dir> <cmd>` | 디렉터리 이동 후 실행 |
| `env [vars] <cmd>` | 환경 변수와 함께 실행 |
| `compare_files` | 두 파일 비교 |
| `create_symlink` | 심볼릭 링크 |
| `tar` | tar 압축/해제 |
| `time` | 명령 실행 시간 측정 |

복사·디렉터리 생성 같은 명령은 호스트 셸 명령에 대한 의존성을 줄입니다. 실행할 프로그램의 경로, 환경 변수의 의미, 심볼릭 링크 권한까지 같은 것은 아닙니다. 위 LD_LIBRARY_PATH 예제는 Linux 런타임 탐색을 위한 예이며 Windows에 그대로 적용하지 않습니다.

---

## 실전 예시 — 재생성과 개인 프리셋 검증

이 예제는 빌드 시 헤더를 복사해 생성하고, 입력 변경이 없으면 다시 실행하지 않습니다. 독립 커스텀 타겟 `ping`은 직접 호출할 때마다 실행합니다. 아래 세 소스 파일과 두 JSON 파일을 같은 디렉터리 아래에 저장합니다.

```cmake title="CMakeLists.txt"
cmake_minimum_required(VERSION 3.25)
project(AdvancedCheck LANGUAGES CXX)
set(GENERATED_DIR "${CMAKE_CURRENT_BINARY_DIR}/generated")
add_custom_command(OUTPUT "${GENERATED_DIR}/version.hpp"
    COMMAND "${CMAKE_COMMAND}" -E make_directory "${GENERATED_DIR}"
    COMMAND "${CMAKE_COMMAND}" -E copy_if_different
        "${CMAKE_CURRENT_SOURCE_DIR}/version.hpp.in" "${GENERATED_DIR}/version.hpp"
    DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/version.hpp.in"
    COMMENT "Generating version.hpp"
    VERBATIM)
add_executable(app main.cpp "${GENERATED_DIR}/version.hpp")
target_include_directories(app PRIVATE "${GENERATED_DIR}")
add_custom_target(ping COMMAND "${CMAKE_COMMAND}" -E echo PING VERBATIM)
```

입력 파일은 유효한 C++ 헤더입니다. 여기서는 복사 동작의 의존성만 확인하므로 템플릿 치환은 하지 않습니다.

```cpp title="version.hpp.in"
#pragma once
#define APP_VERSION "1.0.0"
```

실행 파일은 생성 헤더를 읽습니다.

```cpp title="main.cpp"
#include "version.hpp"
#include <iostream>
int main() { std::cout << "version=" << APP_VERSION << '\n'; }
```

공유 프리셋은 Debug 구성과 그 빌드 방법을 제공합니다.

```json title="CMakePresets.json"
{
  "version": 6,
  "configurePresets": [{
    "name": "debug",
    "generator": "Ninja",
    "binaryDir": "${sourceDir}/build/${presetName}",
    "cacheVariables": { "CMAKE_BUILD_TYPE": "Debug" }
  }],
  "buildPresets": [{ "name": "debug", "configurePreset": "debug" }]
}
```

개인 프리셋은 공유 프리셋을 상속하되 새 이름을 사용합니다. 이 파일은 로컬에서만 관리합니다.

```json title="CMakeUserPresets.json"
{
  "version": 6,
  "configurePresets": [{
    "name": "personal",
    "inherits": "debug",
    "cacheVariables": { "CMAKE_BUILD_TYPE": "Release" }
  }],
  "buildPresets": [{ "name": "personal", "configurePreset": "personal" }]
}
```

Ninja가 있는 macOS·Linux 셸에서 실행합니다.

```bash
cmake --list-presets
cmake --preset debug
cmake --build --preset debug
./build/debug/app
cmake --build --preset debug
cmake --build build/debug --target ping
cmake --build build/debug --target ping
cmake --preset personal
cmake --build --preset personal
./build/personal/app
```

첫 빌드에서 `Generating version.hpp`가 나타나고 프로그램은 `version=1.0.0`을 출력합니다. 변경 없는 두 번째 빌드는 다시 생성하지 않습니다. 두 번 호출한 ping은 각각 PING을 출력합니다. 입력의 버전을 2.0.0으로 바꾸고 다시 빌드하면 생성·컴파일이 다시 실행되고 프로그램도 `version=2.0.0`을 출력합니다.

개인 프리셋의 이름을 personal 대신 debug로 바꾸면 `cmake --list-presets`에서 Duplicate preset 오류가 나야 합니다. 이는 덮어쓰기가 아니라 중복 정의이므로, 개인 프리셋 이름을 원복하고 상속으로 차이를 표현합니다.

## 정리

이 장에서 본 다섯 가지 영역은 *기본 Modern CMake 학습 이후*에 자연스럽게 필요해지는 도구들입니다.

- **`target_*` 패밀리**: 5개 핵심 외에 `target_sources` / `target_link_options` / `target_precompile_headers` / `set_target_properties`까지 알면 거의 모든 타겟 설정이 가능.
- **`add_custom_command` vs `add_custom_target`**: 파일 생성 vs 동작 호출. 둘의 조합과 `TARGET POST_BUILD` 패턴.
- **`BUILD_INTERFACE` vs `INSTALL_INTERFACE`**: 라이브러리가 *빌드 중*과 *설치 후* 두 다른 경로를 가질 때 필수.
- **`CMakePresets.json`** (3.19+): 빌드 설정의 외부화. 팀·CI·IDE에서 같은 설정을 공유.
- **`cmake -E`**: 크로스 플랫폼 셸 유틸리티. Windows·Linux·macOS에서 같은 빌드 스크립트.

## 시리즈 마무리

CMake 시리즈는 여기서 마칩니다. Ch 1의 세 줄짜리 CMakeLists.txt에서 출발해 Modern CMake의 거의 모든 핵심 도구를 거쳤습니다.

다시 한 번 *핵심을 한 줄로* 요약합니다.

> Modern CMake는 *타겟에 모든 것을 붙이는 것*에서 시작해, *그 타겟을 잘 export하는 것*에서 끝난다.

이 두 축이 잡히면 — `target_*`로 타겟에 옵션·include·라이브러리·표준을 붙이고, `install(TARGETS ... EXPORT ...)`로 그 타겟을 다른 프로젝트가 쓸 수 있게 내보내는 것 — 그 사이의 모든 것이 자연스럽게 따라옵니다.

다음 단계로 권장:

- *큰 오픈소스 프로젝트의 CMakeLists.txt 읽기*. LLVM, Qt, KDE, Krita는 좋은 학습 대상.
- *FetchContent로 의존성 묶어 보기*. 한 번 해 보면 시스템 의존성 관리가 한결 단순해짐.
- *CMakePresets.json을 팀에 도입*. 처음 한 번 설정해 두면 그 뒤로 모두가 같은 빌드를 함.

## 참고 자료

- [CMake target_* commands reference](https://cmake.org/cmake/help/v4.4/manual/cmake-commands.7.html)
- [CMake Presets](https://cmake.org/cmake/help/v4.4/manual/cmake-presets.7.html)
- [Modern CMake — Henry Schreiner](https://cliutils.gitlab.io/modern-cmake/) — 가장 권장하는 자료
- [Professional CMake — Craig Scott](https://crascit.com/professional-cmake/) — 책

## 관련 항목

- [Ch 8: Modern CMake 베스트 프랙티스](/blog/tools/build/cmake/chapter08-best-practices) — 이 고급 도구들이 서 있는 설계 원칙
- [Ch 3: 타겟과 라이브러리](/blog/tools/build/cmake/chapter03-targets) — `target_*` 패밀리와 가시성 키워드의 기초
- [Ch 7: 설치와 패키징](/blog/tools/build/cmake/chapter07-install) — `INSTALL_INTERFACE`가 실제로 쓰이는 export 과정
- [GNU Make 규칙 분석](/blog/tools/build/gnu-make/chapter02-rules) — `add_custom_command`가 결국 만들어 내는 규칙과 레시피
- [add_custom_command](https://cmake.org/cmake/help/v4.4/command/add_custom_command.html) — 출력·의존성 인자의 공식 문서
