---
title: "Part 21-01: folly::observer — hot config의 atomic refresh"
date: 2026-05-28T11:00:00
description: "folly::observer — read mostly 값의 atomic refresh, hot config·feature flag·LB weight 같은 패턴의 표준."
series: "Folly Code Review"
seriesOrder: 87
tags: [cpp, folly, observer, config, atomic]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

> **한 줄 요약**: `folly::observer`는 *드물게 업데이트되고 자주 읽히는* 값을 atomic하게 refresh하는 framework다. config, feature flag, load balancer weight 같은 hot read 자리에서 lock 없이 새 값을 빌어온다.

## 동기

production server에 동적으로 변하는 값이 많다.

- feature flag (`gating.enabled_for_user(uid)`).
- load balancer weight.
- timeout threshold.
- rate limit window.
- experiment treatment.

이 값들은 *수십만 req/sec*에서 읽히고 *수초~수분*마다 한 번 갱신된다. naive 구현은 다음 함정이 있다.

```cpp
std::mutex cfgMutex;
Config currentConfig;

Config GetConfig() {
  std::lock_guard lk(cfgMutex);   // 모든 read가 lock 경합
  return currentConfig;
}
```

lock이 hot path에서 cache line ping-pong을 일으킨다.

```cpp
std::atomic<std::shared_ptr<Config>> config;   // C++20 atomic shared_ptr

Config GetConfig() {
  return *config.load();
}
```

atomic shared_ptr가 표준이지만 *모든 read마다 ref count CAS*가 일어난다. 여전히 cache 비용.

`folly::observer`는 *RCU 같은* 방식으로 read를 lock-free, atomic-CAS-free에 가깝게 만든다.

## API

```cpp
#include <folly/observer/Observer.h>
#include <folly/observer/SimpleObservable.h>

folly::observer::SimpleObservable<Config> obs{LoadInitialConfig()};

folly::observer::Observer<Config> read = obs.getObserver();

// 어딘가에서 update
obs.setValue(LoadNewConfig());

// hot path read
void HandleRequest() {
  auto snapshot = read.getSnapshot();
  // snapshot은 reference-stable Config*
  if (snapshot->isFeatureEnabled()) {
    // ...
  }
}
```

두 타입.

- `SimpleObservable<T>` — value를 들고 있는 owner. `setValue`로 갱신.
- `Observer<T>` — read-only view. `getSnapshot()`이 hot path.

`getSnapshot()`은 거의 무료 (atomic load 1회 + thread-local cache).

## Snapshot 모델

```cpp
folly::observer::Snapshot<Config> snap = obs.getSnapshot();

// snap이 살아있는 동안 T*가 안정 — refresh 일어나도 이 snapshot은 옛 값
const Config& cfg = *snap;
ProcessLong(cfg);   // 중간에 setValue가 와도 cfg는 일관됨

// snapshot이 destroy되면 옛 값은 GC 가능
```

`Snapshot<T>`는 RAII로 reference를 잡는다. 잡고 있는 동안 그 버전의 T가 *살아있다*. 새 setValue가 와도 옛 snapshot 사용자는 영향 없음. snapshot이 모두 destroy되면 옛 버전이 GC.

이게 RCU(Read-Copy-Update)의 user-space 변형.

## 합성 — observer chain

```cpp
auto config = configObs.getObserver();   // Observer<Config>

auto timeoutObs = folly::observer::makeObserver([config] {
  auto snap = (*config).getSnapshot();
  return snap->timeout_ms;   // 의존성 자동 추적
});

// 사용
void HandleReq() {
  auto t = timeoutObs.getSnapshot();
  ApplyTimeout(*t);
}
```

`makeObserver([func])`는 *derived* observer를 만든다. func 안에서 다른 observer를 *snapshot*하면 그것이 의존성으로 추적된다. 의존 observer가 update되면 derived도 자동 refresh.

선언적 dataflow — Excel formula 같은 모델.

## 내부 구조

```cpp
// folly/observer/Observer.h 약식
class ObserverCore {
 public:
  std::shared_ptr<const void> getCurrentValue() const;
  void setValue(std::shared_ptr<const void> newVal);
  
  // dependent observer
  void addDependent(std::weak_ptr<ObserverCore> dep);
  void notifyDependentsAsync();   // executor에 schedule
  
 private:
  std::atomic<std::shared_ptr<const void>> value_;
  std::vector<std::weak_ptr<ObserverCore>> dependents_;
};

template <class T>
class Observer {
  std::shared_ptr<ObserverCore> core_;

  Snapshot<T> getSnapshot() const {
    auto val = core_->getCurrentValue();   // atomic load + ref count
    return Snapshot<T>{std::static_pointer_cast<const T>(val)};
  }
};
```

값은 `shared_ptr<const T>`로 보관. setValue는 atomic store, getSnapshot은 atomic load + ref count. C++20 atomic shared_ptr 동작과 비슷하나 *snapshot 자체*가 thread-local 캐시될 수 있어 hot path가 빠르다.

