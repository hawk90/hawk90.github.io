---
title: "Part 1-03: Build & dependency (Bazel vs CMake)"
date: 2026-05-23T03:00:00
description: "Part 1-03: Abseil 빌드 — Bazel(WORKSPACE/MODULE) vs CMake(FetchContent), vcpkg/Conan 패키지 매니저."
series: "Abseil Code Review"
seriesOrder: 3
tags: [cpp, abseil, build, bazel, cmake, vcpkg, conan]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

> **한 줄 요약**: Abseil은 Bazel-first 라이브러리지만 CMake도 동급으로 지원한다. 패키지 매니저(vcpkg/Conan)는 LTS 스냅숏만 다루고, source build가 ABI 안전성의 기본 전제다.

## 어떤 문제를 푸는가

C++의 빌드 생태계는 분열되어 있다. Bazel, CMake, Meson, Buck, MSBuild가 공존하고 각자의 관습이 다르다. 라이브러리 저자는 어느 빌드 시스템을 first-class로 다룰지 정해야 한다. Abseil의 답은 **Bazel을 우선하되 CMake를 동등하게 지원**한다.

여기에 더해 ABI 정책이 빌드 방식에 직접 영향을 미친다. "단일 빌드 단위 내에서만 ABI 호환을 보장"하므로, 사전 빌드된 binary를 갖다 쓰는 것보다 source build가 권장된다.

## Bazel — first-class

Bazel은 Google이 만든 빌드 시스템이고 Abseil이 사내에서 사용하는 도구다. 그래서 Abseil의 BUILD 파일은 사내 코드와 동일한 룰을 따른다.

### WORKSPACE 방식 (Bazel 5 이전)

```python
# WORKSPACE
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

http_archive(
    name = "com_google_absl",
    sha256 = "f50e5ac311a81382da7fa75b97310e4b9006474f9560ac46f54a9967f07d4ae3",
    strip_prefix = "abseil-cpp-20240722.0",
    urls = ["https://github.com/abseil/abseil-cpp/releases/download/20240722.0/abseil-cpp-20240722.0.tar.gz"],
)
```

### MODULE.bazel 방식 (Bazel 6+)

```python
# MODULE.bazel — bzlmod
bazel_dep(name = "abseil-cpp", version = "20240722.0")
```

bzlmod는 의존성 충돌을 자동으로 해소해주고, 같은 라이브러리의 여러 버전이 transitive하게 들어오는 문제를 해결한다. Bazel 7부터 기본이 되었다.

### BUILD 파일에서 사용

```python
cc_library(
    name = "my_lib",
    srcs = ["my_lib.cc"],
    hdrs = ["my_lib.h"],
    deps = [
        "@com_google_absl//absl/strings",
        "@com_google_absl//absl/status",
        "@com_google_absl//absl/container:flat_hash_map",
    ],
)
```

target 이름은 sub-library 단위로 잘게 나뉘어 있다. `absl::strings`를 쓴다고 해서 `absl::container`가 따라오지 않는다. 필요한 것만 명시한다.

## CMake — second-class지만 동등

CMake는 외부 사용자의 다수가 쓰기 때문에 Abseil이 동등한 수준으로 지원한다. 두 가지 방식이 있다.

### FetchContent 방식 (권장)

```cmake
cmake_minimum_required(VERSION 3.16)
project(my_project CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)
FetchContent_Declare(
    abseil-cpp
    GIT_REPOSITORY https://github.com/abseil/abseil-cpp.git
    GIT_TAG 20240722.0
)
set(ABSL_PROPAGATE_CXX_STD ON)
set(BUILD_TESTING OFF)
FetchContent_MakeAvailable(abseil-cpp)

add_executable(my_app main.cc)
target_link_libraries(my_app PRIVATE
    absl::strings
    absl::status
    absl::flat_hash_map
)
```

