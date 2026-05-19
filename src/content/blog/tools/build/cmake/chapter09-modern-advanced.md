---
title: "Ch 9: Modern Advanced — target_* 패밀리, BUILD/INSTALL_INTERFACE, CMakePresets, cmake -E"
date: 2026-05-17T09:00:00
description: "Modern CMake의 고급 도구 모음 — 자주 안 보이지만 실무에서 결정적인 기능들."
tags: [cmake, build, cpp, advanced, presets]
series: "CMake"
seriesOrder: 9
draft: false
---

## 이 장에서 다루는 것

[Ch 1](/blog/tools/build/cmake/chapter01-intro)~[Ch 8](/blog/tools/build/cmake/chapter08-best-practices)을 모두 마쳤다면 *실무에 쓸 만한 Modern CMake 프로젝트*를 만들 수 있습니다. 이 장은 *그 위에 올라가는* 고급 도구 모음입니다 — 매번 등장하진 않지만, *결정적인 자리*에서 쓰입니다.

- **`target_*` 패밀리 전체** — `target_sources` / `target_link_options` / `target_precompile_headers` / `set_target_properties` / `target_compile_features`
- **`BUILD_INTERFACE` vs `INSTALL_INTERFACE`** — 라이브러리의 두 얼굴
- **`add_custom_command` vs `add_custom_target`** — 코드 생성·후처리 도구
- **CMakePresets.json** — 빌드 설정의 표준 외부화 (3.19+)
- **`cmake -E`** — 크로스 플랫폼 셸 유틸리티

이 장은 *순차적 학습*이 아니라 *참조용*에 가깝습니다. 필요한 자리만 찾아 읽으면 됩니다.

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

이건 *파일을 만들지 않습니다*. *동작 그 자체에 이름을 붙이는* 명령입니다. Make의 `.PHONY` 타겟과 같은 개념.

특징:

- *항상 out-of-date 상태*로 취급되어 호출할 때마다 실행됩니다.
- 다른 타겟의 *디폴트 빌드*에는 포함되지 않습니다(아래에서 다룸).
- 사용자가 `cmake --build build --target docs`로 *명시적으로* 호출해야 돕니다.

### 두 명령의 *조합* — 가장 흔한 패턴

`add_custom_command(OUTPUT ...)`은 파일을 만들고, `add_custom_target`은 그 파일을 *디폴트 빌드에 포함*시킵니다.

```cmake
add_custom_command(
    OUTPUT  ${CMAKE_CURRENT_BINARY_DIR}/version.h
    COMMAND ${CMAKE_COMMAND} -P generate_version.cmake
    DEPENDS ${CMAKE_CURRENT_SOURCE_DIR}/VERSION
)

# 디폴트 빌드에 포함되도록 phony 타겟으로 묶기
add_custom_target(generate_version ALL
    DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/version.h
)
```

`ALL` 키워드가 핵심입니다. `add_custom_target(... ALL ...)`은 *디폴트 빌드 시 자동 호출*되어, 의존성으로 묶인 `add_custom_command`의 OUTPUT을 강제로 만들게 합니다.

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
target_sources(mylib PRIVATE math/sin.cpp math/cos.cpp)

# libs/string/CMakeLists.txt
target_sources(mylib PRIVATE string/format.cpp)
```

CMake 3.23+부터 *공개 헤더*도 `target_sources`로 등록할 수 있습니다.

```cmake
target_sources(mylib
    PUBLIC FILE_SET HEADERS
    BASE_DIRS include
    FILES include/mylib/api.hpp
)
```

이 모델의 장점은 *설치 시* 자동으로 BASE_DIRS 구조가 보존됩니다.

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

PCH(Precompiled Headers)로 표준 라이브러리·자주 쓰는 헤더의 *컴파일을 한 번만* 합니다. 큰 프로젝트에서 빌드 시간을 *수십 퍼센트* 줄일 수 있습니다. PUBLIC으로 설정하면 의존 타겟도 같은 PCH를 공유합니다.

함정: *모든 .cpp가 같은 PCH를 강제 include*한다는 점. ABI나 매크로가 다른 라이브러리를 섞기 어려워질 수 있어, 정말 *큰* 프로젝트에만 권장됩니다.

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
- `POSITION_INDEPENDENT_CODE ON` — `-fPIC` 강제 (정적 라이브러리에도).
- `INTERPROCEDURAL_OPTIMIZATION TRUE` — LTO 켜기.
- `EXPORT_NAME` — install(EXPORT)로 내보낼 때 사용할 별칭.

`target_*` 명령으로 못하는 게 있으면 `set_target_properties`가 거의 답입니다.

### `target_compile_features` vs `set(CMAKE_CXX_STANDARD)`

```cmake
# 권장
target_compile_features(myapp PUBLIC cxx_std_17)

# 옛 방식 — 가능하면 피하세요
set(CMAKE_CXX_STANDARD 17)
```

차이는 *전이성*입니다. `target_compile_features(... PUBLIC ...)`은 *이 타겟을 사용하는 다른 타겟에도 같은 표준을 요구*합니다. `CMAKE_CXX_STANDARD`는 *그 자리에서만* 동작하고 전이되지 않습니다. 라이브러리를 만들 때는 거의 항상 `target_compile_features`가 답입니다.

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

두 자리에서 헤더 위치가 다르므로 이 분기가 필요합니다. *모든 라이브러리 프로젝트*가 이 패턴을 씁니다. 빼면 설치된 라이브러리를 다른 프로젝트에서 못 씁니다.

### 헤더 설치와 함께 가는 표준 패턴

```cmake
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

`CMakeUserPresets.json`은 개인용 (gitignore 대상)이고, `CMakePresets.json`은 공유용입니다. 두 파일이 함께 있으면 user가 덮어씁니다.

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

플랫폼에 무관하므로 *Windows에서도 동작합니다*. 셸 명령(`cp`, `mv`, `rm`)을 직접 호출하면 윈도우에서 깨지지만, `${CMAKE_COMMAND} -E`는 어디서나 동작합니다. *크로스 플랫폼 빌드 스크립트*에서 거의 필수입니다.

---

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

- [CMake target_* commands reference](https://cmake.org/cmake/help/latest/manual/cmake-commands.7.html)
- [CMake Presets](https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html)
- [Modern CMake — Henry Schreiner](https://cliutils.gitlab.io/modern-cmake/) — 가장 권장하는 자료
- [Professional CMake — Craig Scott](https://crascit.com/professional-cmake/) — 책

## 관련 시리즈

- [GNU Make](/blog/tools/build/gnu-make/chapter01-intro) — CMake가 생성하는 빌드 파일의 기본 모델
