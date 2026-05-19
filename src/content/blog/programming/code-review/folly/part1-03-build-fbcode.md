---
title: "Part 1-03: Build / fbcode 환경 — monorepo의 그림자"
date: 2026-05-23T03:00:00
description: "Folly의 빌드 구조 — Meta 내부 fbcode/Buck, OSS는 CMake. 외부 빌드에서 마주치는 함정."
series: "Folly Code Review"
seriesOrder: 3
tags: [cpp, folly, build, fbcode, monorepo, cmake]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: false
---

> **한 줄 요약**: Folly는 Meta 내부에서는 Buck/fbcode 안에서만 빌드되도록 자라났고, OSS CMake 빌드는 *그 그림자*다. 외부 사용자가 마주치는 빌드 문제 대부분은 이 비대칭에서 나온다.

## 동기 — fbcode가 무엇인가

fbcode는 Meta의 C++ monorepo다. 모든 라이브러리, 모든 binary가 단일 디렉터리 트리 안에 있고 단일 빌드 시스템(Buck2)이 이를 본다. fbcode 안에서는 다음 가정이 항상 참이다.

- 모든 코드가 같은 clang 버전으로 컴파일된다.
- 모든 라이브러리가 같은 정적 링크 ABI를 갖는다.
- 의존성은 path로 표현되며 version은 없다.
- jemalloc이 항상 링크된다.
- glog/gflags가 항상 사용 가능하다.

Folly는 이 가정 위에 자라났다. 그래서 외부 빌드는 이 가정을 다시 만들거나, 만들지 못한 부분을 우회해야 한다.

## OSS 빌드 옵션

```text
방법                | 난이도 | 권장 |
─────────────────────────────────────
getdeps.py (Meta 제공) | 낮음   | 신규 개발 |
vcpkg              | 중간   | Windows/macOS |
Conan              | 중간   | CI 통합 |
직접 CMake          | 높음   | 시스템 통합 |
```

### getdeps.py — 가장 안전한 길

Meta가 직접 유지하는 빌드 스크립트다. 의존성을 Folly가 검증한 버전으로 가져와 빌드한다.

```bash
git clone https://github.com/facebook/folly.git
cd folly
python3 build/fbcode_builder/getdeps.py install-system-deps --recursive
python3 build/fbcode_builder/getdeps.py build --no-tests folly
python3 build/fbcode_builder/getdeps.py show-inst-dir folly
```

장점은 조합이 검증돼 있다는 점이다. 단점은 시스템에 자체 의존성 트리(`/tmp/fbcode_builder_getdeps-...`)를 만들어둔다는 점이다.

### vcpkg

```bash
./vcpkg install folly
```

`folly` 포트는 `boost-context`, `boost-thread`, `gflags`, `glog`, `double-conversion`, `fmt`, `libevent`, `openssl`, `zstd` 등을 자동으로 끌어온다. 호스트 triplet에 따라 빌드 시간이 30분에서 수 시간 사이다.

### 직접 CMake

```cmake
cmake_minimum_required(VERSION 3.20)
project(my_app)

find_package(Boost 1.83 REQUIRED COMPONENTS context thread)
find_package(gflags REQUIRED)
find_package(glog REQUIRED)
find_package(fmt REQUIRED)
find_package(Folly REQUIRED)

add_executable(app main.cpp)
target_link_libraries(app PRIVATE Folly::folly)
target_compile_features(app PRIVATE cxx_std_20)
```

`find_package(Folly)`가 발견하는 `FollyConfig.cmake`는 빌드 시점의 의존성 위치를 박아둔다. CMake cache가 stale이면 헷갈리는 에러가 난다.

## 흔한 빌드 함정

### 1. Boost 버전 충돌

```text
error: 'apply' is not a member of 'boost::context'
```

Folly가 요구하는 Boost.Context API가 시스템 Boost와 다르면 발생한다. Folly는 최소 Boost 1.74 이상을 요구하고 commit에 따라 더 높을 수 있다.

### 2. jemalloc 누락

```text
warning: jemalloc not found; using system allocator
```

Folly의 fbvector/fbstring은 jemalloc의 `nallocx()`/`xallocx()`를 활용한 size class 정렬에 의존한다. 빠지면 동작은 하지만 성능 이득의 절반이 사라진다.

```cmake
find_package(Jemalloc)
if (JEMALLOC_FOUND)
  target_compile_definitions(folly PRIVATE FOLLY_HAVE_JEMALLOC=1)
endif()
```

### 3. ABI mismatch

```text
undefined symbol: folly::detail::function::createBuffer(...)
```

