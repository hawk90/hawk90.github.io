---
title: "Ch 5: find_package와 외부 의존성"
date: 2025-05-14T05:00:00
description: "외부 라이브러리 탐색, FetchContent, 그리고 의존성 관리."
tags: [cmake, build, cpp, dependencies]
series: "CMake"
seriesOrder: 5
draft: false
---

## 왜 `find_package`가 필요한가

프로젝트가 OpenSSL과 zlib을 사용한다고 합시다. Makefile로 *손으로* 작성하면 OS마다 경로가 흩어져 있어 곤란해집니다.

```makefile
# Linux
CFLAGS += -I/usr/include/openssl
LDFLAGS += -L/usr/lib -lssl -lcrypto -lz

# macOS (Homebrew Apple Silicon)
CFLAGS += -I/opt/homebrew/opt/openssl/include
LDFLAGS += -L/opt/homebrew/opt/openssl/lib -lssl -lcrypto -lz

# macOS (Homebrew Intel) — 또 다름
CFLAGS += -I/usr/local/opt/openssl/include
# ...

# Windows + vcpkg — 또 다름
# ...
```

플랫폼마다 경로가 다르고, 패키지 매니저마다 또 다릅니다. 버전이 바뀌면 경로도 바뀝니다. *이 정보를 직접 추적하는 것은 정상적인 개발자의 일이 아닙니다*.

CMake의 답은 단순합니다. *라이브러리 이름만 알려 줘라. CMake가 찾는다*.

```cmake
find_package(OpenSSL REQUIRED)
find_package(ZLIB REQUIRED)

add_executable(myapp main.cpp)
target_link_libraries(myapp PRIVATE
    OpenSSL::SSL
    OpenSSL::Crypto
    ZLIB::ZLIB
)
```

이 다섯 줄이 *모든 OS*에서 동작합니다. CMake는:
1. OS와 패키지 매니저별 *표준 경로*를 순회하며 라이브러리를 찾고,
2. 헤더 경로·라이브러리 경로를 *임포트 타겟*(`OpenSSL::SSL`, `ZLIB::ZLIB`)에 묶고,
3. 그 타겟을 사용하는 모든 코드에 *전이적으로 옵션을 전파*합니다.

`target_link_libraries`에 적은 `OpenSSL::SSL`이 어떻게 펼쳐지는지 보면, 결과적으로 위의 `-I.../include` + `-l ssl -l crypto` 같은 컴파일러 옵션이 *자동으로* 명령에 들어갑니다. 하지만 *우리 코드*에서는 이름만 보입니다. 이게 Modern CMake의 큰 그림입니다.

이 챕터는 다음을 다룹니다.

1. `find_package`의 *두 가지 동작 모드* — Module 모드와 Config 모드.
2. 라이브러리가 없는 시스템에서 *FetchContent로 자동 다운로드*하기.
3. `find_package` + FetchContent의 *하이브리드 패턴* (3.25+).

---

## find_package 기초

### 기본 사용법

```cmake
find_package(ZLIB REQUIRED)

add_executable(myapp main.cpp)
target_link_libraries(myapp PRIVATE ZLIB::ZLIB)
```

`REQUIRED`는 필수 의존성을 의미합니다. 찾지 못하면 CMake가 오류로 중단합니다.

### 동작 방식 — Module 모드와 Config 모드

`find_package`가 라이브러리를 찾는 방법은 *두 가지 완전히 다른 메커니즘*이 있습니다. 이 둘의 차이를 이해하지 않으면 *왜 어떤 라이브러리는 잘 찾는데 어떤 라이브러리는 안 찾히는지* 디버깅이 어렵습니다.

![find_package — Config vs Module 모드](/images/blog/cmake/diagrams/ch05-find-package-modes.svg)

**Module 모드** — *CMake가 가진 Find 스크립트*

CMake 자체에 *수십 개의 `FindXxx.cmake` 스크립트*가 내장되어 있습니다(`$CMAKE/Modules/` 디렉터리). 이 스크립트는 *전통적인 라이브러리*를 시스템 표준 위치에서 찾아 줍니다 — zlib, OpenSSL, Threads, X11, JPEG 같이 *오래된, 그리고 CMake보다 먼저 존재한* 라이브러리들.

```text
$CMAKE/Modules/
├── FindZLIB.cmake
├── FindOpenSSL.cmake
├── FindThreads.cmake
├── FindJPEG.cmake
└── ... (수십 개)
```

