---
title: "Ch 8: Modern CMake 베스트 프랙티스"
date: 2025-05-14T17:00:00
description: "타겟 중심 접근법, 피해야 할 안티패턴, 대규모 프로젝트 구성 전략."
tags: [cmake, build, cpp, best-practices]
series: "CMake"
seriesOrder: 8
draft: false
---

## 왜 베스트 프랙티스가 필요한가

CMake는 유연합니다. 같은 결과를 얻는 방법이 여러 가지 있습니다. 하지만 이 유연함이 문제가 되기도 합니다. 레거시 방식과 현대적 방식이 공존하기 때문입니다.

```cmake
# 2010년대 방식 — 여전히 동작하지만 권장하지 않음
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

이 코드의 문제점:

1. **전역 오염** — `include_directories()`, `add_definitions()`가 모든 타겟에 영향
2. **플래그 문자열 조작** — `CMAKE_CXX_FLAGS`를 직접 수정하면 설정 충돌 발생
3. **암묵적 의존성** — `link_directories()`로 경로만 지정하면 어떤 라이브러리가 쓰이는지 불명확
4. **자동 감지 실패** — `file(GLOB)`은 새 파일 추가 시 CMake 재설정 필요

Modern CMake(3.0+)는 이 문제를 **타겟 중심 접근법**으로 해결합니다.

```
┌────────────────────────────────────────────────────────────────┐
│                   Old vs Modern CMake                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   Old CMake (전역 중심)           Modern CMake (타겟 중심)     │
│   ────────────────────           ──────────────────────        │
│   include_directories()    →    target_include_directories()  │
│   add_definitions()        →    target_compile_definitions()  │
│   add_compile_options()    →    target_compile_options()      │
│   link_directories()       →    target_link_libraries()       │
│   CMAKE_CXX_FLAGS          →    target_compile_features()     │
│                                                                │
│   전역 변수 조작            →    타겟 속성 + 전파 키워드        │
│   (모든 타겟에 영향)             (선택적 전파)                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

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

```
┌────────────────────────────────────────────────────────────────┐
│                   속성 전파 흐름                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   mylib (라이브러리)                                           │
│   ├── PRIVATE: src/              → mylib 빌드에만 사용         │
│   ├── PUBLIC:  include/          → mylib + 사용측              │
│   └── PUBLIC:  -DUSE_MYLIB       → mylib + 사용측              │
│                     │                                          │
│                     ▼                                          │
│   myapp (실행 파일)                                            │
│   └── 자동으로: include/, -DUSE_MYLIB 상속                     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

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
    $<$<CXX_COMPILER_ID:GNU,Clang>:-Wall -Wextra -Wpedantic>
    $<$<CXX_COMPILER_ID:MSVC>:/W4>
)

# 사용
target_link_libraries(myapp PRIVATE myheaders mywarnings)
```

---

## 피해야 할 안티패턴

### 전역 설정

전역 명령은 이후 모든 타겟에 영향을 미칩니다. 서브프로젝트를 포함할 때 예상치 못한 충돌이 발생합니다.

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

### file(GLOB) 남용

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

`file(GLOB)`은 CMake 구성 시점에 파일 목록을 결정합니다. 이후 파일을 추가해도 CMake를 다시 실행하지 않으면 감지하지 못합니다.

**예외**: `CONFIGURE_DEPENDS` (CMake 3.12+)

```cmake
file(GLOB SRCS CONFIGURE_DEPENDS src/*.cpp)
```

이 옵션을 사용하면 빌드 시마다 파일 변경을 검사합니다. 단, 빌드 시간이 늘어날 수 있어 대규모 프로젝트에서는 주의가 필요합니다.

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

```
project/
├── CMakeLists.txt           # 최상위 설정
├── CMakePresets.json        # 빌드 프리셋
├── cmake/                   # CMake 모듈
│   ├── MyProjectConfig.cmake.in
│   └── modules/
│       └── FindFoo.cmake
├── include/                 # 공개 헤더
│   └── myproject/
│       ├── api.hpp
│       └── types.hpp
├── src/                     # 소스 코드
│   ├── CMakeLists.txt
│   ├── main.cpp
│   └── lib/
│       ├── CMakeLists.txt
│       └── mylib.cpp
├── tests/                   # 테스트
│   ├── CMakeLists.txt
│   └── test_mylib.cpp
├── apps/                    # 추가 실행 파일
│   └── cli/
│       ├── CMakeLists.txt
│       └── main.cpp
└── third_party/             # 외부 의존성
    └── ...
```

### 최상위 CMakeLists.txt 템플릿

```cmake
cmake_minimum_required(VERSION 3.20)

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

# === 옵션 (프로젝트 접두사 필수) ===
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

항상 네임스페이스가 붙은 별칭을 제공합니다. 사용측에서 일관된 문법을 쓸 수 있고, 존재하지 않는 타겟을 링크하면 즉시 에러가 발생합니다.

```cmake
add_library(mylib src/mylib.cpp)
add_library(MyProject::mylib ALIAS mylib)