`ABSL_PROPAGATE_CXX_STD`를 켜야 Abseil이 사용자 프로젝트의 C++ 표준 설정을 따른다. 끄면 Abseil이 자체적으로 C++ 표준을 결정하고, 사용자 프로젝트와 불일치할 수 있다.

### add_subdirectory 방식

```cmake
# Abseil source를 third_party/abseil-cpp에 git submodule로 둔 경우
set(ABSL_PROPAGATE_CXX_STD ON)
add_subdirectory(third_party/abseil-cpp)

target_link_libraries(my_app PRIVATE absl::strings)
```

submodule을 직접 관리하고 싶을 때 쓴다. 보안 감사를 통과해야 하는 환경에서 외부 fetch가 금지된 경우 자주 본다.

### find_package 방식 (시스템 설치)

```cmake
find_package(absl REQUIRED)
target_link_libraries(my_app PRIVATE absl::strings)
```

시스템에 미리 설치된 Abseil을 쓴다. apt/yum/brew로 깔린 버전. ABI 정책 때문에 권장되지 않는다.

## CMake target 이름

CMake에서 노출되는 target은 Bazel의 sub-library와 1:1로 대응한다.

| Bazel | CMake |
|---|---|
| `@com_google_absl//absl/strings` | `absl::strings` |
| `@com_google_absl//absl/status` | `absl::status` |
| `@com_google_absl//absl/status:statusor` | `absl::statusor` |
| `@com_google_absl//absl/container:flat_hash_map` | `absl::flat_hash_map` |
| `@com_google_absl//absl/synchronization` | `absl::synchronization` |
| `@com_google_absl//absl/time` | `absl::time` |

CMake도 sub-library 단위로 link 해야 한다. `absl::all` 같은 통짜 target은 의도적으로 제공하지 않는다.

## vcpkg

Microsoft의 vcpkg는 LTS 스냅숏만 다룬다.

```bash
vcpkg install abseil
```

```cmake
find_package(absl CONFIG REQUIRED)
target_link_libraries(my_app PRIVATE absl::strings absl::status)
```

vcpkg는 두 모드가 있다. **classic mode**는 시스템 전역에 설치하는 방식이고, **manifest mode**는 프로젝트별로 의존성을 lockfile로 관리한다.

```json
{
    "name": "my-project",
    "version": "1.0.0",
    "dependencies": [
        "abseil"
    ],
    "builtin-baseline": "..."
}
```

manifest mode가 권장된다. lockfile이 reproducible build를 보장한다.

## Conan

JFrog의 Conan도 LTS만 다룬다.

```text
# conanfile.txt
[requires]
abseil/20240722.0

[generators]
CMakeDeps
CMakeToolchain
```

```bash
conan install . --output-folder=build --build=missing
cmake -B build -DCMAKE_TOOLCHAIN_FILE=build/conan_toolchain.cmake
cmake --build build
```

Conan은 source build와 prebuilt 둘 다 지원한다. ABI 안전성을 생각하면 source build (`--build=abseil`)를 권장한다.

## ABI와 빌드 방식의 관계

빌드 방식별 ABI 안전성을 정리하면 다음과 같다.

| 방식 | ABI 안전성 | 이유 |
|---|---|---|
| Bazel | 안전 | 전체 의존성을 같은 옵션으로 source build |
| CMake FetchContent | 안전 | 사용자 프로젝트와 같이 빌드 |
| CMake add_subdirectory | 안전 | 같은 빌드 |
| vcpkg manifest + source | 안전 | lockfile 기반 source build |
| Conan source build | 안전 | source build |
| Conan prebuilt | 위험 | 다른 사람이 빌드한 binary |
| 시스템 패키지 (apt/yum) | 위험 | 시스템 컴파일러 옵션에 묶임 |

## 의존성 그래프

Abseil 내부의 sub-library는 서로 의존한다. 예를 들어 `absl::status`는 `absl::strings`에 의존한다. CMake target은 이 의존을 자동으로 전파한다.

