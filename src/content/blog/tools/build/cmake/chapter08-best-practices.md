---
title: "Modern CMake 베스트 프랙티스 — target_* 중심 설계"
slug: "tools/build/cmake/chapter08-best-practices"
date: 2026-06-02T09:08:00
description: "타겟 중심 접근법, 피해야 할 안티패턴, 대규모 프로젝트 구성 전략."
tags: [cmake, build, cpp, best-practices]
series: "CMake"
seriesOrder: 8
draft: false
topics: ["tools", "tools/build"]
---

## 왜 베스트 프랙티스가 필요한가

CMake에서는 같은 설정을 디렉터리 명령, 전역 플래그 변수, 타겟 속성 등 여러 방식으로 표현합니다. 선택 기준은 문법이 오래됐는지가 아니라 다른 타겟과 소비자에게 어떤 설정이 전달되는지입니다. 이 장은 서브프로젝트로 포함했을 때도 의도한 범위를 유지하는 데 초점을 둡니다.

다음 코드를 봅시다.

```cmake
# 과거 프로젝트의 형태. CMake 4.x 실행용이 아님
cmake_minimum_required(VERSION 2.8)
project(MyApp)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -std=c++11")
include_directories(include)
link_directories(/opt/libs)
add_definitions(-DUSE_FOO)

file(GLOB SRCS src/*.cpp)
add_executable(myapp ${SRCS})
target_link_libraries(myapp foo bar)
```

CMake 4.x는 최소 정책 버전 3.5 미만의 호환성을 제거했으므로 위 예제는 그대로 구성되지 않습니다. 4.5.0에서는 첫 명령에서 `Compatibility with CMake < 3.5 has been removed from CMake.`로 멈춥니다. 그런데 `VERSION`만 3.25로 올리면 구성은 되지만 아래 네 문제는 그대로 남습니다. 이 글의 실행 결과는 모두 CMake 4.5.0·Ninja 1.13.2·macOS 27.2·AppleClang 21에서 나왔습니다.

1. **전역 오염**. `include_directories()`·`add_definitions()`가 *그 디렉터리의 모든 타겟*에 영향을 줍니다. 라이브러리 A와 B가 같은 매크로를 강제로 받습니다.
2. **플래그 문자열 조작**. `CMAKE_CXX_FLAGS`를 직접 합치면 CMake가 따로 붙이는 플래그와 섞입니다. 위처럼 `-std=c++11`을 넣은 뒤 타겟에 `cxx_std_17`을 요구하면, 컴파일 명령은 `/usr/bin/c++ -Wall -std=c++11 -std=gnu++17 ...`이 되어 뒤의 옵션이 이깁니다. 같은 `-std=c++11`은 링크 명령에도 들어갔습니다. 어느 줄이 어떤 플래그를 넣었는지 명령만 봐서는 알 수 없습니다.
3. **암묵 의존성**. `link_directories()`로 경로만 알려 주고 어떤 라이브러리를 쓰는지 *명시 안 합니다*. 의존성 그래프가 보이지 않습니다.
4. **`file(GLOB)`의 함정**. 새 소스 파일을 추가해도 CMake가 *알아채지 못합니다*. 재구성을 강제로 하지 않으면 빌드에 빠집니다.

Modern CMake는 이 모두를 *타겟 중심* 모델로 해결합니다. 이 챕터는 그 모델을 새 프로젝트의 템플릿으로 쓸 수 있는 형태로 정리합니다.

| Old CMake (전역 중심) | Modern CMake (타겟 중심) |
|---|---|
| `include_directories()` | `target_include_directories()` |
| `add_definitions()` | `target_compile_definitions()` |
| `add_compile_options()` | `target_compile_options()` |
| `link_directories()` | `target_link_libraries()` |
| `CMAKE_CXX_FLAGS` | `target_compile_features()` |
| 전역 변수 조작 (모든 타겟에 영향) | 타겟 속성 + 전파 키워드 (선택적 전파) |

---

## 타겟 중심 접근법

### 기본 원칙

Modern CMake에서 **타겟**은 빌드의 기본 단위입니다. 실행 파일, 라이브러리, 인터페이스 모두 타겟입니다. 모든 설정은 타겟에 연결합니다.

```cmake
# Modern (권장)
target_compile_options(myapp PRIVATE -Wall)
target_include_directories(myapp PRIVATE include)
target_link_libraries(myapp PRIVATE mylib)

# Old (회피)
add_compile_options(-Wall)        # 모든 타겟에 영향
include_directories(include)      # 모든 타겟에 영향
link_libraries(mylib)             # 모든 타겟에 영향
```