Module 모드 흐름:
1. `find_package(ZLIB)` 호출
2. CMake가 `FindZLIB.cmake`를 실행
3. 이 스크립트가 *직접 코드를 써서* 라이브러리 위치 탐색 (시스템 경로, 환경변수, 표준 위치)
4. 찾으면 `ZLIB_FOUND`, `ZLIB_INCLUDE_DIRS`, `ZLIB_LIBRARIES` 같은 *변수*에 결과를 채움
5. 최근 버전들은 *imported 타겟*(`ZLIB::ZLIB`)도 함께 만들어 줌

이 모드의 한계는 *라이브러리 자체가 아니라 CMake가 검색 로직을 안다*는 점입니다. 라이브러리가 새 버전을 내거나 새 옵션을 추가해도, CMake의 Find 스크립트가 따라가지 못하면 활용할 수 없습니다.

**Config 모드** — *라이브러리가 제공한 정보 파일*

요즘 잘 만든 라이브러리는 *자기 자신에 대한 CMake 정보 파일*을 직접 제공합니다. 이 파일은 라이브러리가 설치될 때 같이 깔립니다.

```text
/usr/lib/cmake/fmt/
├── fmt-config.cmake          ← find_package(fmt)가 찾는 파일
├── fmt-config-version.cmake  ← 버전 정보
└── fmt-targets.cmake         ← imported 타겟 정의
```

Config 모드 흐름:
1. `find_package(fmt)` 호출
2. CMake가 시스템 경로에서 `fmt-config.cmake` (또는 `fmtConfig.cmake`)를 검색
3. 찾으면 그 파일을 *그대로 실행*
4. 그 파일이 *imported 타겟*과 변수를 모두 정의

라이브러리가 *자기 정보를 직접 들고 다닌다*는 점에서 훨씬 정확합니다. CMake가 새 버전 라이브러리를 알 필요가 없습니다.

**우선순위 — Config가 먼저**

`find_package(X)`는 *기본적으로 Config 모드를 먼저* 시도합니다. 시스템에 `XConfig.cmake`가 있으면 그쪽을, 없으면 `FindX.cmake`로 폴백합니다.

특정 모드만 쓰고 싶을 때는 명시할 수 있습니다.

```cmake
# Config 모드 강제 — Find 스크립트는 무시
find_package(fmt REQUIRED CONFIG)

# Module 모드 강제 — Config 파일은 무시
find_package(ZLIB REQUIRED MODULE)
```

### 검색 경로 — CMake가 어디를 보는가

`find_package`가 실제로 어디를 뒤지는지는 *모드에 따라 미묘하게 다릅니다*. 디버깅이 필요하면 `--debug-find` 옵션이 정답입니다.

```bash
cmake --debug-find -B build
# 또는 특정 패키지만
cmake --debug-find-pkg=fmt -B build
```

출력에 `find_package`가 어떤 경로를 *순서대로* 시도했는지 모두 찍힙니다.

자주 만나는 검색 경로 영향 변수:

| 변수 | 의미 |
|------|------|
| `CMAKE_PREFIX_PATH` | 가장 강력. 콜론(`;`) 구분 prefix 목록. `/opt/myapp:/usr/local` 식. |
| `<Package>_DIR` | 특정 패키지의 Config 파일 위치를 *직접* 지정. `-DZLIB_DIR=/opt/zlib/lib/cmake/zlib` |
| `CMAKE_MODULE_PATH` | Module 모드에서 *사용자 Find 스크립트* 추가 경로 |
| 환경변수 `<Package>_ROOT` | 패키지별 root prefix (3.12+) |

가장 실용적인 두 패턴:

```bash
# vcpkg / Conan 같은 패키지 매니저 통합
cmake -B build -DCMAKE_PREFIX_PATH=/path/to/vcpkg/installed/x64-linux

# 직접 빌드한 라이브러리 사용
cmake -B build -DZLIB_DIR=/opt/zlib-1.3/lib/cmake/zlib
```

### 선택적 의존성

`REQUIRED` 없이 호출하면 선택적 의존성이 됩니다.

```cmake
find_package(ZLIB)  # 없어도 진행

if(ZLIB_FOUND)
    target_link_libraries(myapp PRIVATE ZLIB::ZLIB)
    target_compile_definitions(myapp PRIVATE HAS_ZLIB)
endif()
```

### 버전 지정

