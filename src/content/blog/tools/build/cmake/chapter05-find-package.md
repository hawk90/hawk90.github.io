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

실행 확인은 CMake 4.5.0·Ninja 1.13.2·macOS 27.2·AppleClang 21을 기준으로 합니다. 실제 패키지 예로는 Homebrew로 설치된 fmt 12.2.1과 macOS SDK의 zlib 1.2.12를 썼고, FetchContent·ExternalProject 예제는 GitHub와 zlib.net에서 실제로 내려받아 빌드했습니다. 마지막 예제는 로컬에서 만든 Find 모듈과 Config 파일을 대조하므로 네트워크 없이 재현됩니다.

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

CMake 자체에 `FindXxx.cmake` 스크립트가 내장되어 있습니다(`$CMAKE/Modules/` 디렉터리). Homebrew CMake 4.5.0의 `share/cmake/Modules/`에는 `Find*.cmake`가 162개 있습니다. 이 스크립트는 *전통적인 라이브러리*를 시스템 표준 위치에서 찾아 줍니다 — zlib, OpenSSL, Threads, X11, JPEG 같이 *오래된, 그리고 CMake보다 먼저 존재한* 라이브러리들.

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
5. 내장 모듈 상당수는 *imported 타겟*도 함께 만듦(4.5.0의 `Find*.cmake` 162개 중 116개 파일에 `IMPORTED`나 "Imported Targets"가 나옴, grep 기준). `FindZLIB`의 `ZLIB::ZLIB`는 3.1, `FindJPEG`의 `JPEG::JPEG`와 `FindCURL`의 `CURL::libcurl`은 3.12에 추가됨(각 모듈 문서의 `versionadded`)

이 모드의 한계는 *라이브러리 자체가 아니라 CMake가 검색 로직을 안다*는 점입니다. 라이브러리가 새 버전을 내거나 새 옵션을 추가해도, CMake의 Find 스크립트가 따라가지 못하면 활용할 수 없습니다.

**Config 모드** — *라이브러리가 제공한 정보 파일*

CMake로 빌드하는 라이브러리는 *자기 자신에 대한 CMake 정보 파일*을 설치할 때 함께 깝니다. Homebrew로 설치한 fmt 12.2.1의 디렉터리입니다.

```text
/opt/homebrew/lib/cmake/fmt/
├── fmt-config-version.cmake  ← 버전 정보 (PACKAGE_VERSION "12.2.1")
├── fmt-config.cmake          ← find_package(fmt)가 찾는 파일
├── fmt-targets-release.cmake ← Release 구성의 라이브러리 경로
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

`find_package`가 실제로 어디를 뒤지는지는 모드마다 다르고, 직접 보려면 `--debug-find` 옵션을 씁니다(`--debug-find-pkg`는 3.23에 추가).

```bash
cmake --debug-find -B build
# 또는 특정 패키지만
cmake --debug-find-pkg=fmt -B build
```

이 글 끝의 실전 예제를 4.5.0에서 `--debug-find-pkg=Demo`로 구성하면 Module 모드에서는 Find 스크립트 위치만 찍힙니다.

```text
CMake Debug Log at CMakeLists.txt:7 (find_package):
  find_package considered the following paths for FindDemo.cmake:

    /opt/homebrew/share/cmake/Modules/FindDemo.cmake

  The file was found at

    <src>/cmake/FindDemo.cmake
```

`-DPREFER_CONFIG=ON`으로 Config 모드를 먼저 타게 하면 출력이 훨씬 길어지고, 탐색 위치를 종류별로 나열합니다. 앞부분입니다(`...`는 생략, 경로는 줄임).

```text
  <PackageName>_ROOT CMake variable [CMAKE_FIND_USE_PACKAGE_ROOT_PATH].

    none

  CMAKE_PREFIX_PATH variable [CMAKE_FIND_USE_CMAKE_PATH].

    <src>/prefix
...
  Standard system environment variables
  [CMAKE_FIND_USE_SYSTEM_ENVIRONMENT_PATH].

    /opt/homebrew
    /usr/local
...
```

대괄호 안의 이름은 그 범주를 끄는 변수입니다. 예를 들어 `CMAKE_FIND_USE_SYSTEM_ENVIRONMENT_PATH=OFF`를 주면 `PATH`에서 유도한 prefix를 건너뜁니다.

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

버전 범위는 3.19 릴리스 노트에 나옵니다. 범위 판단은 패키지의 버전 파일(`fmt-config-version.cmake`)이 합니다. Homebrew fmt 12.2.1이 설치된 이 환경에서 세 번째 줄은 이렇게 실패합니다.

```text
CMake Error at CMakeLists.txt:3 (find_package):
  Could not find a configuration file for package "fmt" that is compatible
  with requested version range "10.0...<12.0".

  The following configuration files were considered but not accepted:

    /opt/homebrew/lib/cmake/fmt/fmt-config.cmake, version: 12.2.1
      The version found is not compatible with the version requested.
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