### 속성 전파

타겟 명령의 핵심은 **전파 키워드**입니다. `PRIVATE`, `PUBLIC`, `INTERFACE`로 속성이 어디까지 전파되는지 제어합니다.

```cmake
add_library(mylib src/mylib.cpp)
target_include_directories(mylib PUBLIC include)      # 사용측에도 전파
target_include_directories(mylib PRIVATE src)         # mylib 빌드에만 사용
target_compile_definitions(mylib PUBLIC USE_MYLIB)    # 사용측에도 전파

add_executable(myapp src/main.cpp)
target_link_libraries(myapp PRIVATE mylib)
# myapp은 자동으로:
# - include 경로를 얻음 (PUBLIC이므로)
# - USE_MYLIB 정의를 얻음 (PUBLIC이므로)
# - src 경로는 안 얻음 (PRIVATE이므로)
```

**속성 전파 흐름**

- `mylib` (라이브러리)
  - `PRIVATE: src/` → mylib 빌드에만 사용
  - `PUBLIC: include/` → mylib + 사용측
  - `PUBLIC: -DUSE_MYLIB` → mylib + 사용측
- `myapp` (실행 파일, `mylib`에 링크) → 자동으로 `include/`, `-DUSE_MYLIB` 상속

### INTERFACE 타겟

헤더 전용 라이브러리나 설정 전용 타겟에 사용합니다. 컴파일할 소스가 없어도 타겟을 만들 수 있습니다.

```cmake
# 헤더 전용 라이브러리
add_library(myheaders INTERFACE)
target_include_directories(myheaders INTERFACE include)
target_compile_features(myheaders INTERFACE cxx_std_17)

# 컴파일 설정 모음
add_library(mywarnings INTERFACE)
target_compile_options(mywarnings INTERFACE
    "$<$<CXX_COMPILER_ID:GNU,Clang,AppleClang>:-Wall;-Wextra;-Wpedantic>"
    $<$<CXX_COMPILER_ID:MSVC>:/W4>
)

# 사용
target_link_libraries(myapp PRIVATE myheaders mywarnings)
```

---

## 피해야 할 안티패턴

### 전역 설정

전역 명령은 같은 디렉터리와 그 뒤에 추가한 하위 디렉터리의 모든 타겟에 영향을 미칩니다. 최상위에 `include_directories(${CMAKE_SOURCE_DIR}/include)`·`add_definitions(-DUSE_FOO)`·`add_compile_options(-Werror)`를 두고 `add_subdirectory(third_party/zlibish)`로 서드파티 라이브러리를 넣으면, 그 라이브러리의 컴파일 명령이 이렇게 됩니다.

```text
/usr/bin/c++ -DUSE_FOO -I<src>/include -arch arm64 -Werror ... -c <src>/third_party/zlibish/z.cpp
```

서드파티 코드가 내 매크로를 받고, 내 프로젝트의 경고 정책 때문에 남의 코드가 빌드 실패할 수 있는 상태가 됩니다.

```cmake
# ❌ Bad — 전역 오염
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall")
include_directories(${CMAKE_SOURCE_DIR}/include)
link_directories(/opt/libs)
add_definitions(-DUSE_FOO)

# ✓ Good — 타겟 격리
target_compile_options(myapp PRIVATE -Wall)
target_include_directories(myapp PRIVATE include)
target_link_libraries(myapp PRIVATE /opt/libs/libfoo.so)
target_compile_definitions(myapp PRIVATE USE_FOO)
```

### `file(GLOB)`의 함정과 `CONFIGURE_DEPENDS`

```cmake
# ❌ Bad — 새 파일 추가 시 CMake가 자동 감지 못함
file(GLOB SRCS src/*.cpp)
add_executable(myapp ${SRCS})

# ✓ Good — 명시적 나열 (파일 추가 시 CMakeLists.txt 수정)
add_executable(myapp
    src/main.cpp
    src/utils.cpp
    src/config.cpp
)
```

`file(GLOB)`이 *왜 문제인지*를 정확히 짚어 봅니다. 이 명령은 *CMake 구성 시점*에 디렉터리를 한 번 보고 *그때의 파일 목록*을 변수에 저장합니다. 빌드 단계는 이미 결정된 변수만 사용합니다. 즉:

1. `cmake -B build`로 구성 — 그때의 `*.cpp` 목록이 잠깁니다.
2. 개발자가 `new_module.cpp`를 추가.
3. `cmake --build build`로 빌드 — *새 파일을 모름*. 4.5.0·Ninja에서 이 단계의 출력은 `ninja: no work to do.` 한 줄이었습니다.
4. 알아채려면 `cmake -B build`를 다시 돌려 *재구성*해야 함.

