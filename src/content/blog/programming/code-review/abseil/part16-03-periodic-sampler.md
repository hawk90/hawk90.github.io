---
title: "absl::PeriodicSampler — 적응형 샘플링·jitter 회피"
date: 2026-06-13T09:14:00
description: "absl::profiling_internal::PeriodicSampler — sampling rate를 동적으로 조정, geometric distribution으로 jitter 회피. 메모리 할당 추적·profiling 인프라의 기반."
series: "Abseil Code Review"
seriesOrder: 78
tags: [cpp, abseil, sampling, profiling, performance]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## 한 줄 요약

`absl::profiling_internal::PeriodicSampler`는 *N번에 한 번 true를 반환*하는 atomic 카운터 기반 sampler다. 단순 modulo 분기와 달리 *geometric distribution*으로 다음 sampling 시점을 결정해 phase-lock과 cache miss bias를 피한다. tcmalloc의 sampling, Abseil의 hashtable instrumentation, gRPC의 trace sampling 등이 모두 이 메커니즘이다.

## 동기

샘플링이 필요한 상황은 흔하다.

- 모든 malloc을 추적하지 못한다(비용). N번에 한 번만 stack trace.
- 모든 RPC를 trace하지 못한다. 1% 정도만.
- 모든 hashtable insert에 instrumentation을 걸 수 없다.

가장 단순한 sampler는 *counter + modulo*다.

```cpp
// 회피 — 단순하지만 문제 다수
std::atomic<uint64_t> counter{0};

bool Sample() {
  return (counter.fetch_add(1) % 1024) == 0;
}
```

문제 세 가지:

1. **Bias**: 호출 빈도가 *주기와 공명*하면 같은 곳만 sampled. 예를 들어 한 함수가 1024번에 한 번 hot path를 지나면 그 path만 항상 sample.
2. **Cache contention**: counter atomic이 모든 thread의 hot path에 있어 cache line ping-pong.
3. **Rate 변경 비용**: sample rate를 바꾸려면 modulo 분기를 다시 컴파일.

`PeriodicSampler`가 이 셋을 해결한다.

## API와 사용법

`absl/profiling/internal/periodic_sampler.h`에 정의.

```cpp
#include "absl/profiling/internal/periodic_sampler.h"

class MallocSampler
    : public absl::profiling_internal::PeriodicSampler<MallocSampler, 1024> {
 public:
  static int64_t period() { return GetSampleRate(); }
};

ABSL_PER_THREAD_TLS_KEYWORD MallocSampler sampler_;

void* Malloc(size_t n) {
  if (sampler_.Sample()) {
    RecordStackTrace(n);
  }
  return RawMalloc(n);
}
```

`PeriodicSampler`는 CRTP. *템플릿 인자*로 default period를 받고 *정적 멤버 `period()`*로 런타임 변경 가능한 rate를 정의한다.

각 thread의 sampler 인스턴스가 *thread-local로 stride를 유지*하므로 atomic contention이 사라진다.

## 내부 구현

```cpp
template <typename Tag, int64_t default_period>
class PeriodicSampler {
 public:
  bool Sample() noexcept {
    // 빠른 경로 — 99.9%
    if (ABSL_PREDICT_TRUE(--stride_ > 0)) {
      return false;
    }
    return SubtleConfirmSample();
  }

 private:
  bool SubtleConfirmSample() noexcept;
  void Init();

  int64_t stride_ = 0;   // thread-local
};

template <typename Tag, int64_t default_period>
bool PeriodicSampler<Tag, default_period>::SubtleConfirmSample() noexcept {
  int64_t current_period = Tag::period();
  if (current_period <= 0) {
    stride_ = INT64_MAX;
    return false;
  }
  stride_ = NextStride(current_period);
  return true;
}
```

핵심은 두 가지.

### 1. fast path — 단순 decrement

호출 99% 이상이 `--stride_ > 0` 한 줄이다. branch predictor가 거의 항상 맞춘다. cache line은 thread-local이라 다른 thread와 공유 없음.

### 2. NextStride — geometric distribution

```cpp
int64_t NextStride(int64_t mean_period) {
  // exponential distribution sample
  // E[X] = mean_period
  double u = RandomDouble();          // (0, 1)
  return static_cast<int64_t>(-std::log(u) * mean_period) + 1;
}
```

다음 sampling까지의 간격을 *지수 분포*에서 뽑는다. 평균은 `period`지만 *실제 간격은 임의*. 호출 빈도와 공명하지 않는다 — Poisson process의 성질.

geometric/exponential distribution은 *memoryless* property를 가진다. "이미 1000회 호출했다"는 사실이 다음 sample까지 남은 횟수에 영향을 주지 않는다. 이게 bias-free의 통계적 보장.

## 활용 사례

### tcmalloc — heap profiling