### Thread-local snapshot 캐시

```cpp
template <class T>
class TLObserver {
  ThreadLocal<Snapshot<T>> cached_;
  Observer<T>              base_;

  Snapshot<T> getSnapshot() {
    auto& cache = *cached_;
    if (cache && stillCurrent(cache)) return cache;
    cache = base_.getSnapshot();
    return cache;
  }
};
```

`TLObserver`가 thread-local 캐시. 같은 thread에서 두 번째 read부터는 atomic load조차 회피.

## 사용 패턴 — feature flag

```cpp
class FeatureGate {
  folly::observer::Observer<FlagSet> flags_;
 public:
  FeatureGate(folly::observer::Observer<FlagSet> obs) : flags_(std::move(obs)) {}

  bool IsEnabled(folly::StringPiece name) const {
    auto snap = flags_.getSnapshot();
    return snap->contains(name);
  }
};

// 어딘가에서 update
flagsObservable.setValue(LoadFromConfigServer());
```

config server에서 flag set이 update되면 다음 request부터 새 flag set 적용. 모든 read는 lock 없이 atomic load.

## std와의 비교

| 항목 | 표준 (없음) | folly::observer | absl (없음) | std::atomic<shared_ptr> |
|------|------------|------------------|---------------|------------------------|
| 자동 refresh | N/A | derived observer | N/A | 직접 update |
| dataflow chain | N/A | makeObserver | N/A | 없음 |
| thread-local cache | N/A | TLObserver | N/A | 없음 |
| snapshot lifetime | N/A | RAII Snapshot | N/A | shared_ptr |
| 표준 | N/A | folly | N/A | C++20 |

C++20 `std::atomic<std::shared_ptr<T>>`가 *원시 기능*만 표준화. derived observer, thread-local cache 같은 고급 기능은 라이브러리.

## 코드 리뷰 포인트

- `Observer`를 매 request마다 새로 만듦 → ObserverCore 등록 비용. *한 번 생성*해 멤버로 보관.
- snapshot을 *오래* 잡고 있으면 옛 버전 GC 안 됨. 짧은 scope.
- derived observer 안에서 *비결정적* 작업 (random, time)이 있으면 의존성 추적 깨짐. 순수 함수가 권장.
- update가 매우 자주 (초당 수십 번)면 observer 모델이 부적합. atomic value 또는 다른 패턴.
- TLObserver가 모든 자리에 필요한 건 아님 — extreme hot path만.

## 자주 보는 안티패턴

```cpp
// 1. snapshot을 멤버로 보관
struct Handler {
  folly::observer::Snapshot<Config> snap_ = configObs.getSnapshot();   // 영원히 옛 값
  void handle() { use(*snap_); }   // refresh 안 됨
};
// → Observer를 보관하고 handle 안에서 getSnapshot

// 2. setValue를 hot path에서
void HandleReq(Req r) {
  observable.setValue(newConfig);   // request마다 update?
  // → write가 자주면 observer 부적합
}

// 3. derived observer의 func 안에서 다른 thread 작업
auto derived = folly::observer::makeObserver([] {
  return std::async([] { return load(); });   // 의존성 추적 안 됨
});

// 4. snapshot lifetime을 RAII 밖으로
const Config& cfg = *snap;
return &cfg;   // snap이 scope 끝에 destroy → dangling
```

## 실전 — load balancer weight

```cpp
class LoadBalancer {
  folly::observer::Observer<Weights> weights_;

 public:
  LoadBalancer(folly::observer::Observer<Weights> obs)
    : weights_(std::move(obs)) {}

  Backend& Pick() {
    auto snap = weights_.getSnapshot();
    return weightedRandom(*snap);
  }
};

// background thread가 health check 기반 weight 계산
backgroundExecutor->add([&] {
  auto newWeights = ComputeFromHealth();
  weightsObservable.setValue(std::move(newWeights));
});
```

매 request의 `Pick()`은 lock-free atomic load. weight update는 background에서 분리. read/write가 *각자의 hot path*를 가진다.

## 정리

- `folly::observer`는 read-mostly 값의 atomic refresh framework.
- `SimpleObservable` writer + `Observer` reader 분리.
- `Snapshot<T>` RAII로 reference 안정성 보장.
- `makeObserver`로 derived observer chain — Excel formula 같은 dataflow.
- `TLObserver`로 thread-local cache, extreme hot path용.

## 다음 편

[Part 21-02: fbcode 패턴 모음](/blog/programming/code-review/folly/part21-02-fbcode-patterns)으로 시리즈를 마무리한다.

## 관련 항목

- [Folly Part 9-01 — Synchronized](/blog/programming/code-review/folly/part9-01-synchronized) — lock-based 대안
- [Folly Part 18-02 — Indestructible](/blog/programming/code-review/folly/part18-02-indestructible)
- [원문 — folly/observer/Observer.h](https://github.com/facebook/folly/blob/main/folly/observer/Observer.h)
