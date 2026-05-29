---
title: "Part 1-01: Folly 개요 — Meta가 production에서 검증한 utility"
date: 2026-05-23T01:00:00
description: "Folly의 출발점, 구성, std/Abseil과의 차별점 — Meta production에서 단련된 high-performance C++ 라이브러리."
series: "Folly Code Review"
seriesOrder: 1
tags: [cpp, folly, meta, facebook, library, overview]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true
---

> **한 줄 요약**: Folly는 Meta의 fbcode monorepo에서 자라난 performance-first C++ 라이브러리다. std가 채우지 못한 자리를 *마이크로초 단위*로 최적화된 구현으로 메운다.

## 동기 — std는 왜 부족한가

C++ 표준 라이브러리는 신중하다. 표준화 위원회의 합의를 거치고, 모든 처리계가 구현 가능해야 하며, ABI 안정성을 보장해야 한다. 그 신중함은 안전망인 동시에 한계다.

Meta는 다른 제약을 가진다. 수십억 사용자의 요청을 처리해야 하고, 마이크로초가 데이터센터 수십 대 분량의 비용 차이로 이어진다. fbcode monorepo는 단일 빌드 시스템과 단일 toolchain을 강제하므로 ABI 호환성을 외부와 맞출 필요도 없다. 이 환경에서 Folly가 자라났다.

| 측면 | 표준 라이브러리 | Folly |
|------|-----------------|-------|
| ABI | 보수적 안정 | 빌드마다 변경 가능 |
| 구현 | 범용 | 워크로드 specific 최적화 |
| 예외 | 회피 옵션 | 적극 활용 |
| 의존성 | 독립적 | jemalloc/glog/Boost 의존 |
| 거버넌스 | 표준 위원회 합의 | Meta 내부 합의 + OSS 공개 |

Folly는 그 결과물이다. fbstring은 24바이트 SSO와 `__builtin_expect` 기반 분기 힌트로 std::string보다 빠르고, F14 hashmap은 SIMD 16-way probing으로 std::unordered_map을 두 배 이상 앞선다. fbvector는 jemalloc의 `realloc()`을 직접 호출해 메모리를 in-place로 확장한다.

## 구성 한눈에

Folly의 헤더는 카테고리별로 정리된다.

| 헤더 | 역할 |
|------|------|
| `FBString.h`, `FBVector.h` | std 컨테이너 대체 |
| `container/F14*.h` | SIMD hashmap (Swiss table류) |
| `small_vector.h`, `sorted_vector.h` | small/sorted vector |
| `futures/` | Future/Promise — `std::future` 대체 |
| `executors/` | CPU/IO ThreadPool, EventBase |
| `io/IOBuf.h`, `IOBufQueue.h` | zero-copy network buffer |
| `synchronization/` | Baton, Latch, DistributedMutex |
| `concurrency/` | ConcurrentHashMap, MPMCQueue |
| `fibers/` | M:N stackful coroutine |
| `dynamic.h`, `json.h` | 동적 타입 + JSON |
| `Format.h`, `Conv.h` | 빠른 포맷팅/변환 |
| `Optional.h`, `Expected.h`, `Try.h` | error handling |
| `Singleton.h` | 안전한 leak-free singleton |
| `ScopeGuard.h` | RAII utility |

각 컴포넌트는 *그 자체로 시리즈 한 편이 될 만한* 깊이를 가진다.

## 간단한 사용 예

```cpp
#include <folly/FBString.h>
#include <folly/futures/Future.h>
#include <folly/executors/CPUThreadPoolExecutor.h>

folly::CPUThreadPoolExecutor pool(4);

folly::SemiFuture<int> compute() {
  return folly::makeSemiFuture(42);
}

int main() {
  auto result = compute()
    .via(&pool)
    .thenValue([](int x) { return x * 2; })
    .thenValue([](int x) { return std::to_string(x); })
    .get();   // "84"
}
```

Future continuation, executor binding, 동기 대기까지 한 줄로 표현된다. std::future로는 어색한 패턴이 Folly에서는 자연스럽다.

## 설계 철학

### 성능 우선

마이크로 최적화를 *주저하지 않는다*. fbstring의 23바이트 SSO, F14의 SIMD probing, IOBuf의 ref-counted chain은 모두 캐시 라인과 분기 예측을 의식한 결과다. 표준 라이브러리가 "범용성을 위한 평균"을 노린다면 Folly는 "워크로드의 peak"를 노린다.

### 예외 적극 활용

Folly는 예외를 회피하지 않는다. `folly::Promise::setException(folly::exception_wrapper)`, `folly::Future::thenError<E>`처럼 예외를 1급 시민으로 취급한다. 다만 hot path에서는 `Try<T>`나 `Expected<T, E>`로 분기를 명시적으로 다룬다.