명시적 목록을 수정하면 CMakeLists.txt 변경으로 재구성됩니다. 새 파일을 목록에 추가하는 것을 잊을 가능성까지 없애 주는 것은 아닙니다. 대신 코드 리뷰에서 빌드 입력의 추가·삭제를 함께 확인할 수 있습니다.

**`CONFIGURE_DEPENDS` (CMake 3.12+)** — *file(GLOB)을 그래도 쓰고 싶을 때*

```cmake
file(GLOB SRCS CONFIGURE_DEPENDS src/*.cpp)
```

이 옵션을 켜면 CMake가 *매 빌드마다 디렉터리를 다시 검사*하고, 변경이 있으면 *자동으로 재구성*합니다. 같은 실험을 `CONFIGURE_DEPENDS`로 반복하면 3단계의 출력이 바뀝니다.

```text
[0/2] Re-checking globbed directories...
-- GLOB mismatch!
The following files were added:
  +<S>/glob-cd/src/new_module.cpp
[1/2] Re-running CMake...
...
[1/5] Building CXX object CMakeFiles/myapp.dir/src/new_module.cpp.o
[2/5] Linking CXX executable myapp
```

대가는 세 가지입니다.

- **매 빌드의 재검사 비용**. 200개 디렉터리에 50개씩, 파일 10,000개를 `file(GLOB_RECURSE ... CONFIGURE_DEPENDS)`로 모은 프로젝트에서 아무것도 바뀌지 않은 `cmake --build`를 10번 재 보니 중앙값이 9ms에서 70ms로 늘었습니다(같은 Mac, APFS). 컴파일이 없는 빌드에서도 매번 이만큼 듭니다.
- **생성기 의존**. [file(GLOB) 공식 문서](https://cmake.org/cmake/help/v4.4/command/file.html#glob)는 이 플래그가 모든 생성기에서 신뢰성 있게 동작하지 않을 수 있고, 나중에 추가될 생성기가 지원하지 못할 수도 있다고 적습니다. 이 글은 Ninja에서만 확인했습니다.
- **리뷰 가시성**. 빌드 입력을 리뷰할 때 파일 목록 변경이 CMakeLists.txt diff로 나타나지 않습니다.

같은 문서는 소스 파일 목록을 GLOB으로 모으는 방식 자체를 권장하지 않는다고 적습니다.

```cmake
# 가능한 사용 예 — 자산 파일 자동 인식
file(GLOB ASSET_FILES CONFIGURE_DEPENDS
    "${CMAKE_CURRENT_SOURCE_DIR}/assets/*.png"
    "${CMAKE_CURRENT_SOURCE_DIR}/assets/*.json"
)
install(FILES ${ASSET_FILES} DESTINATION share/myapp/assets)
```

요약:

| 상황 | 권장 |
|------|-----|
| C/C++ *소스 파일* | 명시적 나열. `file(GLOB)` 안 씀. |
| 빈도가 낮은 *자산 파일* | `CONFIGURE_DEPENDS`로 자동 감지 OK. |
| 자동 감지 강제 필요 | 별도 코드 생성 단계를 두고 `add_custom_command`로 명확히 의존성 정의. |

### CMAKE_CXX_FLAGS 직접 조작

```cmake
# ❌ Bad — 설정 충돌, 디버깅 어려움
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++17 -Wall")

# ✓ Good — 타겟별 명확한 설정
target_compile_features(myapp PRIVATE cxx_std_17)
target_compile_options(myapp PRIVATE -Wall)
```

### link_directories 사용

```cmake
# ❌ Bad — 암묵적 의존성
link_directories(/opt/libs)
target_link_libraries(myapp foo)  # libfoo가 어디 있는지 불명확

# ✓ Good — 명시적 경로 또는 find_library
target_link_libraries(myapp /opt/libs/libfoo.so)

# 또는
find_library(FOO_LIB foo PATHS /opt/libs)
target_link_libraries(myapp ${FOO_LIB})
```

---

## 프로젝트 구조

### 권장 디렉터리 레이아웃

```text
project/
├── CMakeLists.txt
├── CMakePresets.json
├── cmake/
│   ├── MyProjectConfig.cmake.in
│   └── modules/
│       └── FindFoo.cmake
├── include/
│   └── myproject/
│       ├── api.hpp
│       └── types.hpp
├── src/
│   ├── CMakeLists.txt
│   ├── main.cpp
│   └── lib/
│       ├── CMakeLists.txt
│       └── mylib.cpp
├── tests/
│   ├── CMakeLists.txt
│   └── test_mylib.cpp
├── apps/
│   └── cli/
│       ├── CMakeLists.txt
│       └── main.cpp
└── third_party/
    └── ...
```

| 경로 | 역할 |
|------|------|
| `CMakeLists.txt` | 최상위 설정 |
| `CMakePresets.json` | 빌드 프리셋 |
| `cmake/` | CMake 모듈 |
| `include/myproject/` | 공개 헤더 |
| `src/` | 소스 코드 |
| `tests/` | 테스트 |
| `apps/` | 추가 실행 파일 |
| `third_party/` | 외부 의존성 |

### 최상위 CMakeLists.txt 템플릿

```cmake
cmake_minimum_required(VERSION 3.25)

project(MyProject
    VERSION 1.0.0
    LANGUAGES CXX
    DESCRIPTION "My awesome project"
    HOMEPAGE_URL "https://github.com/me/myproject"
)

# === 빌드 위치 확인 ===
if(PROJECT_SOURCE_DIR STREQUAL PROJECT_BINARY_DIR)
    message(FATAL_ERROR
        "In-source builds not allowed. "
        "Please create a build directory and run cmake from there."
    )
endif()

# === 옵션 (프로젝트 접두사 필수, BUILD_SHARED_LIBS는 CMake 표준 변수라 예외) ===
option(BUILD_SHARED_LIBS "Build shared libraries" OFF)
option(MYPROJECT_BUILD_TESTS "Build tests" ON)
option(MYPROJECT_BUILD_DOCS "Build documentation" OFF)
option(MYPROJECT_ENABLE_SANITIZERS "Enable sanitizers" OFF)

# === 전역 설정 ===
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Release 기본값 (단일 설정 생성기)
if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
    set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
    set_property(CACHE CMAKE_BUILD_TYPE PROPERTY STRINGS
        "Debug" "Release" "MinSizeRel" "RelWithDebInfo"
    )
endif()

# === 서브디렉터리 ===
add_subdirectory(src)

if(MYPROJECT_BUILD_TESTS AND PROJECT_IS_TOP_LEVEL)
    enable_testing()
    add_subdirectory(tests)
endif()

if(MYPROJECT_BUILD_DOCS)
    add_subdirectory(docs)
endif()
```

### 옵션 네이밍 규칙

프로젝트 접두사를 붙여 다른 프로젝트와 충돌을 방지합니다.

```cmake
# ✓ Good — 고유한 접두사
option(MYPROJECT_BUILD_TESTS "Build tests" ON)
option(MYPROJECT_ENABLE_FEATURE_X "Enable feature X" OFF)

# ❌ Bad — 흔한 이름, 충돌 위험
option(BUILD_TESTS "Build tests" ON)  # 다른 서브프로젝트와 충돌
option(ENABLE_X "Enable X" OFF)       # 너무 일반적
```

### PROJECT_IS_TOP_LEVEL 활용

CMake 3.21+에서 제공하는 `PROJECT_IS_TOP_LEVEL`은 현재 프로젝트가 최상위인지 확인합니다. 서브프로젝트로 포함될 때 테스트나 문서 빌드를 건너뛸 수 있습니다.

위 템플릿은 최소 버전을 3.25로 지정해 이 변수를 사용할 수 있도록 했습니다. 기능 도입 버전과 최소 지원 버전의 계약을 맞춘 것입니다. [PROJECT_IS_TOP_LEVEL](https://cmake.org/cmake/help/v4.4/variable/PROJECT_IS_TOP_LEVEL.html)의 도입 버전을 참고합니다.

```cmake
# 최상위 프로젝트일 때만 테스트 빌드
if(MYPROJECT_BUILD_TESTS AND PROJECT_IS_TOP_LEVEL)
    enable_testing()
    add_subdirectory(tests)
endif()
```

CMake 3.20 이하에서는 수동으로 검사합니다.

```cmake
if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    # 최상위 프로젝트
endif()
```

---

## 라이브러리 설계

### 별칭 타겟 제공

항상 네임스페이스가 붙은 별칭을 제공합니다. 사용측에서 일관된 문법을 쓸 수 있고, 존재하지 않는 타겟을 링크하면 빌드 전에 생성 단계에서 에러가 납니다.

```cmake
add_library(mylib src/mylib.cpp)
add_library(MyProject::mylib ALIAS mylib)

# 사용측 — 설치 후나 FetchContent나 동일한 문법
target_link_libraries(app PRIVATE MyProject::mylib)
```

별칭 없이 `mylib`만 쓰면 타이포가 구성·생성 단계를 통과합니다.

```cmake
target_link_libraries(app PRIVATE mylob)  # 타이포!
# 일반 이름은 링커 옵션 -lmylob으로 넘어가 링크 단계에서 실패
# 별칭이면: 생성 단계에서 Target "app" links to: MyProject::mylob ... not found
```

두 경우의 4.5.0 실제 출력은 [Ch 3](/blog/tools/build/cmake/chapter03-targets#별칭-없이-사용)에 있습니다.

### 헤더 전용 라이브러리

```cmake
add_library(myheaders INTERFACE)
add_library(MyProject::myheaders ALIAS myheaders)

target_include_directories(myheaders INTERFACE
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:include>
)
target_compile_features(myheaders INTERFACE cxx_std_17)
```

### 컴파일 경고 타겟

프로젝트 전체에서 사용할 경고 설정을 별도 타겟으로 분리합니다.

```cmake
add_library(project_warnings INTERFACE)
if(CMAKE_CXX_COMPILER_ID MATCHES "^(GNU|Clang|AppleClang)$")
    target_compile_options(project_warnings INTERFACE -Wall -Wextra -Wpedantic)
elseif(MSVC)
    target_compile_options(project_warnings INTERFACE /W4 /permissive-)
endif()
target_link_libraries(mylib PRIVATE project_warnings)
target_link_libraries(myapp PRIVATE project_warnings)
```

---

## 크로스 플랫폼 처리

### 제너레이터 표현식으로 분기

`if()`문보다 제너레이터 표현식이 Multi-config 생성기에서 더 안전합니다.

```cmake
# 컴파일러별 옵션
target_compile_options(myapp PRIVATE
    "$<$<CXX_COMPILER_ID:GNU,Clang,AppleClang>:-Wall;-Wextra;-Wpedantic>"
    "$<$<CXX_COMPILER_ID:MSVC>:/W4;/WX>"
)

# 빌드 설정별 옵션
target_compile_definitions(myapp PRIVATE
    $<$<CONFIG:Debug>:APP_DEBUG>
)

# 플랫폼별 정의
target_compile_definitions(myapp PRIVATE
    "$<$<PLATFORM_ID:Windows>:WIN32_LEAN_AND_MEAN;NOMINMAX>"
    $<$<PLATFORM_ID:Linux>:_GNU_SOURCE>
)

# 플랫폼별 링크
target_link_libraries(myapp PRIVATE
    $<$<PLATFORM_ID:Linux>:pthread>
    $<$<PLATFORM_ID:Windows>:ws2_32>
)
```

### 기능 검사

특정 기능이 있는지 컴파일 테스트로 확인합니다.

```cmake
include(CheckCXXSourceCompiles)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

check_cxx_source_compiles("
    #include <filesystem>
    int main() {
        std::filesystem::path p;
        return 0;
    }
" HAS_STD_FILESYSTEM)

if(NOT HAS_STD_FILESYSTEM)
    message(FATAL_ERROR "Selected C++17 toolchain cannot build the filesystem probe")
endif()
```

4.5.0·AppleClang 21에서 이 검사는 `-- Performing Test HAS_STD_FILESYSTEM - Success`였습니다. 같은 파일에서 `CMAKE_CXX_STANDARD`만 11로 바꾸자 `- Failed`가 되고 `FATAL_ERROR`에서 멈췄습니다. 검사용 컴파일이 `CMAKE_CXX_STANDARD`를 따르기 때문인데, 이 동작은 3.8의 정책 `CMP0067`이 정합니다. 그래서 검사 전에 표준을 설정합니다.

---

## 의존성 관리 전략

### 시스템 우선, FetchContent 폴백

시스템에 설치된 라이브러리를 먼저 찾고, 없으면 FetchContent로 가져오는 패턴입니다.

```cmake
macro(find_or_fetch PKG GIT_REPO GIT_TAG)
    find_package(${PKG} QUIET)
    if(NOT ${PKG}_FOUND)
        message(STATUS "${PKG} not found locally, fetching from ${GIT_REPO}...")
        include(FetchContent)
        FetchContent_Declare(${PKG}
            GIT_REPOSITORY ${GIT_REPO}
            GIT_TAG        ${GIT_TAG}
        )
        FetchContent_MakeAvailable(${PKG})
    else()
        message(STATUS "Found ${PKG} on system")
    endif()
endmacro()

find_or_fetch(fmt https://github.com/fmtlib/fmt.git 11.0.2)
find_or_fetch(spdlog https://github.com/gabime/spdlog.git v1.15.0)

target_link_libraries(myapp PRIVATE fmt::fmt spdlog::spdlog)
```

Homebrew로 fmt 12.2.1과 spdlog 1.17.0이 설치된 Mac에서 4.5.0으로 구성하면 `-- Found fmt on system`, `-- Found spdlog on system`이 찍혔고, 버전을 찍는 프로그램은 `fmt 120201 spdlog 1.17.0`을 출력했습니다. 매크로에 적은 `11.0.2`·`v1.15.0`은 쓰이지 않았습니다. `find_package(${PKG} QUIET)`에 버전 조건이 없기 때문이고, [Ch 5](/blog/tools/build/cmake/chapter05-find-package#시스템-우선-fetchcontent-폴백)의 `FIND_PACKAGE_ARGS`와 같은 함정입니다. 고정한 버전을 지키려면 `find_package(${PKG} ${VERSION} QUIET)`처럼 버전을 함께 넘깁니다.

### 서브프로젝트 옵션 격리

`CACHE ... FORCE`는 공용 캐시 값을 강제로 바꾸므로 옵션 격리 수단이 아닙니다. 서브프로젝트가 CMP0077 NEW를 따를 때 일반 변수로 의도한 값을 먼저 전달할 수 있습니다. fmt 11.0.2는 `cmake_minimum_required(VERSION 3.8...3.28)`, spdlog v1.15.0은 `3.10...3.21`이라 둘 다 CMP0077(3.13)이 NEW이고, `FMT_INSTALL`·`SPDLOG_FMT_EXTERNAL`은 각 프로젝트 최상위 CMakeLists.txt의 `option()`입니다.

```cmake
# FetchContent 전에 옵션 설정
set(FMT_INSTALL OFF)
set(SPDLOG_FMT_EXTERNAL ON)

FetchContent_MakeAvailable(fmt spdlog)
```

fmt 11.0.2를 FetchContent로 넣고 세 방식을 4.5.0에서 비교했습니다. "설치 파일 수"는 `cmake --install`이 찍은 `Installing:` 줄 수입니다.

| 상위 프로젝트 코드 | `-DFMT_INSTALL=ON` 없이 | `-DFMT_INSTALL=ON` 줌 |
|------|------|------|
| `set(FMT_INSTALL OFF)` | 캐시 항목 없음, 설치 0개 | 캐시에 `UNINITIALIZED=ON`이 남지만 무시, 설치 0개 |
| `set(FMT_INSTALL OFF CACHE BOOL "" FORCE)` | 캐시 `BOOL=OFF`, 설치 0개 | 사용자 값을 `OFF`로 덮어씀, 설치 0개 |
| `if(NOT DEFINED FMT_INSTALL)` 안에서 `set(FMT_INSTALL OFF)` | 설치 0개 | 설치 20개 |

앞의 두 줄은 상위 프로젝트가 값을 고정하고, 세 번째는 기본값만 바꾸고 소비자의 `-D`를 존중합니다. `FORCE`는 사용자가 넣은 캐시 값까지 지운다는 점이 다릅니다.

---

## 실전 예시 — 단독 빌드와 서브프로젝트 빌드 비교

같은 소스를 단독 프로젝트와 서브프로젝트로 빌드해 테스트 기본값과 경고 옵션의 범위를 확인합니다. 실행 환경은 CMake 4.5.0·Ninja 1.13.2·macOS·AppleClang 21입니다. 다음 두 파일을 저장합니다.

```cmake title="CMakeLists.txt"
cmake_minimum_required(VERSION 3.25)
project(Checklist LANGUAGES CXX)
option(CHECKLIST_BUILD_TESTS "Build standalone tests" "${PROJECT_IS_TOP_LEVEL}")
add_library(checklist_warnings INTERFACE)
if(CMAKE_CXX_COMPILER_ID MATCHES "^(GNU|Clang|AppleClang)$")
    target_compile_options(checklist_warnings INTERFACE -Wall -Wextra -Wpedantic)
elseif(MSVC)
    target_compile_options(checklist_warnings INTERFACE /W4)
endif()
add_executable(checklist_app main.cpp)
target_link_libraries(checklist_app PRIVATE checklist_warnings)
if(CHECKLIST_BUILD_TESTS)
    enable_testing()
    add_test(NAME ChecklistRuns COMMAND checklist_app)
endif()
message(STATUS "top=${PROJECT_IS_TOP_LEVEL}; tests=${CHECKLIST_BUILD_TESTS}")
```

실행 파일은 구성 확인용 문자열을 출력합니다.

```cpp title="main.cpp"
#include <iostream>
int main() { std::cout << "checklist ready\n"; }
```

Ninja를 사용하는 macOS·Linux 셸에서 단독 빌드를 확인합니다.

```bash
cmake -S . -B build -G Ninja
cmake --build build --verbose
ctest --test-dir build --output-on-failure
```

4.5.0에서 단독 빌드는 `-- top=ON; tests=ON`을 출력했고, `ctest`는 `100% tests passed out of 1`이었습니다. 다음 파일은 `parent/CMakeLists.txt`로 저장합니다. 상위 프로젝트에서 빌드 루트의 테스트 탐색을 활성화하고 같은 소스를 하위 디렉터리로 포함합니다.

```cmake title="parent/CMakeLists.txt"
cmake_minimum_required(VERSION 3.25)
project(Parent LANGUAGES CXX)
enable_testing()
add_subdirectory(.. checklist)
```

서브프로젝트 기본값은 새 빌드 디렉터리에서 확인합니다.

```bash
cmake -S parent -B parent-build -G Ninja
cmake --build parent-build --verbose
ctest --test-dir parent-build -N
```

이때 하위 프로젝트는 `-- top=OFF; tests=OFF`를 출력했고 `ctest -N`은 `Total Tests: 0`이었습니다. 또 다른 새 빌드 디렉터리에서 `-DCHECKLIST_BUILD_TESTS=ON`을 주면 `-- top=OFF; tests=ON`이 되고 테스트 하나가 통과했습니다. 캐시에 이전 값이 있으면 option 기본값보다 우선하므로 비교할 때마다 새 빌드 디렉터리를 씁니다. 경고 옵션은 두 경우 모두 `checklist_app` 컴파일 명령에 `-Wall -Wextra -Wpedantic`로 들어갔습니다. INTERFACE 타겟으로 묶은 경고는 그 타겟을 링크한 타겟에만 붙으므로, 상위 프로젝트의 다른 타겟은 영향을 받지 않습니다.

## 다음 단계 — Modern Advanced

지금까지의 베스트 프랙티스를 적용한 뒤, *더 깊이 들어가야 할 도구*들이 있습니다 — `target_sources` / `target_precompile_headers` 같은 확장 타겟 명령, `BUILD_INTERFACE` vs `INSTALL_INTERFACE`, `CMakePresets.json`, `cmake -E`. 이 도구들은 [Ch 9: Modern Advanced](/blog/tools/build/cmake/chapter09-modern-advanced)에서 모아 다룹니다.

---

## 체크리스트

프로젝트를 검토할 때 확인할 사항입니다.

### 필수 항목

- [ ] `cmake_minimum_required()`가 첫 줄에 있는가
- [ ] `project()`에 VERSION과 LANGUAGES가 있는가
- [ ] 타겟 명령(`target_*`)만 사용하는가
- [ ] 전역 명령(`include_directories`, `add_definitions` 등)을 피했는가
- [ ] 별칭 타겟(`MyProject::lib`)을 제공하는가
- [ ] 옵션에 프로젝트 접두사가 있는가 (`MYPROJECT_*`)

### 권장 항목

- [ ] In-source 빌드를 막았는가
- [ ] C++ 표준을 `target_compile_features()`로 지정했는가
- [ ] 제너레이터 표현식으로 플랫폼/컴파일러 분기했는가
- [ ] `GNUInstallDirs`를 사용했는가
- [ ] 패키지 설정 파일(`*Config.cmake`)을 생성했는가
- [ ] `CMakePresets.json`을 제공했는가
- [ ] `PROJECT_IS_TOP_LEVEL`로 서브프로젝트 처리했는가

---

## 정리

- **타겟 중심** — 모든 설정은 타겟에 연결, 전파 키워드로 제어
- **전역 회피** — `include_directories()`, `add_definitions()`, `link_directories()` 금지
- **명시적 소스** — `file(GLOB)` 대신 소스 파일 명시적 나열
- **별칭 제공** — `MyProject::lib` 형태로 네임스페이스 별칭
- **옵션 접두사** — `MYPROJECT_BUILD_TESTS`처럼 프로젝트명 접두사
- **크로스 플랫폼** — 제너레이터 표현식으로 컴파일러/플랫폼 분기
- **의존성 전략** — 시스템 우선, FetchContent 폴백

---

## 흔한 실수

### 타겟 명령에 전파 키워드 누락

```cmake
target_include_directories(mylib include)  # ❌ 키워드 누락

target_include_directories(mylib PUBLIC include)  # ✓ PUBLIC 명시
```

4.5.0에서 키워드 없는 호출은 `target_include_directories called with invalid arguments` 오류로 구성이 멈췄습니다. `target_link_libraries`와 달리 `target_include_directories`에는 키워드 없는 서명이 없습니다.

### 빌드 트리와 설치 트리 혼동

```cmake
target_include_directories(mylib PUBLIC include)  # ❌ 설치 후 경로 깨짐
```

이 타겟을 `install(EXPORT ...)`로 내보내면 4.5.0은 생성 단계에서 멈춥니다.

```text
CMake Error in CMakeLists.txt:
  Target "mylib" INTERFACE_INCLUDE_DIRECTORIES property contains path:

    "<src>/include"

  which is prefixed in the source directory.
```

설치된 패키지가 소스 트리 경로를 가리키게 되는 것을 CMake가 막는 것입니다. 빌드 시와 설치 후 경로가 다르므로 제너레이터 표현식으로 분리합니다.

```cmake
target_include_directories(mylib PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:include>
)
```

### Multi-config에서 if(CMAKE_BUILD_TYPE) 사용

```cmake
if(CMAKE_BUILD_TYPE STREQUAL "Debug")  # ❌ Multi-config에서는 -D로 주지 않으면 빈 문자열
    target_compile_options(myapp PRIVATE -O0 -g)
endif()
```

Visual Studio나 Ninja Multi-Config는 `CMAKE_BUILD_TYPE`으로 실제 구성을 선택하지 않습니다. 값을 `-DCMAKE_BUILD_TYPE=Debug`로 넣으면 위 if가 참이 되지만, 그 옵션은 Release 빌드에도 붙습니다([Ch 2](/blog/tools/build/cmake/chapter02-language#왜-if로는-안-되는가)에서 Ninja Multi-Config로 확인). 아래는 컴파일러에 독립적인 구성 매크로 예입니다.

```cmake
target_compile_definitions(myapp PRIVATE
    $<$<CONFIG:Debug>:APP_DEBUG>
)
```

### find_package 후 변수 대신 타겟 사용

```cmake
find_package(Boost REQUIRED COMPONENTS filesystem)

target_include_directories(myapp PRIVATE ${Boost_INCLUDE_DIRS})  # ❌ Old style
target_link_libraries(myapp PRIVATE ${Boost_LIBRARIES})

target_link_libraries(myapp PRIVATE Boost::filesystem)  # ✓ Modern style
```

Boost 1.70 이상은 `BoostConfig.cmake`로 `Boost::filesystem` 같은 imported 타겟을 제공하고, CMake 3.30부터는 내장 `FindBoost` 대신 이 Config 파일을 찾습니다(정책 `CMP0167`, [Ch 5](/blog/tools/build/cmake/chapter05-find-package#boost) 참고). 타겟을 링크하면 include 경로와 컴파일 정의가 자동으로 전파됩니다.

---

## 다음 장 예고

[Ch 9: Modern Advanced](/blog/tools/build/cmake/chapter09-modern-advanced)에서는 이 베스트 프랙티스 위에 얹는 *고급 도구 모음*을 다룹니다 — `target_*` 패밀리 전체, `BUILD_INTERFACE` vs `INSTALL_INTERFACE`, `add_custom_command/target`, CMakePresets.json, `cmake -E`까지.

---

## 참고 자료

- [Modern CMake](https://cliutils.gitlab.io/modern-cmake/) — 현대적 CMake 가이드
- [Effective CMake (Daniel Pfeifer)](https://www.youtube.com/watch?v=bsXLMQ6WgIk) — C++Now 2017 발표
- [It's Time To Do CMake Right](https://pabloariasal.github.io/2018/02/19/its-time-to-do-cmake-right/)
- [CMake Buildsystem](https://cmake.org/cmake/help/v4.4/manual/cmake-buildsystem.7.html) — 공식 문서
- [Professional CMake (Book)](https://crascit.com/professional-cmake/) — 심화 학습용 책

---

## 관련 항목

- [Ch 7: 설치와 패키징](/blog/tools/build/cmake/chapter07-install) — 모범 사례대로 만든 타겟을 밖으로 내보내기
- [Ch 9: Modern CMake 고급](/blog/tools/build/cmake/chapter09-modern-advanced) — 이 원칙 위에 얹는 고급 도구 모음
- [Ch 3: 타겟과 라이브러리](/blog/tools/build/cmake/chapter03-targets) — 타겟 중심 설계의 출발점
- [실전 Makefile 예제](/blog/tools/build/gnu-make/chapter07-practical) — 같은 운영 패턴을 Make로 구성했을 때의 골격
- [cmake-toolchains(7)](https://cmake.org/cmake/help/v4.4/manual/cmake-toolchains.7.html) — 크로스 플랫폼·크로스 컴파일 설정의 공식 기준
