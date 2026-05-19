---
title: "Folly Code Review: 서문"
date: 2026-05-23
description: "Meta(Facebook)가 production에서 검증한 Folly C++ 라이브러리를 code review의 시선으로 읽는다. performance-first 철학과 fbcode 환경의 산물을 14 Parts 63편으로 살펴본다."
series: "Folly Code Review"
seriesOrder: 0
tags: [cpp, folly, meta, facebook, library, code-review, overview]
type: tech
featured: true
draft: false
---

## 이 시리즈를 쓰는 이유

Meta는 수십억 사용자 트래픽을 처리하는 fbcode mono-repo에서 C++ 라이브러리를 만들었고, 그 중 외부에 공개해도 무방한 부분이 Folly다. 이름은 "Facebook Open-source LibrarY"의 약자지만, 실제로는 *production에서 std로는 부족한 부분을 채워 넣은* 도구 모음이다.

Folly는 Abseil과 비교되는 일이 많다. 둘 다 std::을 보완하지만 철학이 다르다. Abseil이 *std 호환을 유지하면서 보완*한다면, Folly는 *성능을 위해서라면 std와 다른 모양도 감수*한다. fbstring의 SSO+COW, F14 map의 SIMD probing, fibers의 M:N coroutine 모델은 모두 그런 결정의 산물이다.

이 시리즈는 Folly의 컴포넌트를 사용법으로 훑지 않는다. **Meta가 사내에서 무엇을 보고 받아들였는가**, 즉 *왜* 이 API가 std와 다른지, *언제* 쓰면 std보다 빨라지고 *언제* 잘못 쓰면 더 느려지는지를 함께 본다.

## 대상 독자

- C++ 중급 이상 — std::vector, std::unique_ptr, std::function에 익숙한 사람
- 비동기/병행 코드를 자주 다루는 시니어 엔지니어 (Future, Executor가 핵심)
- 메모리/네트워크 성능에 민감한 시스템을 만드는 사람 (IOBuf)
- "folly::dynamic은 std::any와 뭐가 달라?"가 궁금한 사람

C++ 초심자는 먼저 [Effective Modern C++](/blog/programming/cpp/effective-modern-cpp) 시리즈를 권합니다.

## 시리즈 구성

총 **14 Parts × 63편**으로 구성됩니다.

| Part | 제목 | 핵심 | 편수 |
|---|---|---|---|
| 1 | Foundations | 설계 철학, fbcode, API stability | 5 |
| 2 | Future / Async | folly::Future, Promise, SemiFuture | 7 |
| 3 | Executor | Inline, CPU, IO, Manual, EventBase | 5 |
| 4 | IOBuf & Memory | zero-copy buffer chain | 5 |
| 5 | Strings (FBString) | SSO + COW, fmt, StringPiece | 4 |
| 6 | Conv | folly::to / tryTo | 3 |
| 7 | F14 Maps | SIMD-probed hash map | 5 |
| 8 | Container | SmallVector, AtomicHashMap, LRU | 5 |
| 9 | Synchronization | Synchronized, Baton, SharedMutex | 5 |
| 10 | Concurrency Primitives | SPSC/MPMC queue, fiber channel | 4 |
| 11 | Dynamic Typing | folly::dynamic, JSON, visitor | 4 |
| 12 | Singleton / Factory | folly::Singleton, vault | 3 |
| 13 | Utility | ExceptionWrapper, ScopeGuard, Function | 5 |
| 14 | Code Review Lessons | Meta style, anti-patterns, std vs folly | 3 |

---

### Part 1 — Foundations (5)

Folly가 왜 존재하는지, Abseil과의 차이부터.

| # | 글 제목 |
|---|---|
| 1-01 | Folly 개요 — Meta가 production에서 검증한 utility |
| 1-02 | Folly vs Abseil 철학 차이 (performance-first vs std-compatible) |
| 1-03 | Build / fbcode 환경 |
| 1-04 | API stability 정책 |
| 1-05 | Production validation 문화 |

### Part 2 — Future / Async (7)

| # | 글 제목 |
|---|---|
| 2-01 | folly::Future 개요 |
| 2-02 | Promise / makeFuture |
| 2-03 | SemiFuture vs Future (executor binding) |
| 2-04 | .then / .thenValue / .thenError |
| 2-05 | collect / collectAll / collectAny |
| 2-06 | retry / window / via |
| 2-07 | fibers (M:N coroutine) |

### Part 3 — Executor (5)

| # | 글 제목 |
|---|---|
| 3-01 | InlineExecutor |
| 3-02 | CPUThreadPoolExecutor |
| 3-03 | IOThreadPoolExecutor (libevent 기반) |
| 3-04 | ManualExecutor (deterministic 테스트) |
| 3-05 | EventBase |

### Part 4 — IOBuf & Memory (5)