```cpp
folly::Expected<int, std::string> safeDivide(int a, int b) {
  if (b == 0) return folly::makeUnexpected("div by zero");
  return a / b;
}
```

### 의존성 수용

Boost, glog, gflags, jemalloc, OpenSSL, zstd, double-conversion, fmt까지 끌어들인다. 통합 비용이 크지만 *재발명하지 않는다*. Abseil이 의존성을 최소화하는 것과 정반대의 입장이다.

## std vs Folly 비교 한 장

| 영역 | std | Folly | 차별점 |
|------|-----|-------|--------|
| string | `std::string` | `folly::fbstring` | 23B SSO, COW |
| vector | `std::vector` | `folly::fbvector` | jemalloc realloc, 50% growth |
| hashmap | `std::unordered_map` | `folly::F14*Map` | SIMD probing |
| future | `std::future` | `folly::Future` | continuation, executor |
| optional | `std::optional` | `folly::Optional` | C++14 호환 |
| variant | `std::variant` | `folly::dynamic` | JSON-friendly |
| string formatting | `std::format` (C++20) | `folly::format`, `fmt::format` | C++14 호환 |

표준이 도착하면 Folly는 점진적으로 표준을 활용한다. `folly::Optional`은 내부에서 `std::optional`로 대체되는 중이고, `folly::format`은 fmt 통합으로 이동했다.

## Abseil과의 차이

같은 utility 라이브러리지만 출발점이 다르다.

| 항목 | Abseil (Google) | Folly (Meta) |
|------|-----------------|--------------|
| 철학 | std 보완 (Living at Head) | std 능가 (performance peak) |
| 예외 | 사용 금지 | 적극 사용 |
| 의존성 | 최소 (자체 완결) | Boost/glog/jemalloc 다수 |
| 빌드 | Bazel + CMake | CMake (외부) / Buck (내부) |
| Async 모델 | 거의 없음 | Future + Executor + Fiber |
| Zero-copy I/O | 없음 | IOBuf 체계 |
| ABI | 동일 빌드 내 보장 | 어떤 보장도 없음 |

핵심은 "*Folly가 가진 것*은 *Abseil이 안 가진 것*"이라는 점이다. Future/Executor/IOBuf/Fiber는 Abseil에 없다. 반대로 Abseil의 Status/StatusOr는 Folly에는 `Expected`로 일부만 대응한다.

## 코드 리뷰 포인트

- **표준에 동일 기능이 있는가?** C++20 이후로 std::format, std::span, std::expected, std::optional이 들어왔다. 신규 코드는 표준을 우선 검토하고, Folly가 필요한 명확한 이유가 있을 때만 도입한다.
- **executor 바인딩이 명시적인가?** Future continuation은 어떤 executor 위에서 도는지 코드로 추적 가능해야 한다. `.via(&pool)` 누락은 흔한 버그다.
- **예외 정책이 일관적인가?** 같은 프로젝트 안에서 Folly Future의 예외 전파와 `Expected` 사용이 섞이면 디버깅이 어렵다.
- **의존성 비용을 알고 있는가?** Folly 한 헤더가 Boost/glog/jemalloc까지 끌고 들어온다.

## 자주 보는 안티패턴

```cpp
// 1. SemiFuture를 그대로 .get() — deadlock 위험
auto v = compute().get();  // executor 미바인딩 + 동기 대기

// 2. Future를 멤버로 저장
class Worker {
  folly::Future<int> f_;  // continuation 체인이 살아있어야 함
};

// 3. Boost 충돌
// folly/Optional.h가 boost/optional.h와 transitive include 충돌
```

## 정리

- Folly는 Meta fbcode의 성능 요구를 충족하기 위해 자라난 utility 라이브러리다.
- 성능 우선, 예외 활용, 의존성 수용 세 축으로 std/Abseil과 구분된다.
- Future/Executor/IOBuf/Fiber는 Abseil이 갖지 못한 Folly 고유의 강점이다.
- ABI를 보장하지 않으므로 빌드 시 *반드시* 단일 toolchain으로 정적 링크한다.
- C++20 이후 표준이 따라잡은 영역은 표준을 우선 쓰고, Folly는 *남은 격차*에만 도입한다.

## 다음 편

[Part 1-02: Folly vs Abseil 철학 차이](/blog/programming/code-review/folly/part1-02-folly-vs-abseil-philosophy)에서 두 라이브러리의 설계 결정을 항목별로 비교한다.

## 관련 항목

- [Abseil 시리즈 Part 1-01](/blog/programming/code-review/abseil/part1-01-overview) — 같은 카테고리의 Google 라이브러리
- [Effective Modern C++ Item 18](/blog/programming/cpp/effective-modern-cpp/item18-use-unique-ptr-for-exclusive-ownership) — 표준 std::future의 한계
- [Folly GitHub](https://github.com/facebook/folly)