Folly 라이브러리와 application이 다른 ABI 옵션으로 빌드됐다. `_GLIBCXX_USE_CXX11_ABI` flag, `-D_FORTIFY_SOURCE`, sanitizer 플래그 등이 mismatch의 흔한 원인이다.

해법은 단순하다. 모든 의존성을 같은 toolchain으로 다시 빌드한다. 시스템 패키지 매니저의 Folly를 신뢰하지 말고 직접 빌드한다.

### 4. C++ 표준 mismatch

Folly는 commit에 따라 C++17 또는 C++20 요구가 다르다. 응용도 같은 표준으로 컴파일해야 한다. 헤더에 `if constexpr`로 분기되는 코드가 많아 표준이 어긋나면 link error가 나기 쉽다.

### 5. CMake `find_package(Folly)` 실패

```cmake
set(Folly_DIR /opt/folly/lib/cmake/folly)
find_package(Folly REQUIRED)
```

## fbcode 내부 vs OSS — 같은 코드가 다르게 동작하는 부분

| 영역 | fbcode 내부 | OSS |
|------|-------------|-----|
| `folly::Singleton` | 자동 leak detector 통합 | 수동 |
| `folly::SymbolizedFrame` | Meta symbol server 사용 | libdwarf |
| `folly::AsyncSocket` | Meta tooling 통합 | libevent만 |
| `folly::ssl::*` | Meta cert store | 시스템 OpenSSL |
| benchmark macros | Meta perf infra | 단독 binary |

OSS 사용자가 문서에 적힌 대로 했는데 안 되는 경우 대부분 이 격차에서 나온다. 의심되면 issue tracker에서 동일 증상을 검색한다.

## 권장 빌드 워크플로

```bash
# 1. getdeps.py로 검증된 조합 빌드
git clone https://github.com/facebook/folly.git
cd folly
git checkout v2024.11.04.00      # 특정 release 고정
python3 build/fbcode_builder/getdeps.py install-system-deps --recursive
python3 build/fbcode_builder/getdeps.py build folly

# 2. 결과물 export
INST=$(python3 build/fbcode_builder/getdeps.py show-inst-dir folly)
echo "Install: $INST"

# 3. application 빌드
cmake -B build -S . \
  -DCMAKE_PREFIX_PATH=$INST \
  -DCMAKE_BUILD_TYPE=Release
cmake --build build
```

CI에서는 위 과정을 Docker image로 캐싱한다. Folly 빌드 자체가 무거우므로 매 PR마다 다시 빌드하지 않는다.

## 코드 리뷰 포인트

- **Folly 버전이 고정돼 있는가?** `main` branch를 추적하면 어느 날 갑자기 빌드가 깨진다. tag(`vYYYY.MM.DD.PP`) 단위로 고정한다.
- **의존성이 외부에 노출되는가?** 라이브러리가 헤더에서 `folly/*`를 include하면 다운스트림도 같은 Folly를 빌드해야 한다.
- **jemalloc이 링크되는가?** `nm app | grep jemalloc`으로 확인한다.

## 자주 보는 안티패턴

```cmake
# 1. Folly만 별도 toolchain — ABI 충돌
find_package(Folly REQUIRED)   # 시스템 패키지
add_executable(app ...)
target_compile_options(app PRIVATE -D_GLIBCXX_USE_CXX11_ABI=0)
# Folly는 ABI=1로 빌드돼 있음 — link error

# 2. main branch 추적
FetchContent_Declare(folly GIT_REPOSITORY ... GIT_TAG main)
# 어느 날 빌드가 깨짐
```

```cpp
// 3. Public header에서 folly include
// MyApi.h
#include <folly/Optional.h>
// 다운스트림이 Folly 의존성을 떠안음 — SDK 부적합
```

## 정리

- Folly는 fbcode/Buck 환경을 전제로 자랐다. OSS 빌드는 그 환경을 재구성해야 한다.
- `getdeps.py`가 가장 검증된 길이고, vcpkg/Conan이 그다음이다.
- ABI mismatch의 99%는 같은 toolchain으로 다시 빌드하면 해결된다.
- 라이브러리 SDK의 public header에 Folly type을 노출하지 마라.
- Folly 버전은 tag로 고정하고 CI에서 Docker image로 캐싱한다.

## 다음 편

[Part 1-04: API stability 정책](/blog/programming/code-review/folly/part1-04-api-stability)에서 Folly의 "어떤 보장도 없음" 정책이 실전에 어떻게 작동하는지 본다.

## 관련 항목

- [Folly Part 1-02 — 철학](/blog/programming/code-review/folly/part1-02-folly-vs-abseil-philosophy)
- [Abseil Part 1-03 — Build & Dependency (Bazel)](/blog/programming/code-review/abseil/part1-03-build-dependency-bazel)
