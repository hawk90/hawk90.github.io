---
title: "Part 1-02: Folly vs Abseil 철학 차이 (performance-first vs std-compatible)"
date: 2026-05-23T02:00:00
description: "두 라이브러리의 설계 결정을 항목별로 비교 — 예외, 의존성, async 모델, ABI 정책."
series: "Folly Code Review"
seriesOrder: 2
tags: [cpp, folly, abseil, philosophy, comparison]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: false
---

> **한 줄 요약**: Abseil은 std의 *보완*을 목표로 하고 Folly는 std의 *능가*를 목표로 한다. 같은 utility 라이브러리지만 거의 모든 설계 결정이 반대로 간다.

## 동기 — 왜 두 라이브러리가 다른 길을 갔는가

Google과 Meta는 같은 시기에 비슷한 규모의 C++ 코드베이스를 갖게 됐다. 그러나 두 회사가 도달한 결론은 다르다.

Google은 `Living at Head` 철학을 택했다. 단일 monorepo, 단일 빌드, 모든 코드가 항상 최신 라이브러리에 맞춰진다. 그래서 Abseil은 *호환성 가드레일*을 만든다. 표준이 도착하면 표준으로 옮길 수 있도록 API를 미리 일치시킨다.

Meta도 monorepo지만 Folly는 *성능 가드레일*을 만든다. 워크로드의 critical path를 측정하고, 그 부분의 마이크로 최적화를 라이브러리 레벨로 흡수한다. 호환성보다 성능 회귀를 막는 데 더 많은 코드를 쓴다.

## 핵심 결정의 비교

### 1. 예외 정책

```cpp
// Abseil — 예외 사용 안 함
absl::StatusOr<User> GetUser(int id) {
  if (id < 0) return absl::InvalidArgumentError("id<0");
  return User{id};
}

// Folly — 예외 적극 활용
folly::Future<User> getUserAsync(int id) {
  if (id < 0) throw std::invalid_argument("id<0");
  return folly::makeFuture(User{id});
}
```

Abseil은 Google C++ Style Guide의 "no exceptions" 정책을 따른다. `absl::Status`, `absl::StatusOr<T>`로 에러를 값으로 표현한다. Folly는 예외를 `folly::exception_wrapper`로 type-erase해서 Future 체인을 통해 전파한다. `setException()`이 Promise API의 1급 시민이다.

### 2. 의존성

```text
Abseil 의존성:                Folly 의존성:
- 자체 완결 (CMake 기준)        - Boost (Context, ProgramOptions, ...)
- C++17 표준만                 - glog
- 옵션: Bazel                  - gflags
                              - jemalloc (강력 권장)
                              - OpenSSL, double-conversion, fmt
                              - libevent (executors)
                              - libdwarf (symbolizer)
```

Folly를 도입하면 *생태계 전체*가 들어온다. 패키지 매니저로 vcpkg/Conan을 쓰지 않으면 빌드 자체가 어렵다. Abseil은 `add_subdirectory`만으로 충분한 경우가 많다.

### 3. ABI 정책

```cpp
// Abseil — 동일 빌드 unit 내 보장
// 모든 binary가 같은 Abseil version으로 컴파일되어야 함

// Folly — 어떤 ABI 보장도 없음
// commit 단위로 layout이 바뀔 수 있음
// 정적 링크 강제 권장
```

Abseil은 `LTS branch`를 유지한다(예: `20240722`). LTS 안에서는 API 호환성을 약속한다. Folly에는 그런 약속이 없다. 외부 사용자는 *특정 commit*에 고정해서 쓰는 게 일반적이다.

#### pImpl을 안 쓰는 라이브러리

두 라이브러리 모두 *pImpl을 거의 안 쓴다*. ABI 안정성보다 zero-overhead가 우선이라는 결정이다.

![pImpl vs header-only](/images/blog/cpp-concepts/diagrams/pimpl-vs-header-only.svg)

pImpl은 heap 1번 + indirection 1번이라 hot path에서 측정 가능한 비용이다. Folly/Abseil은 internal type을 header에 노출하는 대신 ABI 호환성 책임을 *사용자에게* 떠넘긴다 — 같은 컴파일러로 통째로 빌드하라는 식.

### 4. Async 모델

```cpp
// Abseil — async 없음
// std::future, std::async, std::thread 사용

// Folly — 풍부한 async 도구
folly::SemiFuture<int> compute();
folly::CPUThreadPoolExecutor pool(8);
compute().via(&pool).thenValue([](int x) { ... });

// Fiber: M:N stackful coroutine
folly::fibers::FiberManager fm(...);
fm.addTask([] { /* baton.wait() OK */ });
```

Async는 두 라이브러리의 *가장 큰* 격차다. Google은 기본적으로 표준 thread/future 위에 자체 패턴을 만들었고, Abseil은 그 위에 utility를 얹지 않았다. Meta는 일찍부터 비동기를 라이브러리화했다.

### 5. 컨테이너 철학