```cmake
# 1.70 이상
find_package(Boost 1.70 REQUIRED)

# 정확히 4.0
find_package(OpenCV 4.0 EXACT REQUIRED)

# 범위
find_package(fmt 10.0...<12.0 REQUIRED)  # CMake 3.19+
```

### 컴포넌트 지정

큰 라이브러리는 여러 컴포넌트로 나뉩니다.

```cmake
# Boost의 filesystem과 system만 필요
find_package(Boost 1.70 REQUIRED COMPONENTS filesystem system)

# Qt6의 특정 모듈만
find_package(Qt6 REQUIRED COMPONENTS Widgets Gui Core)
```

---

## Imported 타겟 사용하기

### 현대적인 방식 (권장)

현대 패키지는 **imported 타겟**을 제공합니다. 타겟 이름은 보통 `<Package>::<Component>` 형식입니다.

```cmake
find_package(OpenSSL REQUIRED)
target_link_libraries(myapp PRIVATE OpenSSL::SSL OpenSSL::Crypto)

find_package(Threads REQUIRED)
target_link_libraries(myapp PRIVATE Threads::Threads)

find_package(CURL REQUIRED)
target_link_libraries(myapp PRIVATE CURL::libcurl)
```

Imported 타겟을 사용하면:

- 인클루드 디렉터리가 자동으로 추가됩니다.
- 링크 플래그가 자동으로 설정됩니다.
- 의존성 전파가 올바르게 동작합니다.

### 레거시 변수 방식

오래된 패키지는 imported 타겟 없이 변수만 설정합니다.

```cmake
find_package(JPEG REQUIRED)

# 레거시 방식
target_include_directories(myapp PRIVATE ${JPEG_INCLUDE_DIRS})
target_link_libraries(myapp PRIVATE ${JPEG_LIBRARIES})
```

일반적인 변수 이름:

| 변수 | 설명 |
|------|------|
| `<PKG>_FOUND` | 찾았는지 여부 |
| `<PKG>_INCLUDE_DIRS` | 헤더 경로 |
| `<PKG>_LIBRARIES` | 라이브러리 파일 |
| `<PKG>_VERSION` | 버전 문자열 |
| `<PKG>_DEFINITIONS` | 전처리기 정의 |

**권장**: 가능하면 항상 imported 타겟(`Pkg::Component`)을 사용하세요.

---

## 자주 쓰는 패키지

### Threads (pthreads)

```cmake
find_package(Threads REQUIRED)
target_link_libraries(myapp PRIVATE Threads::Threads)
```

### Boost

```cmake
find_package(Boost 1.70 REQUIRED COMPONENTS filesystem regex)
target_link_libraries(myapp PRIVATE
    Boost::filesystem
    Boost::regex
)

# 헤더 전용 Boost 라이브러리
find_package(Boost REQUIRED)
target_link_libraries(myapp PRIVATE Boost::headers)
```

### OpenSSL

```cmake
find_package(OpenSSL REQUIRED)
target_link_libraries(myapp PRIVATE OpenSSL::SSL OpenSSL::Crypto)
```

### CURL

```cmake
find_package(CURL REQUIRED)
target_link_libraries(myapp PRIVATE CURL::libcurl)
```

### ZLIB

```cmake
find_package(ZLIB REQUIRED)
target_link_libraries(myapp PRIVATE ZLIB::ZLIB)
```

### fmt

```cmake
find_package(fmt REQUIRED)
target_link_libraries(myapp PRIVATE fmt::fmt)
```

### nlohmann_json

```cmake
find_package(nlohmann_json REQUIRED)
target_link_libraries(myapp PRIVATE nlohmann_json::nlohmann_json)
```

---

## pkg-config

Unix 시스템에서 많은 라이브러리가 pkg-config를 사용합니다. CMake의 `PkgConfig` 모듈로 이런 라이브러리를 찾을 수 있습니다.

```cmake
find_package(PkgConfig REQUIRED)
pkg_check_modules(LIBUSB REQUIRED IMPORTED_TARGET libusb-1.0)

target_link_libraries(myapp PRIVATE PkgConfig::LIBUSB)
```

### pkg_check_modules 옵션

```cmake
# 버전 요구
pkg_check_modules(FOO REQUIRED foo>=1.0)

# 조용히 (오류 메시지 없이)
pkg_check_modules(FOO QUIET foo)

# Imported 타겟 생성 (권장)
pkg_check_modules(FOO REQUIRED IMPORTED_TARGET foo)
```

