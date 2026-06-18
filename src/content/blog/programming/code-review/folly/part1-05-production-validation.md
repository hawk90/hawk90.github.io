---
title: "Folly production validation 문화 — peta-scale에서 단련된 코드"
date: 2026-06-04T09:05:00
description: "Folly 컴포넌트가 Meta production scale에서 어떻게 검증되는가 — 외부 사용자가 신뢰해도 되는 부분과 주의할 부분."
series: "Folly Code Review"
seriesOrder: 5
tags: [cpp, folly, production, validation, culture]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true
---

> **한 줄 요약**: Folly의 hot path 컴포넌트는 Meta의 매일 수십억 요청에 깎여 다듬어졌다. 그러나 *Meta가 안 쓰는 부분*은 같은 정도로 검증되지 않았음을 인지하고 사용한다.

## 동기 — production이 라이브러리 품질에 미치는 것

라이브러리 품질은 보통 두 가지로 측정된다.

1. **테스트 coverage** — 단위/통합 테스트
2. **production exposure** — 실제 부하에서의 동작

표준 라이브러리는 (1)이 강하다. 모든 처리계가 자체 conformance 테스트를 거친다. Folly는 (2)가 압도적이다. Instagram feed delivery, Messenger relay, Meta AI inference 등 *마이크로초가 비용*인 시스템에서 매일 검증된다.

이 차이는 코드의 *어떤 부분*이 단련되는가를 가른다. 표준은 *명세에 맞게* 단련되고, Folly는 *워크로드에 맞게* 단련된다.

## 어떤 컴포넌트가 가장 많이 단련됐는가

Meta의 internal usage를 OSS commit history로 추정하면 다음 순위가 보인다.

| 등급 | 컴포넌트 | 근거 |
|------|----------|------|
| S | `folly::Future`, `folly::IOBuf`, `folly::EventBase` | async server backbone |
| S | `folly::F14*Map`, `folly::ConcurrentHashMap` | feed/timeline 캐시 |
| S | `folly::fbstring`, `folly::small_vector` | 모든 binary가 사용 |
| A | `folly::Singleton`, `folly::ScopeGuard` | 광범위 사용 |
| A | `folly::MPMCQueue`, `folly::Baton`, `folly::SharedMutex` | concurrency 백본 |
| A | `folly::fibers` | Messenger/Mercury |
| B | `folly::dynamic`, `folly::json` | configuration/RPC |
| B | `folly::Conv`, `folly::Format` | 일반 utility |
| C | `folly::experimental/*` | early-stage |
| C | platform-specific utility (Windows API binding 등) | OSS 기여 위주 |

S/A 등급은 *깎임이 깊다*. 버그 reports가 시간당 수십에서 수백 건 들어오는 환경에서 살아남았다. C 등급은 Meta 외부의 기여로 들어왔거나, fbcode 안에서도 사용량이 적은 영역이다.

## production exposure가 만드는 차이

### 1. Tail latency 최적화

`folly::Future`의 `.via()`는 *thread hop을 측정*해 최적화한다. fbcode 안에서 RPC 한 요청이 평균 3~5개의 thread hop을 거치므로 hop당 1μs를 아끼면 전체 5μs 절감이다. 매일 수십억 요청에서 의미가 큰 숫자다.

```cpp
// 내부적으로 inline executor 검출 → bypass
sf.via(&inlineExecutor).thenValue(...);
// equivalent to .thenInline(...)
```

### 2. ASan/TSan/UBSan 상시 적용

fbcode CI는 모든 PR에 sanitizer를 돌린다. Production에서도 *일부 fleet*은 ASan으로 운영된다. 그래서 Folly hot path는 sanitizer-clean을 유지한다.

```cpp
// folly/concurrency/ConcurrentHashMap.h — TSan 친화 코드
class ConcurrentHashMap {
  // hazard pointer로 lock-free read
  // TSan이 hazard pointer를 이해하므로 false positive 없음
};
```

### 3. JIT-level 최적화 검토

`folly::F14`는 *생성된 어셈블리*까지 PR에서 검증한다. SIMD intrinsic의 코드 생성이 컴파일러 버전에 따라 다르므로 clang 14/15/16에서 모두 측정한다.

### 4. 메모리 프로파일 통합

`folly::Singleton`은 *leak detection*과 통합된다. fbcode 안에서는 program shutdown 시 leak이 자동 보고된다. OSS 사용자도 이 hook을 활용할 수 있다.

## 신뢰의 비대칭

Folly의 같은 헤더 안에서도 *깎임이 다르다*.