```cpp
// Abseil — Swiss table 기반 hashmap
absl::flat_hash_map<K, V>      // value-stable 아님
absl::node_hash_map<K, V>      // pointer-stable
absl::btree_map<K, V>          // ordered

// Folly — F14 (Facebook 14-way) hashmap
folly::F14ValueMap<K, V>       // value 직접 저장
folly::F14NodeMap<K, V>        // pointer-stable
folly::F14VectorMap<K, V>      // iteration locality 최적
folly::F14FastMap<K, V>        // size 기반 자동 선택
```

둘 다 SIMD를 활용한 16-way probing이지만, F14는 **iteration order/locality** 변형을 더 많이 제공한다. Folly는 *워크로드별 변형*을 라이브러리에 노출하는 경향이 강하다.

## 코드 패턴 비교

### 에러 처리

```cpp
// Abseil 스타일
absl::StatusOr<Config> LoadConfig(absl::string_view path) {
  auto file = std::ifstream(std::string(path));
  if (!file) {
    return absl::NotFoundError(absl::StrCat("missing: ", path));
  }
  // ...
  return Config{};
}

absl::Status Run() {
  ASSIGN_OR_RETURN(auto cfg, LoadConfig("a.cfg"));
  return absl::OkStatus();
}
```

```cpp
// Folly 스타일 (예외)
folly::Future<Config> loadConfigAsync(folly::StringPiece path) {
  return folly::via(&io_executor_, [path = path.str()] {
    std::ifstream file(path);
    if (!file) throw std::runtime_error(folly::sformat("missing: {}", path));
    return Config{};
  });
}

// 또는 Try<T>
folly::Try<Config> loadConfig(folly::StringPiece path) {
  std::ifstream file(path.str());
  if (!file) return folly::Try<Config>(folly::make_exception_wrapper<std::runtime_error>("missing"));
  return folly::Try<Config>(Config{});
}
```

### 문자열 조작

```cpp
// Abseil
std::string s = absl::StrCat("user=", name, " id=", id);
auto parts = absl::StrSplit(line, ',');
std::string joined = absl::StrJoin(parts, "|");

// Folly
std::string s = folly::sformat("user={} id={}", name, id);
std::vector<folly::StringPiece> parts;
folly::split(',', line, parts);
std::string joined = folly::join("|", parts);
```

API 모양은 비슷하지만 Folly는 split의 *out parameter*를 더 자주 노출한다(할당 회피).

## 언제 무엇을 쓰는가

| 상황 | 권장 |
|------|------|
| 예외 금지 환경 (game engine, embedded) | Abseil |
| Google 스타일 가이드 준수 프로젝트 | Abseil |
| async/IO가 중심인 서버 | Folly |
| C++14 호환이 필요한 legacy | Folly (Optional, format 등) |
| 표준에 도달한 기능을 쓸 수 있다 | std |
| ABI 안정성이 필요한 라이브러리 SDK | Abseil LTS or std |
| 워크로드 hot path 최적화 | Folly |
| 빌드 시스템을 단순하게 유지 | Abseil |

## 코드 리뷰 포인트

- **혼용하지 마라.** 한 모듈에서 `absl::Status`와 `folly::Future` 예외 전파를 동시에 쓰면 에러 경로가 두 갈래로 갈라진다.
- **타입 변환 비용을 보자.** `absl::string_view` ↔ `folly::StringPiece`, `absl::Time` ↔ `std::chrono`는 매번 변환 비용이 생긴다.
- **의존성 닫기를 확인하라.** Folly 헤더가 어느 boost를 끌고 들어오는지 build graph를 검증한다.

## 자주 보는 안티패턴

```cpp
// 1. 두 라이브러리에서 같은 기능을 둘 다 import
#include <folly/Optional.h>
#include "absl/types/optional.h"
// folly::Optional<absl::optional<int>>  ← 의미 없음

// 2. Abseil exception을 Folly Future로 잘못 전파
absl::Status s = ...;
folly::makeFuture(s);  // Status는 throw되지 않음 — Future 체인이 error로 안 흐름

// 3. F14에 value-stable iterator 가정
folly::F14ValueMap<K, V> m;
auto& v = m[k];
m.insert(...);   // rehash 가능 — v dangling
```

## 정리

- 두 라이브러리는 같은 자리에서 *반대 방향*으로 출발했다.
- 예외/의존성/ABI/async는 결정이 완전히 갈린다.
- 컨테이너는 둘 다 Swiss-table류로 수렴했지만 변형 옵션은 Folly가 더 많다.
- 같은 프로젝트에서 혼용하지 말고, 모듈 단위로 선택을 일관시킨다.
- C++20 이후 표준이 차이를 빠르게 줄이고 있으므로 *신규 코드는 표준 우선* 검토한다.

## 다음 편

[Part 1-03: Build / fbcode 환경](/blog/programming/code-review/folly/part1-03-build-fbcode)에서 Folly의 monorepo 빌드 구조와 외부 빌드의 함정을 본다.

## 관련 항목

- [Folly Part 1-01 — 개요](/blog/programming/code-review/folly/part1-01-overview)
- [Abseil Part 1-02 — Design Philosophy](/blog/programming/code-review/abseil/part1-02-design-philosophy)
- [Abseil Part 1-05 — Versioning & ABI](/blog/programming/code-review/abseil/part1-05-versioning-abi)
