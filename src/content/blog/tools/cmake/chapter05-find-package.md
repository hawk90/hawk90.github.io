---
title: "Ch 5: find_package와 외부 의존성"
date: 2025-05-14T14:00:00
description: "외부 라이브러리 탐색, FetchContent, 그리고 의존성 관리."
tags: [cmake, build, cpp, dependencies]
series: "CMake"
seriesOrder: 5
draft: false
---

## 왜 find_package가 필요한가

프로젝트가 외부 라이브러리를 사용한다고 가정합니다. OpenSSL로 암호화를 하고, zlib으로 압축을 합니다. Makefile로 직접 작성하면 이렇게 됩니다.

```makefile
# Linux
CFLAGS += -I/usr/include/openssl
LDFLAGS += -L/usr/lib -lssl -lcrypto -lz

# macOS (Homebrew)
CFLAGS += -I/opt/homebrew/opt/openssl/include
LDFLAGS += -L/opt/homebrew/opt/openssl/lib -lssl -lcrypto -lz

# Windows
# ... 또 다른 경로
```

플랫폼마다 라이브러리 경로가 다릅니다. 버전이 바뀌면 경로도 바뀝니다. 이 정보를 직접 관리하는 것은 고통입니다.

CMake의 `find_package`는 이 문제를 해결합니다. 라이브러리 이름만 지정하면 CMake가 알아서 찾습니다.

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

CMake가 플랫폼별 경로를 처리하고, 인클루드 디렉터리와 링크 플래그를 자동으로 설정합니다.

---

## find_package 기초

### 기본 사용법

```cmake
find_package(ZLIB REQUIRED)

add_executable(myapp main.cpp)
target_link_libraries(myapp PRIVATE ZLIB::ZLIB)
```

`REQUIRED`는 필수 의존성을 의미합니다. 찾지 못하면 CMake가 오류로 중단합니다.

### 동작 방식

CMake는 두 가지 모드로 패키지를 찾습니다.

![find_package — Config vs Module 모드](/images/blog/cmake/diagrams/ch05-find-package-modes.svg)

**Config 모드**: 패키지가 제공하는 `<Package>Config.cmake` 파일을 찾습니다. 현대 라이브러리는 대부분 이 파일을 제공합니다.

**Module 모드**: CMake에 포함된 `Find<Package>.cmake` 모듈을 실행합니다. 레거시 라이브러리나 Config 파일이 없는 경우에 사용됩니다.

Config 모드가 우선입니다.

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
find_package(fmt 9.0...<11.0 REQUIRED)  # CMake 3.19+
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

## FetchContent

`FetchContent`는 CMake 구성 시점에 외부 프로젝트를 다운로드합니다. 시스템에 라이브러리가 설치되어 있지 않아도 빌드할 수 있습니다.

### 기본 사용법

```cmake
include(FetchContent)

FetchContent_Declare(
    fmt
    GIT_REPOSITORY https://github.com/fmtlib/fmt.git
    GIT_TAG        10.1.1
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
    GIT_TAG        10.1.1
)

FetchContent_Declare(
    spdlog
    GIT_REPOSITORY https://github.com/gabime/spdlog.git
    GIT_TAG        v1.12.0
)

FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG        v1.14.0
)

# 한 번에 모두 가져오기
FetchContent_MakeAvailable(fmt spdlog googletest)
```

### URL로 다운로드

Git 대신 아카이브 파일을 다운로드할 수도 있습니다.

```cmake
FetchContent_Declare(
    json
    URL https://github.com/nlohmann/json/releases/download/v3.11.2/json.tar.xz
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
    GIT_TAG        v1.14.0
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
        GIT_TAG        10.1.1
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
    GIT_TAG        10.1.1
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
find_package(fmt 9.0 QUIET)
if(NOT fmt_FOUND)
    message(STATUS "fmt not found, fetching...")
    FetchContent_Declare(fmt
        GIT_REPOSITORY https://github.com/fmtlib/fmt.git
        GIT_TAG        10.1.1
    )
    FetchContent_MakeAvailable(fmt)
endif()

# spdlog: 위와 같은 패턴
find_package(spdlog 1.10 QUIET)
if(NOT spdlog_FOUND)
    message(STATUS "spdlog not found, fetching...")
    set(SPDLOG_FMT_EXTERNAL ON CACHE BOOL "" FORCE)
    FetchContent_Declare(spdlog
        GIT_REPOSITORY https://github.com/gabime/spdlog.git
        GIT_TAG        v1.12.0
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
    GIT_TAG        10.1.1  # 버전 태그
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
