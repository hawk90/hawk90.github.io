---
title: "folly vs std 선택 기준 분석"
date: 2026-06-07T09:09:00
description: "Part 14-03: std/abseil/folly 선택 의사결정 가이드 — production scale, throughput, latency profile에 따른 분기."
series: "Folly Code Review"
seriesOrder: 63
tags: [cpp, folly, std, decision, comparison]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

std/abseil/folly 사이의 선택은 **세 가지 변수의 함수**다. 의존성 격리 부담, 워크로드 규모(N과 QPS), latency profile(p50 vs p99). 무조건 folly가 답은 아니다. 이 절에서는 결정 트리를 정리한다.

## 결정 변수

1. **의존성 비용** — Folly는 boost + gflags + double-conversion 등 transitive dep이 무겁다. 소규모 프로젝트엔 부담.
2. **워크로드 규모** — N(컬렉션 크기, QPS) 작으면 std/abseil이 더 빠를 수 있다.
3. **latency profile** — p99를 중시하면 folly의 jemalloc·SBO·lock-free가 유리. p50만 보면 차이 적음.
4. **팀 익숙도** — Folly 도입은 std 대비 learning curve가 있다.
5. **빌드 시간** — Folly 헤더는 무겁다(템플릿 heavy). 빌드 시간에 민감하면 std 선호.

## 결정 트리

```text
1) 외부에 공개되는 lib인가?
   yes → std 우선 (의존성 최소)
   no  → 2)

2) production scale (QPS > 1k, 데이터 > 1MB)?
   no  → std 우선 (의존성 비용 > 성능 이득)
   yes → 3)

3) latency p99에 민감한가?
   no  → std 또는 abseil
   yes → 4)

4) 워크로드별 측정 결과 folly가 빠른가?
   no  → std/abseil 선택
   yes → folly
```

## 카테고리별 선택 가이드

### String

| 케이스 | 선택 |
|--------|------|
| 짧은 string (< 23 bytes), 일반 사용 | std::string |
| 매우 큰 string (KB+), copy 많음 | folly::fbstring |
| API 경계 (read-only) | std::string_view, folly::StringPiece |
| format 필요 | std::format (C++20) 또는 folly::format |
| substring fragment 누적 | absl::Cord |

### Map / Set

| 케이스 | 선택 |
|--------|------|
| N < 100, single-thread | std::unordered_map 또는 flat_map |
| N < 100, hot key lookup | folly::small_vector + linear scan |
| N >= 100, single-thread | folly::F14FastMap |
| reference stability 필요 | folly::F14NodeMap |
| concurrent insert/read | folly::ConcurrentHashMap |
| read-mostly + write 드묾 | folly::AtomicHashMap |
| simple key-value cache | folly::EvictingCacheMap |

### Queue

| 케이스 | 선택 |
|--------|------|
| single-thread | std::queue |
| MPMC, bounded, predictable load | folly::MPMCQueue |
| MPMC, unbounded, burst | folly::UnboundedQueue |
| SPSC (1:1) | folly::ProducerConsumerQueue |
| fiber 간 통신 | folly::fibers::Channel |

### Future / Async

| 케이스 | 선택 |
|--------|------|
| 단순 std::async, 별도 chain 없음 | std::future |
| coroutine 기반 | C++20 coroutine + cppcoro/asio |
| 복잡한 chain, multi-executor | folly::Future / SemiFuture |
| 고성능 RPC framework | folly::coro |

### Singleton

| 케이스 | 선택 |
|--------|------|
| dependency 없음, 단순 cache | Meyers static 또는 absl::NoDestructor |
| dependency 있음, destruction order 중요 | folly::Singleton |
| 핫패스 access, ns 단위 | folly::Singleton + try_get_fast |

### Callable

| 케이스 | 선택 |
|--------|------|
| 기본 callable wrapper | std::function |
| unique_ptr capture 필요 | folly::Function |
| once-only callback | folly::Function<Sig &&> |
| zero-overhead inline 필요 | template lambda 또는 fu2::function_view |

### Exception

| 케이스 | 선택 |
|--------|------|
| 동기 throw/catch | 표준 std::exception |
| async/thread 경계 | folly::exception_wrapper |
| Expected 패턴 | std::expected (C++23) 또는 folly::Expected |

### Optional

| 케이스 | 선택 |
|--------|------|
| 신규 코드, C++17+ | std::optional |
| fbcode 내부 신규 | folly::Optional (관행) |
| C++23 monadic | std::optional |
| C++20 이하 + monadic | folly::Optional |

## 프로젝트 규모별 가이드

### 작은 프로젝트 (1-5명, < 10k LOC)

대부분 std + abseil 충분. Folly는 의존성·빌드시간 비용이 ROI 안 맞음.

