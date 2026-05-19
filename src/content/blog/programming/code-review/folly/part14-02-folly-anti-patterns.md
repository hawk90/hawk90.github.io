---
title: "Part 14-02: Folly anti-patterns (잘못 쓰면 std보다 느림)"
date: 2026-05-25T16:00:00
description: "Part 14-02: Folly 오용 패턴 정리 — SemiFuture without via, fbstring small case, F14 잘못된 default, 등."
series: "Folly Code Review"
seriesOrder: 62
tags: [cpp, folly, anti-pattern, performance, mistakes]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

## 한 줄 요약

Folly가 std보다 느려지는 대표적 사례는 **그 자체로는 빠른 도구를 잘못된 컨텍스트에 쓰는 것**이다. SemiFuture를 via 없이 chain, fbstring을 짧은 문자열에 사용, F14를 작은 N에 사용, MPMCQueue를 SPSC 자리에 사용 같은 패턴이 자주 보인다. 이 절은 그 안티패턴과 진단 방법을 정리한다.

## 안티패턴 1 — SemiFuture without via

```cpp
// 회피
folly::SemiFuture<int> sf = doAsync();
auto v = sf.get(); // 어디서 실행되는지 모름
```

`SemiFuture`는 **executor가 정해지지 않은 future**다. `.via(executor)`로 명시해야 어디서 callback이 돈다. 안 하면 fallback inline executor로 폴백되어 caller thread를 잡거나, get()으로 동기 wait 되어 throughput 망가짐.

```cpp
// Good
auto v = std::move(sf).via(&executor).thenValue([](int x){
  return process(x);
}).get();
```

진단: callback이 어느 thread에서 실행되는지 stack trace로 확인. 의도 외 thread면 via 누락.

## 안티패턴 2 — fbstring 짧은 문자열에 사용

`fbstring`은 jemalloc 통합과 COW(legacy)·SBO 같은 최적화가 있지만, **23바이트 이하 문자열**에 대해서는 std::string과 성능 차이가 거의 없거나 fbstring이 약간 느릴 수 있다.

```cpp
// 회피 — 짧은 string인데 fbstring으로 통일
struct Order {
  folly::fbstring id;       // "ORD12345" — 8자
  folly::fbstring status;   // "OK" — 2자
};
```

내부적으로 std::string도 SBO를 갖는다. 짧은 string은 둘 다 stack에 저장 → 차이 미미.

fbstring이 진가를 발휘하는 케이스:
- 매우 큰 string (수 KB 이상)
- 대량의 string copy
- jemalloc과의 통합으로 fragmentation 감소

`std::string` vs `fbstring` 결정은 워크로드별 측정이 필요. mass-replace는 회피.

## 안티패턴 3 — F14를 작은 N에 사용

F14는 N > ~100쯤부터 std::unordered_map 대비 메모리/속도 이점이 크다. 그 이하에서는 차이가 작거나 오히려 std가 빠를 수도 있다.

```cpp
// 회피 — 5개 들어갈 map인데 F14
folly::F14FastMap<int, std::string> tinyMap;
```

작은 N에는 `boost::flat_map` 또는 정렬된 vector + binary search가 더 빠르다.

```cpp
// Good — small N
folly::small_vector<std::pair<int, std::string>, 8> tiny;
```

## 안티패턴 4 — MPMCQueue를 SPSC 자리에

```cpp
// 회피 — producer 1, consumer 1
folly::MPMCQueue<Frame> q(1024);
```

MPMCQueue는 ticket-based로 SPSC 대비 5-10배 느림. SPSC 패턴이 확실하면 ProducerConsumerQueue로 다운그레이드.

## 안티패턴 5 — Synchronized 안에서 무거운 작업

```cpp
// 회피
folly::Synchronized<std::vector<Item>> items;
items.withWLock([&](auto& v) {
  v.push_back(item);
  notifySubscribers();   // I/O — lock 잡은 채로
  uploadToCloud(item);   // I/O
});
```

lock scope에 I/O가 들어가면 다른 thread가 contention. lock은 최소 scope.

```cpp
// Good
{
  auto locked = items.wlock();
  locked->push_back(item);
}
// lock 풀고 I/O
notifySubscribers();
uploadToCloud(item);
```

## 안티패턴 6 — IOBuf을 매번 alloc

```cpp
// 회피
while (recv()) {
  auto buf = folly::IOBuf::create(4096); // 매번 새 buf
  process(buf);
}

// Good — buf 재사용 또는 pool
folly::IOBufQueue queue;
while (recv()) {
  auto buf = queue.preallocate(4096, 4096);
  process(buf);
}
```

IOBuf의 강점은 zero-copy chain인데 매번 alloc하면 의미 없음.

## 안티패턴 7 — folly::dynamic을 내부 데이터에

```cpp
// 회피
struct UserService {
  folly::dynamic users; // type 정보 잃음, 모든 접근이 enum dispatch
};

// Good
struct UserService {
  folly::F14FastMap<UserId, User> users; // type-safe
};
```

dynamic은 외부 boundary 전용. 내부 데이터는 struct.

