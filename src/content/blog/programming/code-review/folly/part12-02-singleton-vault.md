---
title: "Part 12-02: SingletonVault (등록 / 소멸 / 의존성)"
date: 2026-05-25T08:00:00
description: "Part 12-02: SingletonVault — 모든 singleton의 통합 관리. 등록 순서, 의존성 그래프, eager/lazy 전략."
series: "Folly Code Review"
seriesOrder: 54
tags: [cpp, folly, singleton, vault, lifetime]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

## 한 줄 요약

`folly::SingletonVault`는 process 안 모든 `folly::Singleton<T>`의 **registry**다. 등록 순서를 추적하고, 의존성 그래프를 토대로 역순 소멸을 보장한다. fork 훅과 eager init 옵션도 관리한다. main에서 한 번의 `registrationComplete()`로 라이프사이클이 활성화된다.

## 동기 — singleton들의 관제탑

개별 singleton이 자기만 잘 관리해서는 부족하다. 시스템에 있는 모든 singleton이 다음을 만족해야 한다.

- 등록 순서 추적 (역순 소멸을 위해).
- 의존성 그래프 (A가 B를 쓰면 A를 먼저 죽임).
- shutdown 시그널 한 곳에서 일괄 처리.
- fork 직전 모든 mutex 정리.

singleton 한 객체 안에 이걸 다 두면 전역 상태가 흩어진다. vault라는 중앙 객체에 모은다.

## 구조

```cpp
class SingletonVault {
  // 등록된 모든 singleton (type → entry)
  folly::F14FastMap<TypeDescriptor, std::shared_ptr<SingletonHolderBase>> singletons_;

  // 등록 순서 (역순 소멸용)
  std::vector<TypeDescriptor> creationOrder_;

  // 라이프사이클 상태
  enum class State { Running, Quiescing, Dead };
  std::atomic<State> state_;

  // pthread_atfork 훅 등록 여부
  bool atForkInstalled_;
};
```

전역 instance.

```cpp
static SingletonVault* SingletonVault::singleton(...);
```

`folly::Singleton<T>` 생성자가 vault에 자기를 등록한다.

## 등록 — TU-level static

```cpp
template <typename T>
class Singleton {
  Singleton() {
    SingletonVault::singleton()->registerSingleton(
      TypeDescriptor::create<T>(), holder_);
  }
};

namespace {
  folly::Singleton<Database> kDatabase; // ← 이 시점에 vault에 등록됨
}
```

전역/네임스페이스-static singleton은 main 진입 전에 생성자가 호출되며 vault에 등록된다. 등록 순서가 vector에 차곡차곡 쌓인다.

## registrationComplete

```cpp
int main() {
  folly::SingletonVault::singleton()->registrationComplete();
  ...
}
```

이 호출 전에는 `try_get`이 항상 nullptr. 의도는 두 가지.

1. **모든 등록이 끝났다는 확정**. 이후 새 등록을 거부할 수 있다.
2. **eager singleton 일괄 초기화**. `shouldEagerInit()`로 표시된 singleton을 즉시 생성.

이 호출 전후의 상태가 명확히 분리되므로, 의존성 사이클이 있으면 여기서 진단하기 쉽다.

## eager vs lazy

```cpp
// lazy (default) — 첫 try_get 시 생성
folly::Singleton<Foo> kFoo;

// eager — registrationComplete에서 생성
folly::Singleton<Foo> kFoo = folly::Singleton<Foo>().shouldEagerInit();
```

| 모드 | 생성 시점 | 장점 | 단점 |
|------|----------|------|------|
| lazy | first try_get | startup 빠름, 안 쓰면 안 만듦 | 첫 호출자가 비용 부담 |
| eager | registrationComplete | 핫패스 일정 | startup 느림 |

핫패스에서 자주 쓰는 singleton은 eager가 좋다. 가끔 쓰는 admin tool은 lazy.

## destroyInstances — 역순 소멸

```cpp
void destroyInstances() {
  state_ = State::Quiescing;

  // creationOrder_를 역순으로 소멸
  for (auto it = creationOrder_.rbegin(); it != creationOrder_.rend(); ++it) {
    auto& holder = singletons_[*it];
    holder->destroyInstance();
  }

  state_ = State::Dead;
}
```

핵심.

