---
title: "항목 1: Abseil 소개 — Google의 오픈소스 C++ 라이브러리"
date: 2026-05-18T01:00:00
description: "Google의 Abseil 라이브러리 소개와 설계 철학, 주요 컴포넌트를 살펴봅니다."
tags: [C++, Abseil, Google, Library]
series: "Abseil C++ 라이브러리"
seriesOrder: 1
draft: true
---

## Abseil이란?

**Abseil**은 Google이 내부적으로 사용하는 C++ 코드베이스를 오픈소스로 공개한 라이브러리입니다. 이름은 "Augmented Base Libraries"의 약자로, C++ 표준 라이브러리를 보완하는 역할을 합니다.

```cpp
#include "absl/strings/str_cat.h"
#include "absl/container/flat_hash_map.h"

// 문자열 연결 - 효율적이고 타입 안전
std::string result = absl::StrCat("Hello, ", name, "! You have ", count, " messages.");

// 고성능 해시맵
absl::flat_hash_map<std::string, int> cache;
```

## 왜 Abseil인가?

### 1. C++ 표준의 미래를 미리 사용

Abseil은 아직 표준에 포함되지 않은 기능들을 제공합니다:

```cpp
// C++17 이전에도 사용 가능한 std::optional 대체
absl::optional<int> maybe_value;

// C++17 이전에도 사용 가능한 std::string_view 대체
absl::string_view sv = "Hello";

// C++20의 std::span 대체
absl::Span<int> span(array);
```

### 2. 표준보다 빠른 구현체

특히 컨테이너에서 성능 차이가 두드러집니다:

```cpp
// std::unordered_map보다 2-3배 빠름
absl::flat_hash_map<K, V> fast_map;

// std::unordered_set보다 빠름
absl::flat_hash_set<T> fast_set;

// 메모리 효율적인 inline vector
absl::InlinedVector<int, 4> small_vec;  // 4개까지는 힙 할당 없음
```

### 3. 누락된 유틸리티 제공

```cpp
// 문자열 조작
std::vector<std::string> parts = absl::StrSplit(input, ',');
std::string joined = absl::StrJoin(parts, ", ");

// 시간 처리
absl::Time now = absl::Now();
absl::Duration timeout = absl::Seconds(30);

// 상태 코드
absl::Status status = DoSomething();
if (!status.ok()) {
    LOG(ERROR) << status.message();
}
```

## 주요 컴포넌트

### 문자열 (absl/strings)

```cpp
#include "absl/strings/str_cat.h"
#include "absl/strings/str_split.h"
#include "absl/strings/str_join.h"
#include "absl/strings/substitute.h"

// 효율적인 문자열 연결
std::string s = absl::StrCat(a, b, c, d);  // 한 번의 할당

// 문자열 분리
std::vector<std::string> v = absl::StrSplit("a,b,c", ',');

// 문자열 결합
std::string joined = absl::StrJoin(v, "-");  // "a-b-c"

// 포맷팅 (printf 스타일보다 안전)
std::string msg = absl::Substitute("User $0 has $1 points", name, score);
```

### 컨테이너 (absl/container)

```cpp
#include "absl/container/flat_hash_map.h"
#include "absl/container/flat_hash_set.h"
#include "absl/container/inlined_vector.h"
#include "absl/container/btree_map.h"

// Swiss table 기반 해시맵 (매우 빠름)
absl::flat_hash_map<std::string, int> map;

// 순서 유지 + 빠른 검색
absl::btree_map<std::string, int> ordered_map;

// Small Buffer Optimization
absl::InlinedVector<int, 8> vec;  // 8개까지 스택에 저장
```

### 시간 (absl/time)

```cpp
#include "absl/time/time.h"
#include "absl/time/clock.h"

absl::Time start = absl::Now();
DoWork();
absl::Duration elapsed = absl::Now() - start;

// 단위 변환이 명시적
int64_t ms = absl::ToInt64Milliseconds(elapsed);
absl::Duration timeout = absl::Seconds(5) + absl::Milliseconds(500);

// 시간대 지원
absl::TimeZone tz;
absl::LoadTimeZone("America/Los_Angeles", &tz);
std::string formatted = absl::FormatTime("%Y-%m-%d", start, tz);
```

### 상태 (absl/status)

```cpp
#include "absl/status/status.h"
#include "absl/status/statusor.h"

absl::Status ValidateInput(const Request& req) {
    if (req.name().empty()) {
        return absl::InvalidArgumentError("Name cannot be empty");
    }
    return absl::OkStatus();
}

absl::StatusOr<User> GetUser(int id) {
    auto user = database.Find(id);
    if (!user) {
        return absl::NotFoundError(absl::StrCat("User ", id, " not found"));
    }
    return *user;
}

// 사용
auto result = GetUser(42);
if (result.ok()) {
    ProcessUser(*result);
} else {
    LOG(ERROR) << result.status();
}
```

## 설계 철학

### Living at Head

Abseil은 "Living at Head" 철학을 따릅니다:

> **항상 최신 버전을 사용하라**

- 버전 번호 없음
- 지속적인 업데이트
- API 변경 시 자동 마이그레이션 도구 제공

```bash
# 권장 사용법: 항상 main 브랜치 추적
git submodule add https://github.com/abseil/abseil-cpp.git third_party/abseil
```

### Compatibility Guarantees

```cpp
// Abseil이 보장하는 것:
// 1. API 안정성 - public API는 호환성 유지
// 2. ABI 안정성 - 같은 빌드 내에서만 보장

// 보장하지 않는 것:
// 1. 별도로 빌드된 라이브러리 간 ABI 호환
// 2. 내부 구현 상세
```

## 빌드 설정

### CMake

```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.16)
project(my_project)

set(CMAKE_CXX_STANDARD 17)

# Abseil 추가
add_subdirectory(third_party/abseil-cpp)

# 사용
add_executable(my_app main.cpp)
target_link_libraries(my_app
    absl::strings
    absl::flat_hash_map
    absl::status
    absl::time
)
```

### Bazel

```python
# WORKSPACE
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

http_archive(
    name = "com_google_absl",
    urls = ["https://github.com/abseil/abseil-cpp/archive/refs/heads/master.zip"],
    strip_prefix = "abseil-cpp-master",
)

# BUILD
cc_binary(
    name = "my_app",
    srcs = ["main.cpp"],
    deps = [
        "@com_google_absl//absl/strings",
        "@com_google_absl//absl/container:flat_hash_map",
    ],
)
```

## std vs absl 선택 가이드

| 기능 | std | absl | 권장 |
|------|-----|------|------|
| 해시맵 | `unordered_map` | `flat_hash_map` | **absl** (2-3x 빠름) |
| 문자열 연결 | `+`, `stringstream` | `StrCat` | **absl** (효율적) |
| optional | `std::optional` (C++17) | `absl::optional` | **std** (C++17 이상) |
| string_view | `std::string_view` (C++17) | `absl::string_view` | **std** (C++17 이상) |
| 시간 | `<chrono>` | `absl/time` | 취향 (absl이 더 직관적) |
| 상태 코드 | 없음 | `absl::Status` | **absl** |

## 다음 단계

- **항목 2**: Abseil 코딩 스타일과 코드 리뷰 가이드
- **항목 3**: 문자열 라이브러리 심층 분석
- **항목 4**: 컨테이너 성능 비교

## 참고 자료

- [Abseil 공식 문서](https://abseil.io/)
- [Abseil GitHub](https://github.com/abseil/abseil-cpp)
- [Abseil Compatibility Guidelines](https://abseil.io/about/compatibility)