## 안티패턴 8 — Singleton::try_get 핫패스에서

```cpp
// 회피 — 매 request마다 shared_ptr copy
void handler() {
  auto svc = folly::Singleton<Service>::try_get(); // 50-100ns
  svc->process();
}

// Good — try_get_fast
void handler() {
  auto* svc = folly::Singleton<Service>::try_get_fast(); // 3-5ns
  if (svc) svc->process();
}
```

## 안티패턴 9 — Future.get() 매번 호출

```cpp
// 회피
auto f = doAsync();
auto v = f.get(); // synchronous wait — async의 의미 무용지물
```

Future를 만들어 즉시 get하면 thread만 추가하고 동기처럼 동작. async value는 chain으로 연결.

```cpp
// Good
doAsync().thenValue([](auto v) { return next(v); });
```

## 안티패턴 10 — ConcurrentHashMap을 single-thread에서

```cpp
// 회피 — single-thread 코드에 ConcurrentHashMap
folly::ConcurrentHashMap<int, int> single_thread_map;
```

ConcurrentHashMap은 hazard pointer 등 동시성 비용을 항상 부담. single-thread면 F14FastMap이 더 빠름.

## 안티패턴 11 — Function/Promise를 const& 인자로

```cpp
// 회피
void run(const folly::Function<void()>& f);
// folly::Function은 move-only지만 const&로 받으면 move 의미가 모호

// Good
void run(folly::Function<void()> f); // by-value, move
```

move-only callable은 by-value로 받아 caller가 move.

## 안티패턴 12 — F14NodeMap에 작은 value

```cpp
// 회피
folly::F14NodeMap<int, int> m; // value가 int — node에 alloc 낭비

// Good
folly::F14ValueMap<int, int> m; // value inline 저장
```

NodeMap은 value가 큰 경우(reference stability 필요). 작은 value는 ValueMap.

## 안티패턴 13 — ScopeGuard 안에서 throw

```cpp
// 회피
SCOPE_EXIT { mayThrow(); }; // ScopeGuard가 silent 삼킴
```

scope 끝에서 throw는 stack unwinding과 충돌. noexcept 람다로.

## 안티패턴 14 — Optional<unique_ptr>

```cpp
// 회피 — 이중 nullable
folly::Optional<std::unique_ptr<T>> opt;

// Good — unique_ptr 자체가 nullable
std::unique_ptr<T> p;
```

## 안티패턴 15 — IOThreadPoolExecutor를 CPU-bound에

```cpp
// 회피
folly::IOThreadPoolExecutor io(1);
io.add([]{ heavy_compute(); }); // I/O thread를 CPU 작업으로 점유

// Good
folly::CPUThreadPoolExecutor cpu(num_cores);
cpu.add([]{ heavy_compute(); });
```

I/O thread가 CPU 작업으로 막히면 EventBase 처리가 멈춤.

## 진단 가이드

| 증상 | 의심 |
|------|------|
| async chain의 callback이 의도 외 thread에서 | SemiFuture without via |
| string 작업이 std 대비 느림 | fbstring 짧은 string |
| map 작은 N에서 F14가 더 느림 | F14 vs flat_map |
| queue throughput가 thread 수에 안 비례 | MPMCQueue vs SPSC |
| Synchronized contention 높음 | lock scope 너무 큼 |
| Singleton hot path에 latency spike | try_get vs try_get_fast |
| ConcurrentHashMap 단일 thread 사용 | F14FastMap으로 교체 |

각 증상에서 위 anti-pattern table을 역추적.

## 일반 원칙

**Folly의 도구는 컨텍스트에 맞을 때만 std를 이긴다**. 무조건 빠르지 않다.

1. 측정 없는 mass-replace 금지.
2. 워크로드의 N 크기, thread 수, latency 분포를 먼저 파악.
3. std/abseil/folly 세 후보를 같은 벤치마크로 비교.
4. 선택 이유를 PR 설명에 명시.

## 정리

- SemiFuture는 via로 executor 명시.
- fbstring/F14는 큰 N에서 진가. 작은 N은 std 또는 small_vector.
- MPMC/SPSC, Node/Value, IO/CPU — 컨텍스트에 정확히 맞춰 선택.
- Singleton 핫패스는 try_get_fast.
- 내부 데이터는 struct, dynamic은 boundary만.
- 측정 없는 도입은 안티패턴.

## 다음 편

[Part 14-03 std vs folly 선택 기준](/blog/programming/code-review/folly/part14-03-std-vs-folly-choice) — 프로젝트 규모·throughput·latency profile별 의사결정 가이드.

## 관련 항목

- [Part 14-01 Meta 스타일 review](/blog/programming/code-review/folly/part14-01-meta-style-review) — 측정 우선 리뷰
- [Part 14-03 std vs folly 선택](/blog/programming/code-review/folly/part14-03-std-vs-folly-choice) — 의사결정
- [Part 2-03 SemiFuture vs Future](/blog/programming/code-review/folly/part2-03-semi-future-vs-future) — via 누락의 대표 사례