`IMPORTED_TARGET`을 사용하면 `PkgConfig::<NAME>` 타겟이 생성되어 `target_link_libraries`로 바로 연결할 수 있습니다.

---

## FetchContent — 의존성을 *프로젝트 안에* 가져오기

### 왜 FetchContent인가

지금까지 본 `find_package`는 *시스템에 이미 설치된* 라이브러리를 찾습니다. 사용자가 직접 `apt install`이나 `brew install`을 해야 한다는 뜻입니다. 사용자 환경에 따라 *있을 수도, 없을 수도, 버전이 다를 수도* 있어 불안정합니다.

`FetchContent`는 이 의존성을 *프로젝트 안으로 통째로 끌고 옵니다*. CMake 구성 시점에 Git이나 URL에서 라이브러리를 내려받아, *내 빌드의 일부*로 함께 컴파일합니다. 사용자는 `cmake -B build` 한 번이면 모든 의존성이 자동으로 갖춰집니다.

이 모델의 장단점은 명확합니다.

**장점**
- *사용자 환경 무관*. 어디서든 같은 라이브러리·버전이 동작.
- *디버깅 가능*. 의존 라이브러리도 내 빌드에 같이 들어가서 *그 안까지 스텝 인*이 됨.
- *버전 고정*. Git tag로 정확한 상태를 묶을 수 있음.

**단점**
- *빌드 시간 증가*. 내 코드뿐 아니라 의존성도 같이 컴파일.
- *디스크 사용*. 각 프로젝트가 자기 사본을 만듬.
- *시스템 라이브러리 활용 안 함*. 이미 깔린 zlib을 두고 자기 사본을 만들면 비효율.

이 트레이드오프 때문에, CMake 3.24+에서 *하이브리드 패턴*(find_package + FetchContent)이 도입됐습니다 — 시스템에 있으면 그걸 쓰고, 없으면 가져옵니다. 자세한 건 이 절 마지막에서.

### FetchContent vs ExternalProject — *언제 무엇을*

CMake에는 외부 의존성을 다루는 *두 가지 도구*가 있습니다.

| | `ExternalProject` | `FetchContent` |
|---|---|---|
| 등장 시기 | CMake 2.8 (오래됨) | CMake 3.11 (2018) |
| 시점 | *빌드 시점*에 다운로드·빌드 | *구성 시점*에 다운로드 (3.12+) |
| 타겟 노출 | *아니오* — 자체 외부 빌드로 묶임 | *예* — 메인 빌드에 함께 흡수 |
| `target_link_libraries` | 직접 불가, ExternalProject 출력 경로 수동 지정 | 일반 타겟처럼 즉시 링크 가능 |
| 디버깅 | 별도 빌드로 *스텝 인 어려움* | 메인 빌드 일부라 자유롭게 가능 |
| 적합한 자리 | 거대한 외부 도구 (CMake로 안 만든 것도 됨) | C++ 라이브러리 의존성 (대부분의 경우) |

요약: *C++ 라이브러리 의존성*은 거의 항상 `FetchContent`. `ExternalProject`는 *CMake와 무관한 빌드 시스템*을 가진 외부 도구(autotools, scons로 빌드되는 것들)에만 씁니다.

### 기본 사용법

### 기본 사용법

```cmake
include(FetchContent)

FetchContent_Declare(
    fmt
    GIT_REPOSITORY https://github.com/fmtlib/fmt.git
    GIT_TAG        11.0.2
)

FetchContent_MakeAvailable(fmt)

target_link_libraries(myapp PRIVATE fmt::fmt)
```

`FetchContent_Declare`로 어디서 가져올지 선언하고, `FetchContent_MakeAvailable`로 실제로 가져옵니다.

### 여러 의존성

```cmake
include(FetchContent)

FetchContent_Declare(
    fmt
    GIT_REPOSITORY https://github.com/fmtlib/fmt.git
    GIT_TAG        11.0.2
)

FetchContent_Declare(
    spdlog
    GIT_REPOSITORY https://github.com/gabime/spdlog.git
    GIT_TAG        v1.15.0
)

FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG        v1.15.2
)

# 한 번에 모두 가져오기
FetchContent_MakeAvailable(fmt spdlog googletest)
```

### URL로 다운로드

Git 대신 아카이브 파일을 다운로드할 수도 있습니다.

