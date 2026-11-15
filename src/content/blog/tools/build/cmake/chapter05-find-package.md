---
title: "CMake find_package와 외부 의존성 — Module·Config·FetchContent"
slug: "tools/build/cmake/chapter05-find-package"
date: 2026-06-02T09:05:00
description: "외부 라이브러리 탐색, FetchContent, 그리고 의존성 관리."
tags: [cmake, build, cpp, dependencies]
series: "CMake"
seriesOrder: 5
draft: false
topics: ["tools", "tools/build"]
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

이 코드는 패키지의 개발 파일과 탐색 경로가 준비되어 있다는 전제에서 사용합니다. 모든 OS에서 패키지를 자동 설치한다는 뜻은 아닙니다. CMake는:
1. OS와 패키지 매니저별 *표준 경로*를 순회하며 라이브러리를 찾고,
2. 헤더 경로·라이브러리 경로를 *임포트 타겟*(`OpenSSL::SSL`, `ZLIB::ZLIB`)에 묶고,
3. 그 타겟을 사용하는 모든 코드에 *전이적으로 옵션을 전파*합니다.

`target_link_libraries`에 적은 `OpenSSL::SSL`이 어떻게 펼쳐지는지 보면, 결과적으로 위의 `-I.../include` + `-l ssl -l crypto` 같은 컴파일러 옵션이 *자동으로* 명령에 들어갑니다. 하지만 *우리 코드*에서는 이름만 보입니다. 이게 Modern CMake의 큰 그림입니다.

이 챕터는 다음을 다룹니다.

1. `find_package`의 *두 가지 동작 모드* — Module 모드와 Config 모드.
2. 라이브러리가 없는 시스템에서 *FetchContent로 자동 다운로드*하기.
3. `find_package` + FetchContent의 *하이브리드 패턴* (3.24+).

실행 확인은 CMake 4.4.4·Ninja 1.13.2·macOS·AppleClang 21을 기준으로 합니다. 마지막 예제는 로컬에서 만든 Find 모듈과 Config 파일을 대조하고 로컬 FetchContent를 연결합니다. 외부 패키지의 설치 상태나 네트워크에 따라 결과가 바뀌지 않도록 범위를 정했습니다.

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

**우선순위 — 기본 서명은 Module이 먼저**