```cmake
target_link_libraries(my_app PRIVATE absl::status)
# absl::strings, absl::synchronization 등이 자동으로 따라온다
```

Bazel도 동일하다. transitive dependency가 자동 해결된다.

## 빌드 옵션

Abseil이 노출하는 주요 옵션은 다음과 같다.

```cmake
set(ABSL_PROPAGATE_CXX_STD ON)         # 사용자 C++ 표준을 따름
set(ABSL_USE_EXTERNAL_GOOGLETEST OFF)
set(ABSL_FIND_GOOGLETEST OFF)
set(BUILD_TESTING OFF)
set(ABSL_ENABLE_INSTALL OFF)           # 시스템 설치 안 함
```

`ABSL_PROPAGATE_CXX_STD`를 켜는 것이 거의 항상 정답이다.

## 코드 리뷰 포인트

```cmake
# 회피 — find_package(absl) 단독
find_package(absl REQUIRED)
# 시스템에 깔린 Abseil을 가정. 빌드 환경마다 결과가 다를 수 있다.

# Good — FetchContent로 명시적 버전 고정
FetchContent_Declare(abseil-cpp GIT_TAG 20240722.0)
```

```python
# 회피 — Bazel WORKSPACE에 git_repository(branch="master")
git_repository(name = "com_google_absl", remote = "...", branch = "master")
# 빌드마다 다른 commit을 가져올 수 있음.

# Good — http_archive에 sha256 고정
http_archive(name = "com_google_absl", sha256 = "f50e...", urls = [...])
```

리뷰에서 봐야 할 것은 세 가지다.

1. **버전이 명시되어 있는가** — branch가 아닌 tag/commit/sha256 고정.
2. **source build인가 prebuilt인가** — ABI 정책에 맞는지.
3. **C++ 표준이 일치하는가** — `ABSL_PROPAGATE_CXX_STD` 또는 동등한 설정.

## 자주 보는 안티패턴

```cmake
# 회피 — Abseil을 PUBLIC으로 expose
target_link_libraries(my_lib PUBLIC absl::strings)
# 사용자 코드가 자동으로 Abseil header를 보게 됨.
# 사용자가 다른 버전의 Abseil을 쓰고 있다면 충돌.

# Good — 가능하면 PRIVATE
target_link_libraries(my_lib PRIVATE absl::strings)
# 인터페이스에 string_view 같은 type이 노출되면 어쩔 수 없이 PUBLIC.
```

```cmake
# 회피 — system Abseil + bundled Abseil 혼용
find_package(absl REQUIRED)
add_subdirectory(third_party/abseil-cpp)  # 충돌
```

## 정리

- Bazel이 first-class, CMake가 동등한 second-class.
- vcpkg, Conan은 LTS만 다루고, source build가 ABI 안전성의 전제.
- CMake target은 sub-library 단위로 나뉘어 있다. `absl::all`은 없다.
- 버전 고정과 source build를 우선한다. branch 기반 fetch, prebuilt mix는 피한다.

## 다음 편

Part 1-04에서 LTS와 HEAD의 차이를 깊이 본다. 어떤 프로젝트가 어느 모드를 선택해야 하는지, 모드 간 마이그레이션 비용이 얼마나 드는지를 다룬다.

## 관련 항목

- [Part 1-02: Design philosophy](/blog/programming/code-review/abseil/part1-02-design-philosophy)
- [Part 1-04: LTS vs HEAD release model](/blog/programming/code-review/abseil/part1-04-lts-vs-head-release)
- [Part 1-05: Versioning & ABI 호환성](/blog/programming/code-review/abseil/part1-05-versioning-abi)
- [원문 — Abseil quickstart (CMake)](https://abseil.io/docs/cpp/quickstart-cmake)
- [원문 — Abseil quickstart (Bazel)](https://abseil.io/docs/cpp/quickstart)