| # | 글 제목 |
|---|---|
| 4-01 | IOBuf — 비복사 buffer chain |
| 4-02 | IOBufQueue |
| 4-03 | Cursor (read/write) |
| 4-04 | Zero-copy 패턴 |
| 4-05 | IOBuf shared semantics |

### Part 5 — Strings (FBString) (4)

| # | 글 제목 |
|---|---|
| 5-01 | FBString — SSO + COW |
| 5-02 | fmt::format integration |
| 5-03 | StringPiece (string_view 호환) |
| 5-04 | Join / split utilities |

### Part 6 — Conv (3)

| # | 글 제목 |
|---|---|
| 6-01 | folly::to / tryTo (text↔num 변환) |
| 6-02 | Customization (사용자 타입) |
| 6-03 | Performance vs sprintf / stringstream |

### Part 7 — F14 Maps (5)

| # | 글 제목 |
|---|---|
| 7-01 | F14ValueMap vs std::unordered_map |
| 7-02 | F14NodeMap (stable pointer) |
| 7-03 | F14VectorMap (cache-friendly iteration) |
| 7-04 | F14FastMap (auto-select) |
| 7-05 | F14 internals (SIMD probing) |

### Part 8 — Container (5)

| # | 글 제목 |
|---|---|
| 8-01 | SmallVector (inline storage) |
| 8-02 | FixedString (compile-time string) |
| 8-03 | AtomicHashMap (lock-free read) |
| 8-04 | ConcurrentHashMap (sharded) |
| 8-05 | EvictingCacheMap (LRU) |

### Part 9 — Synchronization (5)

| # | 글 제목 |
|---|---|
| 9-01 | Synchronized (lock wrapper) |
| 9-02 | SharedMutex |
| 9-03 | Baton (one-shot wait) |
| 9-04 | RWSpinLock |
| 9-05 | PicoSpinLock (1-byte spinlock) |

### Part 10 — Concurrency Primitives (4)

| # | 글 제목 |
|---|---|
| 10-01 | ProducerConsumerQueue (SPSC) |
| 10-02 | MPMCQueue |
| 10-03 | UnboundedQueue |
| 10-04 | fibers::Channel |

### Part 11 — Dynamic Typing (4)

| # | 글 제목 |
|---|---|
| 11-01 | folly::dynamic |
| 11-02 | JSON conversion (toJson / parseJson) |
| 11-03 | Dynamic ↔ struct |
| 11-04 | Visitor pattern |

### Part 12 — Singleton / Factory (3)

| # | 글 제목 |
|---|---|
| 12-01 | Singleton vs Meyers / static |
| 12-02 | SingletonVault |
| 12-03 | try_get / try_get_fast (성능) |

### Part 13 — Utility (5)

| # | 글 제목 |
|---|---|
| 13-01 | ExceptionWrapper |
| 13-02 | ScopeGuard / SCOPE_EXIT |
| 13-03 | folly::Optional (vs std::optional) |
| 13-04 | folly::Function (vs std::function) |
| 13-05 | Lazy |

### Part 14 — Code Review Lessons (3)

| # | 글 제목 |
|---|---|
| 14-01 | Meta 스타일 code review |
| 14-02 | Folly anti-patterns (잘못 쓰면 std보다 느림) |
| 14-03 | std vs folly 선택 기준 |

## 자매 시리즈

- [Effective C++](/blog/programming/cpp/effective-cpp) — 언어 feature 위주
- [Effective Modern C++](/blog/programming/cpp/effective-modern-cpp) — C++11/14 언어 feature
- [Beautiful C++](/blog/programming/cpp/beautiful-cpp) — modern 스타일 가이드
- [Abseil Code Review](/blog/programming/code-review/abseil) — Google의 industrial library

이 시리즈와의 차이: 위 셋은 *언어 feature*를 다루고, 이 시리즈는 *industrial library를 reading lens로* 다룬다. Folly와 Abseil은 같은 문제에 다른 답을 내놓은 라이브러리다. 둘을 나란히 읽으면 production C++의 트레이드오프가 보인다.

## 학습 로드맵

처음부터 1편씩 순서대로 읽지 않아도 됩니다. 권장 순서:

1. **핵심 (먼저)** — Part 2 (Future), Part 3 (Executor), Part 9 (Synchronization). 비동기/병행이 Folly의 가장 강력한 영역.
2. **고성능 자료구조** — Part 7 (F14), Part 4 (IOBuf), Part 10 (Concurrency Primitives).
3. **유틸리티** — Part 13 (ExceptionWrapper, ScopeGuard) — 다른 곳에서 흔히 빠진 것.
4. **선택적** — Part 11 (dynamic), Part 12 (Singleton) — 필요할 때만.
5. **Part 14** — 모든 Part를 본 후 — std vs folly 의사결정.

## 관련 항목

- [원문 — Folly source](https://github.com/facebook/folly)
- [Folly README](https://github.com/facebook/folly/blob/main/README.md)
- [Abseil Code Review 시리즈](/blog/programming/code-review/abseil)