**추천 스택**: std + 필요한 곳에 abseil.

### 중간 (5-50명, 10k-500k LOC)

특정 모듈만 folly. RPC backend, async pipeline 같은 hot path에 선택적 사용.

**추천 스택**: std + abseil + 핫모듈에 folly subset.

### 대형 (50+ 명, 500k+ LOC, production scale)

Folly 전면 도입 검토 가치. Meta급 워크로드면 throughput 차이가 cluster 비용으로 환산됨.

**추천 스택**: std + folly 전면 + abseil은 일부.

## throughput vs latency profile

```text
[1] throughput-bound (배치, ML 학습, ETL)
   - F14, fbstring, jemalloc 통합으로 alloc 비용 절감 효과 큼
   - Folly가 유리

[2] latency-bound (RPC handler, 실시간)
   - try_get_fast, lock-free queue, IOBuf zero-copy
   - Folly의 production 디테일이 빛남

[3] startup-bound (CLI tool, short-lived)
   - Folly의 무거운 init 비용이 부담
   - std + abseil이 유리
```

## 측정 워크플로

새 모듈을 시작할 때.

```text
1. std로 구현, 정확성 우선
2. 핫패스 식별 (perf, profile)
3. 핫패스에만 abseil/folly 후보 적용
4. 벤치마크로 std vs candidate 측정 (p50, p99, peak memory)
5. 측정 결과로 선택 확정
6. PR 설명에 이유 명시
```

이 사이클을 거치지 않은 mass-replace는 anti-pattern.

## Meta 외부에서의 현실

Meta 사내는 fbcode가 일관적으로 folly. 외부에선 다음 고려.

- **CI 빌드 시간** — folly 헤더는 무겁다. 빌드 시간이 두 배 이상 늘 수 있다.
- **header-only이 아님** — link 비용, ABI 호환.
- **API stability** — folly는 ABI 안정 보장 적음. major bump가 잦다.
- **문서 부족** — 일부 모듈은 source code가 유일한 문서.

이 비용을 감수할 만한 throughput·latency 이득이 있어야 한다.

## abseil의 자리

abseil은 std와 folly 사이.

- std에 가까운 API.
- Google production-validated.
- 의존성 적당 (boost 안 씀).
- 문서 좋음.

"std로 부족한데 folly는 과한" 자리에 abseil. flat_hash_map, Status, Cord, Span 등.

## 코드 리뷰에서의 질문

PR에 새 folly 의존성이 추가됐을 때 묻는다.

1. std 또는 abseil로 안 되는 이유는?
2. 벤치마크 결과 (전/후 비교)?
3. 의존성 증가가 빌드시간에 미치는 영향?
4. 팀 익숙도 (다른 사람이 유지보수 가능?)
5. fallback path는?

답이 명확하지 않으면 std로 시작 권장.

## 정리

- folly는 무조건 빠르지 않다. **컨텍스트가 맞아야** std/abseil을 이긴다.
- 결정 변수: 의존성 비용, 워크로드 규모, latency profile, 팀 익숙도, 빌드 시간.
- 외부 lib는 std, 핫패스만 선택적 folly, 큰 시스템은 전면 folly 검토.
- 카테고리별 선택 표를 따른다.
- 측정 없는 도입은 anti-pattern.
- abseil은 "std 부족, folly 과함" 자리에 자주 답.

## 시리즈를 마치며

이 시리즈는 Folly의 핵심 모듈을 통해 production-scale C++ 라이브러리의 설계 결정을 살펴봤다. 단순한 API 사용법보다 **왜 이런 형태인가**에 무게를 뒀다.

같은 시각으로 abseil, boost, range-v3 같은 다른 라이브러리도 읽어 보면, 각 팀이 어떤 워크로드를 가정하고 trade-off를 했는지 보인다. 라이브러리의 "왜"를 읽는 능력은 자기 코드의 trade-off를 더 명확히 만든다.

## 다음 추천 시리즈

- **Effective Modern C++** — Folly가 활용한 C++ 기능들의 토대.
- **Performance Engineering** — Folly가 푸는 문제(throughput, latency)의 일반 원리.
- **Abseil deep dive** (예정) — Google 측 대응 라이브러리.

## 관련 항목

- [Part 1-02 Folly vs Abseil philosophy](/blog/programming/code-review/folly/part1-02-folly-vs-abseil-philosophy) — 두 라이브러리의 출발점
- [Part 14-01 Meta 스타일 review](/blog/programming/code-review/folly/part14-01-meta-style-review) — 측정 우선 리뷰
- [Part 14-02 Folly anti-patterns](/blog/programming/code-review/folly/part14-02-folly-anti-patterns) — 잘못된 선택의 사례