- 등록 순서 = 의존성 순서(A가 B를 쓰면 B가 먼저 등록되어 있어야 try_get이 안전).
- 소멸은 그 역순.
- 소멸 중 다른 singleton try_get은 차단(State::Quiescing).

shared_ptr가 외부에 풀려 있으면 destroyInstance가 reference count를 떨어뜨릴 뿐, 실제 destroy는 마지막 shared_ptr이 사라질 때. race-free.

## fork 훅

```cpp
// vault 초기화 시 한 번
pthread_atfork(
  /*prepare*/ []{ vault->lockAllSingletons(); },
  /*parent*/  []{ vault->unlockAllSingletons(); },
  /*child*/   []{ vault->reenableInstances(); }
);
```

prepare에서 모든 singleton 내부 mutex를 잡고, child에서 reset. fork 후 child에서 첫 try_get이 deadlock 없이 진행.

## 코드 리뷰 포인트

### 1. shouldEagerInit 결정

```cpp
// 핫패스에서 자주 쓰면
folly::Singleton<Cache> kCache = folly::Singleton<Cache>().shouldEagerInit();

// 가끔만 쓰면 lazy
folly::Singleton<DebugTool> kDebug;
```

production에선 거의 모두 eager가 무난. lazy는 first request의 P99 latency를 망친다.

### 2. test에서 vault reset

```cpp
class MyTest : public ::testing::Test {
  void SetUp() override {
    folly::SingletonVault::singleton()->destroyInstances();
    folly::SingletonVault::singleton()->reenableInstances();
  }
};
```

test가 singleton state를 공유하면 flaky. 매 test에서 reset.

### 3. 의존성 그래프 명시

```cpp
folly::Singleton<A> kA;
folly::Singleton<B> kB([]{
  // A를 try_get하면 vault가 dependency를 추적
  auto a = folly::Singleton<A>::try_get();
  return new B(a.get());
});
```

이렇게 작성하면 B의 destroyInstance 후 A가 destroy됨. 역순 보장.

### 4. registrationComplete를 두 번 호출

```cpp
// 회피
registrationComplete(); // first
// ...
registrationComplete(); // throw
```

두 번 호출은 에러. main에서 단 한 번.

## 안티패턴

### 1. 전역 destructor에서 try_get

```cpp
// 회피
struct GlobalCleanup {
  ~GlobalCleanup() {
    folly::Singleton<Logger>::try_get()->log("bye"); // Logger 이미 소멸됨
  }
};
GlobalCleanup g;
```

전역 객체의 소멸은 vault destroy 후에 일어날 수 있다. shutdown 로그는 main 마지막에 명시.

### 2. shared_ptr를 전역 static으로

```cpp
// 회피
static auto kLogger = folly::Singleton<Logger>::try_get();
// vault가 Logger를 영원히 못 destroy
```

vault의 역순 소멸 보장이 깨진다. try_get은 짧게.

### 3. registrationComplete 전 try_get

```cpp
// 회피
int main() {
  folly::Singleton<Foo>::try_get(); // 항상 nullptr
  folly::SingletonVault::singleton()->registrationComplete();
}
```

순서 반대.

## 정리

- SingletonVault는 모든 `folly::Singleton`의 **registry**.
- 등록 순서 = dependency 순서, 소멸은 역순.
- registrationComplete가 lifecycle을 활성화.
- shouldEagerInit으로 핫패스 객체를 미리 생성.
- pthread_atfork로 fork-safe.
- 전역 destructor·전역 shared_ptr 보관은 vault의 destruction order 보장을 깨므로 회피.

## 다음 편

[Part 12-03 try_get / try_get_fast](/blog/programming/code-review/folly/part12-03-try-get-fast) — 매 try_get 비용을 줄이는 TLS 캐시 메커니즘.

## 관련 항목

- [Part 12-01 Singleton vs Meyers](/blog/programming/code-review/folly/part12-01-singleton-vs-meyers) — 왜 vault인가
- [Part 7-04 F14FastMap](/blog/programming/code-review/folly/part7-04-f14-fast-map) — vault 내부 자료구조
- [Effective Modern C++ Item 21](/blog/programming/cpp/effective-modern-cpp/item21-prefer-make-unique-and-make-shared-to-direct-new) — shared_ptr 생성