```cmake
FetchContent_Declare(
    json
    URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz
    URL_HASH SHA256=8c4b26bf4b422252e13f332bc5e388ec0ab5c3443d24f...
)

FetchContent_MakeAvailable(json)
```

`URL_HASH`로 무결성을 검증합니다.

### 의존성 옵션 설정

FetchContent로 가져오는 프로젝트의 옵션을 미리 설정할 수 있습니다.

```cmake
include(FetchContent)

# googletest 옵션 설정 (FetchContent_MakeAvailable 전에!)
set(BUILD_GMOCK OFF CACHE BOOL "" FORCE)
set(INSTALL_GTEST OFF CACHE BOOL "" FORCE)

FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG        v1.15.2
)

FetchContent_MakeAvailable(googletest)
```

---

## 시스템 우선, FetchContent 폴백

시스템에 라이브러리가 있으면 사용하고, 없으면 다운로드하는 패턴입니다.

### 수동 방식

```cmake
find_package(fmt QUIET)

if(NOT fmt_FOUND)
    message(STATUS "fmt not found, fetching from GitHub...")
    include(FetchContent)
    FetchContent_Declare(
        fmt
        GIT_REPOSITORY https://github.com/fmtlib/fmt.git
        GIT_TAG        11.0.2
    )
    FetchContent_MakeAvailable(fmt)
endif()

target_link_libraries(myapp PRIVATE fmt::fmt)
```

### CMake 3.24+ 간편 문법

`FIND_PACKAGE_ARGS`를 사용하면 자동으로 먼저 `find_package`를 시도합니다.

```cmake
include(FetchContent)

FetchContent_Declare(
    fmt
    GIT_REPOSITORY https://github.com/fmtlib/fmt.git
    GIT_TAG        11.0.2
    FIND_PACKAGE_ARGS  # 먼저 find_package(fmt) 시도
)

FetchContent_MakeAvailable(fmt)

# 시스템에 있으면 시스템 것, 없으면 다운로드한 것 사용
target_link_libraries(myapp PRIVATE fmt::fmt)
```

---

## ExternalProject

`ExternalProject`는 빌드 시점(configure가 아닌)에 외부 프로젝트를 다운로드/빌드합니다.

```cmake
include(ExternalProject)

ExternalProject_Add(
    external_zlib
    URL https://zlib.net/zlib-1.3.tar.gz
    URL_HASH SHA256=...
    PREFIX ${CMAKE_BINARY_DIR}/external
    CMAKE_ARGS
        -DCMAKE_INSTALL_PREFIX=${CMAKE_BINARY_DIR}/external/install
)
```

### FetchContent vs ExternalProject

| 특성 | FetchContent | ExternalProject |
|------|-------------|-----------------|
| 실행 시점 | Configure (cmake 실행) | Build (make 실행) |
| 타겟 사용 | 즉시 가능 | 복잡함 (DEPENDS 필요) |
| 빌드 통합 | 메인 프로젝트와 함께 | 별도 빌드 |
| CMake가 아닌 프로젝트 | 어려움 | 쉬움 |
| 일반적인 용도 | CMake 프로젝트 | 레거시/비-CMake |

**권장**: 가능하면 `FetchContent`를 사용하세요. ExternalProject는 CMake 프로젝트가 아닌 레거시 라이브러리에 적합합니다.

---

## 패키지 탐색 경로

### CMAKE_PREFIX_PATH

여러 경로를 세미콜론으로 구분합니다.

```bash
cmake -B build -DCMAKE_PREFIX_PATH="/opt/mylibs;/home/user/libs"
```

```cmake
list(APPEND CMAKE_PREFIX_PATH "/opt/mylibs")
```

### <Package>_ROOT

특정 패키지의 설치 위치를 지정합니다.

```bash
cmake -B build -DBoost_ROOT=/opt/boost-1.80
cmake -B build -DOpenSSL_ROOT=/opt/openssl
```

CMake 3.12부터 `<PackageName>_ROOT` 변수가 자동으로 탐색 경로에 포함됩니다.

### 환경 변수

```bash
export CMAKE_PREFIX_PATH="/opt/mylibs:$CMAKE_PREFIX_PATH"
export Boost_ROOT="/opt/boost-1.80"
cmake -B build
```

---

## 실전 예시