# 사용측 — 설치 후나 FetchContent나 동일한 문법
target_link_libraries(app PRIVATE MyProject::mylib)
```

별칭 없이 `mylib`만 쓰면 타이포가 있어도 에러 없이 통과할 수 있습니다.

```cmake
target_link_libraries(app PRIVATE mylob)  # 타이포!
# 별칭 없으면: 경고만 나오고 링크 시 실패
# 별칭 있으면: MyProject::mylob을 찾을 수 없다고 즉시 에러
```

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

target_compile_options(project_warnings INTERFACE
    $<$<CXX_COMPILER_ID:GNU>:
        -Wall -Wextra -Wpedantic
        -Wshadow -Wnon-virtual-dtor -Wold-style-cast
        -Wcast-align -Wunused -Woverloaded-virtual
        -Wconversion -Wsign-conversion
    >
    $<$<CXX_COMPILER_ID:Clang>:
        -Wall -Wextra -Wpedantic
        -Wshadow -Wnon-virtual-dtor -Wold-style-cast
    >
    $<$<CXX_COMPILER_ID:MSVC>:
        /W4 /permissive-
    >
)

# 사용
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
    $<$<CXX_COMPILER_ID:GNU>:-Wall -Wextra -Wpedantic>
    $<$<CXX_COMPILER_ID:Clang>:-Wall -Wextra -Wpedantic>
    $<$<CXX_COMPILER_ID:MSVC>:/W4 /WX>
)

# 빌드 설정별 옵션
target_compile_options(myapp PRIVATE
    $<$<CONFIG:Debug>:-O0 -g>
    $<$<CONFIG:Release>:-O3 -DNDEBUG>
)

# 플랫폼별 정의
target_compile_definitions(myapp PRIVATE
    $<$<PLATFORM_ID:Windows>:WIN32_LEAN_AND_MEAN NOMINMAX>
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

check_cxx_source_compiles("
    #include <filesystem>
    int main() {
        std::filesystem::path p;
        return 0;
    }
" HAS_STD_FILESYSTEM)

if(NOT HAS_STD_FILESYSTEM)
    target_link_libraries(myapp PRIVATE stdc++fs)
endif()
```

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

find_or_fetch(fmt https://github.com/fmtlib/fmt.git 10.2.0)
find_or_fetch(spdlog https://github.com/gabime/spdlog.git v1.13.0)

target_link_libraries(myapp PRIVATE fmt::fmt spdlog::spdlog)
```

### 서브프로젝트 옵션 격리

서브프로젝트의 옵션이 메인 프로젝트에 영향을 주지 않도록 `FORCE`로 덮어씁니다.

```cmake
# FetchContent 전에 옵션 설정
set(FMT_INSTALL OFF CACHE BOOL "" FORCE)           # fmt 설치 비활성화
set(SPDLOG_FMT_EXTERNAL ON CACHE BOOL "" FORCE)    # spdlog가 외부 fmt 사용

FetchContent_MakeAvailable(fmt spdlog)
```

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

키워드가 없으면 CMake 버전에 따라 경고 또는 에러가 발생합니다.

### 빌드 트리와 설치 트리 혼동

```cmake
target_include_directories(mylib PUBLIC include)  # ❌ 설치 후 경로 깨짐
```

빌드 시와 설치 후 경로가 다르므로 제너레이터 표현식으로 분리합니다.

```cmake
target_include_directories(mylib PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:include>
)
```

### Multi-config에서 if(CMAKE_BUILD_TYPE) 사용

```cmake
if(CMAKE_BUILD_TYPE STREQUAL "Debug")  # ❌ Multi-config에서 항상 빈 문자열
    target_compile_options(myapp PRIVATE -O0 -g)
endif()
```

Visual Studio나 Ninja Multi-Config에서는 `CMAKE_BUILD_TYPE`이 구성 시점에 설정되지 않습니다.

```cmake
target_compile_options(myapp PRIVATE
    $<$<CONFIG:Debug>:-O0 -g>  # ✓ 제너레이터 표현식
)
```

### find_package 후 변수 대신 타겟 사용

```cmake
find_package(Boost REQUIRED COMPONENTS filesystem)

target_include_directories(myapp PRIVATE ${Boost_INCLUDE_DIRS})  # ❌ Old style
target_link_libraries(myapp PRIVATE ${Boost_LIBRARIES})

target_link_libraries(myapp PRIVATE Boost::filesystem)  # ✓ Modern style
```

Modern find 모듈은 imported 타겟을 제공합니다. 타겟을 링크하면 include 경로와 컴파일 정의가 자동으로 전파됩니다.

---

## 시리즈 마무리

CMake 시리즈를 마칩니다. 8개 장에 걸쳐 다음 내용을 다뤘습니다.

| 장 | 주제 |
|-----|------|
| Ch 1 | CMake 소개와 기본 빌드 흐름 |
| Ch 2 | CMake 언어 — 변수, 리스트, 제너레이터 표현식 |
| Ch 3 | 타겟과 속성 전파 |
| Ch 4 | 옵션, 캐시 변수, 프리셋 |
| Ch 5 | find_package와 FetchContent |
| Ch 6 | 테스트와 CTest |
| Ch 7 | 설치와 CPack |
| Ch 8 | 베스트 프랙티스 |

CMake는 C/C++ 프로젝트의 사실상 표준 빌드 시스템입니다. Modern CMake의 타겟 중심 접근법을 익히면 크로스 플랫폼 프로젝트를 효과적으로 관리할 수 있습니다. `target_*` 명령과 전파 키워드만 기억해도 대부분의 상황에 대응할 수 있습니다.

---

## 참고 자료

- [Modern CMake](https://cliutils.gitlab.io/modern-cmake/) — 현대적 CMake 가이드
- [Effective CMake (Daniel Pfeifer)](https://www.youtube.com/watch?v=bsXLMQ6WgIk) — CppCon 발표
- [It's Time To Do CMake Right](https://pabloariasal.github.io/2018/02/19/its-time-to-do-cmake-right/)
- [CMake Buildsystem](https://cmake.org/cmake/help/latest/manual/cmake-buildsystem.7.html) — 공식 문서
- [Professional CMake (Book)](https://crascit.com/professional-cmake/) — 심화 학습용 책

---

## 관련 시리즈

- [GNU Make 시리즈](/blog/tools/make/chapter01-intro) — Make 기초