일반적인 `find_package(X)` 호출은 Module을 먼저 시도하고, 찾지 못하면 Config로 폴백합니다. `CMAKE_FIND_PACKAGE_PREFER_CONFIG=ON`이면 순서를 바꿉니다. 명시적인 CONFIG/MODULE 모드나 dependency provider·FetchContent 리디렉션을 쓰는 경우는 기본 탐색 순서와 구분합니다. [공식 탐색 모드](https://cmake.org/cmake/help/v4.4/command/find_package.html#search-modes)를 기준으로 판단합니다.

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
| `CMAKE_PREFIX_PATH` | CMake 변수는 세미콜론 구분 prefix 목록. `"/opt/myapp;/usr/local"` 형태 |
| `<Package>_DIR` | Config 파일이 들어 있는 디렉터리 지정. 해당 패키지가 Config를 제공할 때 사용 |
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

`FetchContent`는 구성 시점에 소스를 준비하고, CMake 프로젝트이면 그 타겟을 메인 빌드에 추가합니다. 컴파일은 그 뒤 빌드 단계에서 수행합니다. 원격 소스를 사용하려면 네트워크·Git 등의 도구가 필요하고, 의존성의 자체 시스템 요구사항까지 자동으로 해결하는 것은 아닙니다.

이 모델의 장단점은 명확합니다.

**장점**
- *소스 버전 통일*. 같은 소스를 지정할 수 있지만 컴파일러·플랫폼 호환성은 별도로 확인.
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
| 시점 | *빌드 시점*에 다운로드·빌드 | *구성 시점*에 소스 준비 |
| 타겟 노출 | *아니오* — 자체 외부 빌드로 묶임 | *예* — 메인 빌드에 함께 흡수 |
| `target_link_libraries` | 직접 불가, ExternalProject 출력 경로 수동 지정 | 일반 타겟처럼 즉시 링크 가능 |
| 디버깅 | 별도 빌드로 *스텝 인 어려움* | 메인 빌드 일부라 자유롭게 가능 |
| 적합한 자리 | 거대한 외부 도구 (CMake로 안 만든 것도 됨) | C++ 라이브러리 의존성 (대부분의 경우) |

같은 구성에서 타겟을 연결해야 하면 FetchContent를 선택합니다. 별도 toolchain·캐시·설치 단계로 의존성을 격리해야 하면 ExternalProject를 검토합니다. ExternalProject도 CMake 프로젝트를 빌드할 수 있습니다. [FetchContent 개요](https://cmake.org/cmake/help/v4.4/module/FetchContent.html#overview)의 실행 시점 차이가 선택 기준입니다.

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
    URL_HASH "SHA256=${JSON_ARCHIVE_SHA256}"
)

FetchContent_MakeAvailable(json)
```

이 코드는 선언 형식입니다. 실행 전에 해당 릴리스의 신뢰할 수 있는 체크섬을 확인해 `JSON_ARCHIVE_SHA256`에 64자리 SHA-256 값을 설정해야 합니다. 이 글에서는 원격 아카이브를 내려받거나 체크섬을 검증하지 않았습니다. 생략 기호가 든 값을 실제 해시처럼 사용하지 않습니다.

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
    URL_HASH "SHA256=${ZLIB_ARCHIVE_SHA256}"
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

위 코드는 `ZLIB_ARCHIVE_SHA256`에 검증된 체크섬을 제공해야 하는 선언 예제입니다. ExternalProject의 결과를 링크하려면 별도의 IMPORTED 타겟과 산출물·빌드 의존성도 연결해야 합니다.

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

환경 변수는 CMake 리스트 변수와 달리 호스트 OS의 경로 구분자를 사용합니다. 아래는 Unix 계열 셸의 콜론 구분 예이며, Windows 환경 변수는 세미콜론을 사용합니다. [CMAKE_PREFIX_PATH 환경 변수](https://cmake.org/cmake/help/v4.4/envvar/CMAKE_PREFIX_PATH.html)와 CMake 변수의 표현을 구분합니다.

```bash
export CMAKE_PREFIX_PATH="/opt/mylibs:$CMAKE_PREFIX_PATH"
export Boost_ROOT="/opt/boost-1.80"
cmake -B build
```

---

## 실전 예시 — 설치 패키지 없이 탐색 순서 확인하기

외부 패키지 설치 상태를 추측하는 대신, 같은 이름의 Find 모듈과 Config 파일을 직접 만들어 어느 쪽이 선택되는지 확인합니다. 다음 다섯 파일은 이 절에서 만든 검증용 패키지입니다. 실제 배포 패키지의 구현 예제가 아닙니다.

```cmake title="CMakeLists.txt"
cmake_minimum_required(VERSION 3.25)
project(FindCheck LANGUAGES CXX)
option(PREFER_CONFIG "Search Config before Module" OFF)
set(CMAKE_FIND_PACKAGE_PREFER_CONFIG "${PREFER_CONFIG}")
list(PREPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake")
list(PREPEND CMAKE_PREFIX_PATH "${CMAKE_CURRENT_SOURCE_DIR}/prefix")
find_package(Demo REQUIRED)
include(FetchContent)
FetchContent_Declare(Greeter
    SOURCE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/vendor/greeter"
)
FetchContent_MakeAvailable(Greeter)
add_executable(app main.cpp)
target_link_libraries(app PRIVATE Demo::Demo Local::Greeter)
```

Find 모듈은 선택된 경로를 소비자 매크로로 전달합니다.

```cmake title="cmake/FindDemo.cmake"
add_library(Demo::Demo INTERFACE IMPORTED)
set_property(TARGET Demo::Demo PROPERTY
    INTERFACE_COMPILE_DEFINITIONS DEMO_SOURCE="module")
set(Demo_FOUND TRUE)
```

Config 파일은 같은 타겟 이름에 다른 값을 설정합니다.

```cmake title="prefix/lib/cmake/Demo/DemoConfig.cmake"
add_library(Demo::Demo INTERFACE IMPORTED)
set_property(TARGET Demo::Demo PROPERTY
    INTERFACE_COMPILE_DEFINITIONS DEMO_SOURCE="config")
```

로컬 FetchContent 프로젝트는 추가 사용 요구사항을 제공합니다. 이 예제는 원격 다운로드를 수행하지 않습니다.

```cmake title="vendor/greeter/CMakeLists.txt"
cmake_minimum_required(VERSION 3.25)
project(Greeter LANGUAGES NONE)
add_library(greeter INTERFACE)
add_library(Local::Greeter ALIAS greeter)
target_compile_definitions(greeter INTERFACE LOCAL_AVAILABLE=1)
```

프로그램은 선택된 패키지와 로컬 의존성의 값을 출력합니다.

```cpp title="main.cpp"
#include <iostream>
int main() {
    std::cout << "source=" << DEMO_SOURCE << '\n';
    std::cout << "local=" << LOCAL_AVAILABLE << '\n';
}
```

Ninja가 있는 macOS·Linux 셸에서 빌드 디렉터리를 나누어 실행합니다.

```bash
cmake -S . -B build-module -G Ninja
cmake --build build-module
./build-module/app
cmake -S . -B build-config -G Ninja -DPREFER_CONFIG=ON
cmake --build build-config
./build-config/app
```

기본 호출은 `source=module`, Config 우선 호출은 `source=config`를 출력하며 둘 다 `local=1`을 출력합니다. 기본 호출에서도 `find_package(Demo CONFIG REQUIRED)`로 바꾸면 Config만 선택합니다. Config 파일을 치우고 CONFIG만 요구하면 Find 모듈이 있어도 탐색에 실패합니다. 각 경우 새 빌드 디렉터리를 사용해야 이전 `Demo_DIR` 캐시의 영향을 구분하기 쉽습니다.

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

- [CMake - find_package](https://cmake.org/cmake/help/v4.4/command/find_package.html)
- [CMake - FetchContent](https://cmake.org/cmake/help/v4.4/module/FetchContent.html)
- [cmake-packages(7)](https://cmake.org/cmake/help/v4.4/manual/cmake-packages.7.html)

## 관련 항목

- [Ch 4: 옵션과 캐시 변수](/blog/tools/build/cmake/chapter04-options) — 탐색 경로와 동작을 옵션으로 제어하기
- [Ch 6: 테스트와 CTest](/blog/tools/build/cmake/chapter06-testing) — 찾아온 테스트 프레임워크를 실제로 붙이기
- [Ch 8: Modern CMake 모범 사례](/blog/tools/build/cmake/chapter08-best-practices) — 의존성 선언을 타겟 중심으로 정리하는 기준