```cpp
class HeapSampler : public PeriodicSampler<HeapSampler, ...> {
 public:
  static int64_t period() { return Static::sample_rate(); }
};

void* tc_malloc(size_t size) {
  void* p = inner_malloc(size);
  if (size > 0 && sampler_.Sample()) {
    profiling::RecordAlloc(p, size, CaptureStackTrace());
  }
  return p;
}
```

1 MB당 평균 1회 sample 같은 rate. heap profile은 *대용량 alloc일수록 높은 확률로 sample*되도록 size-weighted geometric을 사용한다.

### Swiss Table — load factor 통계

`absl::flat_hash_map`은 production에서 *random subset의 instance만 통계 수집*해 hash quality를 모니터링한다. `PeriodicSampler`로 1000 인스턴스당 1개를 추적.

### gRPC — trace sampling

`grpc_core::Sampler`는 같은 메커니즘으로 RPC 1%만 OpenTelemetry trace로 export.

## 코드 리뷰 포인트

**1. modulo 기반 sampler 발견 → 교체 후보**

```cpp
// 회피
if (counter.fetch_add(1) % rate == 0) Sample();

// Good
if (sampler_.Sample()) Sample();
```

counter 기반 sampler는 *contention + bias* 양쪽 문제가 있다.

**2. CRTP `Tag::period()` 통한 동적 rate**

```cpp
class MySampler : public PeriodicSampler<MySampler, 1024> {
 public:
  static int64_t period() {
    return absl::GetFlag(FLAGS_my_sample_rate);   // 런타임 변경 가능
  }
};
```

flag 하나로 production에서 rate를 조정할 수 있다. 코드 재빌드 불필요.

**3. thread-local 보장**

```cpp
// 회피 — atomic stride (contention)
class BadSampler { std::atomic<int64_t> stride_; };

// Good — thread-local (PeriodicSampler 기본)
ABSL_PER_THREAD_TLS_KEYWORD MySampler sampler_;
```

per-thread instance가 핵심. 잘못 shared singleton으로 만들면 의미가 사라진다.

**4. 매우 낮은 rate에서 정확도**

geometric distribution은 표본 수가 적으면 *분산*이 크다. 1만 호출에 1번 sample하면 실제 호출 수와 sample 수의 편차가 클 수 있다. 통계 분석 시 *Horvitz-Thompson estimator*나 *weighted sample*을 적용한다.

## std / Folly와의 비교

| 항목 | std | folly::SampledStats | absl::PeriodicSampler |
|---|---|---|---|
| 표준 | × | × | × |
| 분포 | — | uniform | geometric |
| thread-local | — | 일부 | 항상 |
| 동적 rate | — | 가능 | 가능 (CRTP) |
| atomic contention | — | 발생 | 없음 |

folly에는 `folly::CoreCachedSharedPtr` 등 sampling 도구가 있지만 *geometric distribution + thread-local*의 조합은 abseil이 가장 정제되어 있다.

## 자주 보는 안티패턴

**hot path에 RandomDouble() 직접 호출**

```cpp
// 회피 — 매 호출 RNG cost
if (RandomDouble() < 0.001) Sample();
```

RNG는 비용이 있다. `PeriodicSampler`는 RNG를 *slow path에서만* 호출하고 fast path는 단순 decrement.

**stride 공유**

```cpp
// 회피 — global stride
static int64_t shared_stride;
if (--shared_stride <= 0) { ... }   // race condition
```

per-thread만이 답.

**sample 안에서 sample**

```cpp
if (sampler_.Sample()) {
  HeavyOperation();   // 그 안에서 또 sampler 호출 → 통계 오염
}
```

sampler가 재진입되면 통계가 왜곡된다. sampling block 안에서는 sampler 호출 회피.

## 정리

- `PeriodicSampler`는 *thread-local + geometric distribution*으로 bias-free.
- fast path는 단순 decrement, slow path만 RNG 호출.
- CRTP의 `Tag::period()`로 런타임 rate 변경.
- tcmalloc, Swiss Table, gRPC 등의 sampling 기반.
- modulo + atomic 기반 sampler를 발견하면 거의 항상 교체 가치.

## 다음 편

Abseil Code Review 시리즈는 여기까지다. Folly 시리즈에서 대응 도구를 비교하거나 EMC++ 시리즈에서 함수 객체·자원 관리의 표준을 더 깊이 본다. Google C++ Style Guide (embedded/standards)에서 사내 코딩 규약과의 연결을 확인할 수 있다.

## 관련 항목

- [Part 16-02 — CRC32C](/blog/programming/code-review/abseil/part16-02-crc32c)
- [Part 16-01 — Stacktrace / Symbolize](/blog/programming/code-review/abseil/part16-01-stacktrace-symbolize)
- [Part 8-01 — BitGen](/blog/programming/code-review/abseil/part8-01-bit-gen) — RNG 기반
- [Part 6-01 — Mutex](/blog/programming/code-review/abseil/part6-01-mutex) — 동시성 primitive
- Folly Part 9-03 — sampling — Meta 대응
- [Tip of the Week #93: Using absl::Span](https://abseil.io/tips/93)