```cpp
// folly/futures/Future.h

namespace folly {
  // S — 매일 수억 호출
  template <class T> class Future;
  template <class T> class SemiFuture;
  template <class T> class Promise;

  // A — 자주 사용
  template <class It> SemiFuture<...> collect(It first, It last);

  // B — production에서 가끔
  template <class T> Future<T> retrying(...);

  namespace futures {
  namespace detail {
    // S — backbone
    template <class T> class Core;

    // A — internal but heavily tested
    class FSM;
  }}
}
```

`Future::get()`은 매일 수십억 번 호출되지만 `retrying()`은 *특정 RPC layer*에서만 쓰인다. 검증의 깊이가 다르다.

## 외부 사용자가 신뢰할 부분과 의심할 부분

**신뢰**:
- `folly::Future` 체인, `folly::SemiFuture`, `folly::Promise`
- `folly::IOBuf`, `folly::IOBufQueue`, `folly::Cursor`
- `folly::F14*Map/Set`
- `folly::fbstring`, `folly::small_vector`, `folly::sorted_vector_map`
- `folly::EventBase`, `folly::CPUThreadPoolExecutor`
- `folly::ConcurrentHashMap`, `folly::MPMCQueue`

**의심 (검증 후 사용)**:
- `folly::experimental::*` (이름 그대로다)
- Windows-only path
- 최근 (3개월 이내) 추가된 API
- platform symbolizer, signal handler 같은 OS 통합
- 잘 알려지지 않은 utility (`folly::Indestructible` 같은 것들)

**대안 권장**:
- 표준이 있는 영역 (`std::format`, `std::span`, `std::expected`)은 표준 우선
- 단순 hash map은 `absl::flat_hash_map`이 빌드가 가볍다

## 검증 신호 읽는 법

GitHub repo에서 다음을 본다.

```bash
# 1. 헤더의 변경 빈도
git log --oneline folly/futures/Future.h | wc -l   # 수백 건이면 활발

# 2. issue tracker
# "stale, low-traffic" 표시된 컴포넌트는 의심

# 3. benchmark 디렉터리
ls folly/futures/test/*Benchmark*
# benchmark가 있다 = production에서 측정한다
```

production exposure는 commit history에 흔적을 남긴다. fix-up commit, performance commit이 잦은 헤더가 *살아 있는 코드*다.

## 코드 리뷰 포인트

- **사용 중인 컴포넌트가 production-tested S/A 등급인가?** experimental은 다른 평가가 필요하다.
- **워크로드가 Meta의 워크로드와 비슷한가?** Folly는 server-side에 최적화돼 있다. mobile/embedded에는 과한 의존성이 따라온다.
- **benchmark가 우리 환경에서도 유효한가?** Meta는 dual-socket Intel 서버 위주다. ARM/Apple Silicon은 검증이 부족할 수 있다.

## 자주 보는 안티패턴

```cpp
// 1. experimental namespace를 production 코드에 사용
#include <folly/experimental/coro/Task.h>   // 이미 다수가 정식 승격됐지만
// experimental은 언제든 사라지거나 이동 가능

// 2. 단일 benchmark 수치로 의사결정
// "F14가 std::unordered_map보다 2배 빠르다더라"
// 워크로드/key type/메모리 패턴에 따라 다르다

// 3. mobile에서 Folly 풀세트 도입
// boost-context, libevent까지 따라옴 — binary size 폭증
```

## 정리

- Folly의 hot path 컴포넌트는 Meta production scale에서 단련된 *살아 있는 코드*다.
- 같은 헤더 안에서도 컴포넌트별 검증 깊이가 다르다(S/A/B/C).
- 외부 사용자는 commit history와 benchmark 디렉터리 유무로 검증 강도를 가늠할 수 있다.
- experimental namespace, platform-specific, mobile/embedded는 추가 검증을 거친다.
- 표준에 도달한 기능은 표준을 우선 사용한다.

## 다음 편

Part 2부터 Future/Async를 본다. [Part 2-01: folly::Future 개요](/blog/programming/code-review/folly/part2-01-future-overview)에서 std::future가 부족한 자리를 어떻게 채우는지 시작한다.

## 관련 항목

- [Folly Part 1-01 — 개요](/blog/programming/code-review/folly/part1-01-overview)
- [Folly Part 1-04 — API stability](/blog/programming/code-review/folly/part1-04-api-stability)
- [Abseil Part 1-04 — LTS vs HEAD](/blog/programming/code-review/abseil/part1-04-lts-vs-head-release)