imported 타겟이 생기기 전의 Find 모듈은 결과를 변수로만 돌려줬고, 지금 모듈도 호환을 위해 그 변수들을 함께 채웁니다. `FindJPEG`는 3.12부터 `JPEG::JPEG`를 제공하지만, 아래처럼 변수를 쓰는 옛 코드도 여전히 동작합니다.

```cmake
find_package(JPEG REQUIRED)

# 레거시 방식
target_include_directories(myapp PRIVATE ${JPEG_INCLUDE_DIRS})
target_link_libraries(myapp PRIVATE ${JPEG_LIBRARIES})
```

[cmake-developer(7)](https://cmake.org/cmake/help/latest/manual/cmake-developer.7.html)이 Find 모듈의 표준 결과 변수로 정한 이름 중 자주 보는 것들입니다.

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

Boost는 CMake 버전에 따라 경로가 갈립니다. 3.30에 들어온 정책 `CMP0167`이 NEW이면 CMake 내장 `FindBoost`를 쓰지 않고 Boost 1.70 이상이 설치하는 `BoostConfig.cmake`를 찾습니다. 이 시리즈처럼 최소 버전이 3.25면 정책이 미설정이라, 4.5.0에서 `find_package(Boost)`가 경고를 냅니다(이 Mac에는 Boost가 없어 찾지는 못했습니다).

```text
CMake Warning (policy) at CMakeLists.txt:3 (find_package):
  Policy CMP0167 is not set: The FindBoost module is removed.  Run "cmake
  --help-policy CMP0167" for policy details.  Use the cmake_policy command to
  set the policy and suppress this warning.
...
-- Could NOT find Boost (missing: Boost_INCLUDE_DIR)
```

새 프로젝트라면 `find_package(Boost CONFIG ...)`로 Config 모드를 명시하면 정책과 무관하게 같은 동작을 얻습니다.

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

`IMPORTED_TARGET`을 사용하면 `PkgConfig::<NAME>` 타겟이 생성되어 `target_link_libraries`로 바로 연결할 수 있습니다. `Version: 1.2.0`, `Cflags: -I${includedir} -DFOO_PC=1`을 적은 가짜 `foo.pc`를 `PKG_CONFIG_PATH`에 두고 4.5.0(pkg-config 3.0.10)에서 확인한 결과입니다.

```text
-- Checking for module 'foo>=1.0'
--   Found foo, version 1.2.0
-- FOO_VERSION=1.2.0
-- inc=/opt/foo/include
-- opts=-DFOO_PC=1
-- BAR_FOUND=[]
-- Checking for module 'foo>=2.0'
--   Package dependency requirement 'foo >= 2.0' could not be satisfied.
Package 'foo' has version '1.2.0', required version is '>= 2.0'
CMake Error at /opt/homebrew/share/cmake/Modules/FindPkgConfig.cmake:1243 (message):
  The following required packages were not found:

   - foo>=2.0
```

`inc`·`opts`는 `PkgConfig::FOO`의 `INTERFACE_INCLUDE_DIRECTORIES`·`INTERFACE_COMPILE_OPTIONS`를 읽은 값입니다. `.pc`의 `-I`는 include 경로로, 나머지 플래그는 컴파일 옵션으로 나뉘어 들어갑니다. `QUIET`으로 찾은 없는 패키지 `bar`는 메시지 없이 `BAR_FOUND`가 빈 값이었습니다.

---

## FetchContent — 의존성을 *프로젝트 안에* 가져오기

### 왜 FetchContent인가

지금까지 본 `find_package`는 *시스템에 이미 설치된* 라이브러리를 찾습니다. 사용자가 직접 `apt install`이나 `brew install`을 해야 한다는 뜻입니다. 사용자 환경에 따라 *있을 수도, 없을 수도, 버전이 다를 수도* 있어 불안정합니다.

`FetchContent`는 구성 시점에 소스를 준비하고, CMake 프로젝트이면 그 타겟을 메인 빌드에 추가합니다. 컴파일은 그 뒤 빌드 단계에서 수행합니다. 원격 소스를 사용하려면 네트워크·Git 등의 도구가 필요하고, 의존성의 자체 시스템 요구사항까지 자동으로 해결하는 것은 아닙니다.

이 모델의 장단점은 명확합니다.

**장점**
- *소스 버전 통일*. 모든 개발자와 CI가 같은 소스를 빌드합니다. 다만 그 소스가 내 toolchain에서 컴파일되는지는 별개입니다(아래 ExternalProject 절의 zlib 1.3이 그 예).
- *디버깅 가능*. 의존 라이브러리도 내 빌드에 같이 들어가서 *그 안까지 스텝 인*이 됨.
- *버전 고정*. Git tag로 정확한 상태를 묶을 수 있음.

**단점**
- *빌드 시간 증가*. 내 코드뿐 아니라 의존성도 같이 컴파일.
- *디스크 사용*. 각 프로젝트가 자기 사본을 만듬.
- *시스템 라이브러리 활용 안 함*. 이미 깔린 zlib을 두고 자기 사본을 만들면 비효율.

CMake 3.24는 `FetchContent_Declare`에 `FIND_PACKAGE_ARGS`를 추가해 이 둘을 섞는 길을 열었습니다. 시스템에 있으면 그걸 쓰고, 없으면 가져옵니다. 자세한 건 아래 "시스템 우선, FetchContent 폴백"에서 실행 결과와 함께 봅니다.

### FetchContent vs ExternalProject — *언제 무엇을*

CMake에는 외부 의존성을 다루는 *두 가지 도구*가 있습니다.

| | `ExternalProject` | `FetchContent` |
|---|---|---|
| 등장 시기 | 3.0 이전부터 (3.0 릴리스 노트가 이미 개선 항목으로 언급) | CMake 3.11 (릴리스 노트의 "A new FetchContent module") |
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

`JSON_ARCHIVE_SHA256`에는 릴리스 작성자가 공개한 값을 넣습니다. nlohmann/json v3.11.3의 GitHub 릴리스 설명은 `json.tar.xz`의 SHA-256을 `d6c65aca6b1ed68e7a182f4757257b107ae403032760ed6ef121c9d55e81757d`로 적고 있고, 직접 내려받은 파일의 `shasum -a 256` 결과도 같았습니다. 이 값을 `URL_HASH SHA256=...`에 넣고 4.5.0으로 구성하니 `-- Using the multi-header code from .../_deps/json-src/include/`가 찍혔고, `nlohmann_json::nlohmann_json`을 링크한 프로그램이 빌드·실행됐습니다. 구성이 끝난 시점에 `_deps/`에는 `json-src`·`json-build`·`json-subbuild`가 이미 있습니다. 다운로드가 구성 단계에서 일어났다는 뜻입니다.

### 의존성 옵션 설정

FetchContent로 가져오는 프로젝트의 옵션을 미리 설정할 수 있습니다.

```cmake
include(FetchContent)

# googletest 옵션 설정 (FetchContent_MakeAvailable 전에!)
# 두 옵션은 googletest v1.15.2 최상위 CMakeLists.txt의 option()이며 기본값은 ON
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

`FMT_VERSION`을 찍는 `main.cpp`로 4.5.0에서 세 가지를 돌렸습니다.

| 구성 | 결과 |
|------|------|
| 그대로 (Homebrew fmt 12.2.1 설치됨) | `fmt_DIR=/opt/homebrew/lib/cmake/fmt`, 실행 결과 `fmt 120201`. `_deps/` 없음 |
| `-DCMAKE_DISABLE_FIND_PACKAGE_fmt=ON` | `-- {fmt} version: 11.0.2`, GitHub에서 받아 빌드, 실행 결과 `fmt 110002` |
| `FIND_PACKAGE_ARGS 11.0.2 EXACT` | 12.2.1이 버전 조건에 맞지 않아 11.0.2를 내려받음 |

첫 줄이 이 패턴의 함정입니다. `GIT_TAG 11.0.2`로 고정했어도 `FIND_PACKAGE_ARGS`에 버전이 없으면 시스템에 있는 어떤 버전이든 먼저 채택합니다. 메이저 버전이 다른 라이브러리가 조용히 들어오는 것을 막으려면 `FIND_PACKAGE_ARGS`에 버전 조건을 적습니다.

---

## ExternalProject

`ExternalProject`는 빌드 시점(configure가 아닌)에 외부 프로젝트를 다운로드/빌드합니다.

```cmake
include(ExternalProject)

ExternalProject_Add(
    external_zlib
    URL https://zlib.net/fossils/zlib-1.3.1.tar.gz
    URL_HASH SHA256=9a93b2b7dfdac77ceba5a558a580e74667dd6fede4585b91eefb60f03b72df23
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

해시는 `zlib.net/fossils/`와 GitHub `madler/zlib` 릴리스에서 각각 받은 `zlib-1.3.1.tar.gz`의 SHA-256이 같은 것을 확인한 값입니다. `zlib.net/zlib-1.3.tar.gz`는 지금 404이고, 옛 버전은 `fossils/` 아래로 옮겨져 있습니다.

실행 시점 차이는 디렉터리로 보입니다. 4.5.0에서 구성만 끝낸 상태의 `external/src/external_zlib/`는 비어 있었고, `cmake --build`를 돌린 뒤에야 내려받기·빌드·설치가 진행되어 `external/install/lib/`에 `libz.a`·`libz.1.3.1.dylib`가 생겼습니다.

처음에는 zlib 1.3으로 시도했는데 macOS 27.2 SDK에서 `zutil.c` 컴파일이 `_stdio.h:322:7: error: expected identifier or '('`로 실패했습니다. 1.3의 `zutil.h`는 macOS에서 `#define fdopen(fd,mode) NULL`을 두는데, SDK `_stdio.h` 322행의 `FILE *fdopen(int, const char *)` 선언이 이 매크로로 치환되면서 구문 오류가 됩니다. 1.3.1의 `zutil.h`에는 이 매크로가 없고, 1.3.1로 바꾸자 빌드됐습니다. 외부 빌드는 이렇게 내 toolchain과의 호환성 문제를 빌드 단계에서야 드러냅니다.

ExternalProject의 결과를 링크하려면 별도의 IMPORTED 타겟과 산출물·빌드 의존성도 직접 연결해야 합니다.

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

4.5.0에서 기본 호출은 `source=module`, Config 우선 호출은 `source=config`를 출력했고 둘 다 `local=1`이었습니다. Config 우선 빌드의 캐시에만 `Demo_DIR:PATH=<src>/prefix/lib/cmake/Demo`가 남았습니다. `find_package(Demo CONFIG REQUIRED)`로 바꾸고 `prefix/`를 지우면 Find 모듈이 있어도 이렇게 실패합니다.

```text
CMake Error at CMakeLists.txt:7 (find_package):
  Could not find a package configuration file provided by "Demo" with any of
  the following names:

    Demo.cps
    demo.cps
    DemoConfig.cmake
    demo-config.cmake

  Add the installation prefix of "Demo" to CMAKE_PREFIX_PATH or set
  "Demo_DIR" to a directory containing one of the above files.  If "Demo"
  provides a separate development package or SDK, be sure it has been
  installed.
```

목록 맨 앞의 `.cps`는 CMake 4.3 릴리스 노트가 추가한 Common Package Specification 파일입니다. [find_package 문서](https://cmake.org/cmake/help/latest/command/find_package.html)는 CPS 파일과 `<Name>Config.cmake`가 함께 있을 때 CPS 쪽을 우선하는 경향으로 탐색한다고 적습니다. 같은 빌드 디렉터리를 재사용하면 캐시된 `Demo_DIR`가 탐색을 건너뛰게 하므로, 모드를 바꿀 때마다 새 빌드 디렉터리를 씁니다.

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
target_link_libraries(myapp PRIVATE ZLIB::ZLIB)  # ZLIB 없으면 생성 단계에서 "target was not found" 오류

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

[Ch 6](/blog/tools/build/cmake/chapter06-testing)에서는 테스트와 CTest를 다룹니다. `enable_testing()`, `add_test()`, 그리고 Google Test 연동을 살펴봅니다.

## 참고 자료

- [CMake - find_package](https://cmake.org/cmake/help/v4.4/command/find_package.html)
- [CMake - FetchContent](https://cmake.org/cmake/help/v4.4/module/FetchContent.html)
- [cmake-packages(7)](https://cmake.org/cmake/help/v4.4/manual/cmake-packages.7.html)

## 관련 항목

- [Ch 4: 옵션과 캐시 변수](/blog/tools/build/cmake/chapter04-options) — 탐색 경로와 동작을 옵션으로 제어하기
- [Ch 6: 테스트와 CTest](/blog/tools/build/cmake/chapter06-testing) — 찾아온 테스트 프레임워크를 실제로 붙이기
- [Ch 8: Modern CMake 모범 사례](/blog/tools/build/cmake/chapter08-best-practices) — 의존성 선언을 타겟 중심으로 정리하는 기준