```cmake
cmake_minimum_required(VERSION 3.20)
project(MyServer VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)

# === 필수 시스템 의존성 ===
find_package(Threads REQUIRED)
find_package(OpenSSL REQUIRED)

# === 선택적 의존성 (시스템 또는 FetchContent) ===

# fmt: 시스템에 있으면 사용, 없으면 다운로드
find_package(fmt 10.0 QUIET)
if(NOT fmt_FOUND)
    message(STATUS "fmt not found, fetching...")
    FetchContent_Declare(fmt
        GIT_REPOSITORY https://github.com/fmtlib/fmt.git
        GIT_TAG        11.0.2
    )
    FetchContent_MakeAvailable(fmt)
endif()

# spdlog: 위와 같은 패턴
find_package(spdlog 1.12 QUIET)
if(NOT spdlog_FOUND)
    message(STATUS "spdlog not found, fetching...")
    set(SPDLOG_FMT_EXTERNAL ON CACHE BOOL "" FORCE)
    FetchContent_Declare(spdlog
        GIT_REPOSITORY https://github.com/gabime/spdlog.git
        GIT_TAG        v1.15.0
    )
    FetchContent_MakeAvailable(spdlog)
endif()

# === 실행 파일 ===
add_executable(myserver
    src/main.cpp
    src/server.cpp
)

target_link_libraries(myserver PRIVATE
    Threads::Threads
    OpenSSL::SSL
    OpenSSL::Crypto
    fmt::fmt
    spdlog::spdlog
)
```

---

## 흔한 실수

### Imported 타겟 대신 변수 사용

```cmake
# 회피: 레거시 방식
find_package(ZLIB REQUIRED)
target_include_directories(myapp PRIVATE ${ZLIB_INCLUDE_DIRS})
target_link_libraries(myapp PRIVATE ${ZLIB_LIBRARIES})

# Good: Imported 타겟
find_package(ZLIB REQUIRED)
target_link_libraries(myapp PRIVATE ZLIB::ZLIB)
```

### FetchContent 옵션 설정 순서

```cmake
# 회피: 옵션 설정이 MakeAvailable 뒤에
FetchContent_MakeAvailable(googletest)
set(BUILD_GMOCK OFF CACHE BOOL "" FORCE)  # 너무 늦음!

# Good: MakeAvailable 전에 설정
set(BUILD_GMOCK OFF CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)
```

### REQUIRED 없이 _FOUND 체크 누락

```cmake
# 회피: 찾지 못해도 사용 시도
find_package(ZLIB)
target_link_libraries(myapp PRIVATE ZLIB::ZLIB)  # ZLIB 없으면 오류

# Good: REQUIRED 사용
find_package(ZLIB REQUIRED)
target_link_libraries(myapp PRIVATE ZLIB::ZLIB)

# 또는: _FOUND 체크
find_package(ZLIB)
if(ZLIB_FOUND)
    target_link_libraries(myapp PRIVATE ZLIB::ZLIB)
endif()
```

### Git 태그 대신 브랜치 사용

```cmake
# 회피: 브랜치는 변할 수 있음
FetchContent_Declare(fmt
    GIT_REPOSITORY https://github.com/fmtlib/fmt.git
    GIT_TAG        master  # 위험! 내일 다른 코드
)

# Good: 고정된 태그나 커밋 해시
FetchContent_Declare(fmt
    GIT_REPOSITORY https://github.com/fmtlib/fmt.git
    GIT_TAG        11.0.2  # 버전 태그
)
```

---

## 정리

- `find_package`는 시스템에 설치된 라이브러리를 찾습니다.
- **Imported 타겟**(`Pkg::Component`)을 사용하는 것이 권장됩니다.
- `pkg_check_modules`로 pkg-config 라이브러리를 찾습니다.
- **FetchContent**로 구성 시점에 소스를 다운로드합니다.
- 시스템 우선, FetchContent 폴백 패턴을 활용하세요.
- `CMAKE_PREFIX_PATH`, `<Pkg>_ROOT`로 탐색 경로를 지정합니다.
- Git 태그는 **고정된 버전**을 사용하세요.

## 다음 장 예고

Ch 6에서는 테스트와 CTest를 다룹니다. `enable_testing()`, `add_test()`, 그리고 Google Test 연동을 살펴봅니다.

## 참고 자료

- [CMake - find_package](https://cmake.org/cmake/help/latest/command/find_package.html)
- [CMake - FetchContent](https://cmake.org/cmake/help/latest/module/FetchContent.html)
- [cmake-packages(7)](https://cmake.org/cmake/help/latest/manual/cmake-packages.7.html)
