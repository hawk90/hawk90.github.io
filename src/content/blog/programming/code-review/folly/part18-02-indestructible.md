---
title: "Part 18-02: folly::Indestructible — global lifetime 패턴"
date: 2026-05-27T19:00:00
description: "Indestructible<T>의 동기 — Meyers singleton의 static deinitialization 함정과 그 회피."
series: "Folly Code Review"
seriesOrder: 77
tags: [cpp, folly, indestructible, singleton, lifetime]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

> **한 줄 요약**: `Indestructible<T>`는 *생성은 하되 영원히 destroy하지 않는* wrapper다. Meyers singleton이 static deinitialization order fiasco를 일으키는 자리에서 destructor를 건너뛰어 안전을 산다.

## 동기 — Static deinitialization order fiasco

```cpp
// foo.cpp
Foo& GetFoo() {
  static Foo instance;
  return instance;
}

// bar.cpp
Bar::~Bar() {
  GetFoo().Cleanup();   // process exit 시 Foo가 이미 destroy됐을 수 있음
}
```

C++ 표준은 *번역 단위 사이의 static destructor 순서*를 보장하지 않는다. process exit 시점에 `Foo`가 이미 destroy됐는데 `Bar::~Bar()`가 호출되면 *destroyed object 접근* — undefined behavior.

해법은 셋이다.

1. **Meyers singleton + 명시적 ordering** — 의존 객체가 항상 의존받는 객체를 *먼저* 만들도록 설계. 실수 잦음.
2. **할당된 채로 둠** — `new Foo`를 leak. process exit 시 OS가 회수. destructor 호출 안 됨.
3. **Indestructible** — 2를 깔끔하게 표현.

```cpp
#include <folly/Indestructible.h>

Foo& GetFoo() {
  static folly::Indestructible<Foo> instance;
  return *instance;
}
```

`instance` 자체는 stack-like static storage에 있다. 그러나 `~Foo()`가 호출되지 않는다. process 끝나면 OS가 메모리 회수.

## API

```cpp
#include <folly/Indestructible.h>

class MyConfig {
 public:
  MyConfig() { /* 생성 */ }
  // 일부러 destructor를 두지 않음 (또는 두더라도 호출 안 됨)
  
  std::string GetValue(folly::StringPiece key) const;
};

folly::Indestructible<MyConfig> kConfig;

void Use() {
  auto v = kConfig->GetValue("foo");
  // 또는 (*kConfig).GetValue(...)
}
```

```cpp
template <class T>
class Indestructible {
 public:
  template <class... Args>
  constexpr explicit Indestructible(Args&&... args) {
    new (&storage_) T(std::forward<Args>(args)...);
  }

  // 소멸자 — empty. T를 destroy하지 않음.
  ~Indestructible() {}

  T&       operator*()       { return *reinterpret_cast<T*>(&storage_); }
  T*       operator->()      { return reinterpret_cast<T*>(&storage_); }
  const T& operator*() const { /* ... */ }
};
```

placement new로 `T`를 생성하지만 소멸자에서 *아무것도 안 한다*. memory는 `Indestructible` 객체와 함께 reclaim되지만 `T::~T()`는 호출 안 됨.

### 메모리 영역 관점

`Indestructible<T>`은 사실 *static 영역의 byte 슬롯*을 arena처럼 쓴다. 객체 lifetime이 process 전 구간이므로 free가 의미 없는 영역이다.

![Heap vs stack vs arena](/images/blog/cpp-concepts/diagrams/heap-vs-stack-vs-arena.svg)

이 그림의 arena와 본질이 같다 — 한 번 자리잡으면 process가 끝날 때 OS가 통째로 회수한다. heap에 두고 leak시키는 것과 차이는 *어디서 reclaim하는가*일 뿐이다.

## 왜 destructor를 건너뛰는가

```cpp
// 잘못된 의존 — Logger가 Mutex에 의존
namespace {
  Mutex   logMutex;   // 1
  Logger  logger;     // 2 (logMutex 사용)
}

// process exit
// ~Logger() 가 실행 — logMutex 사용
// ~logMutex() 가 그 후 실행
// 만약 reverse 순서로 deinit되면 Logger가 dead Mutex 접근
```

Meyers singleton과 같은 문제. 한 번 만들고 *영원히 살려두면* 이 함정이 사라진다. process exit 시 모든 static destructor가 안 호출되는 게 *오히려 안전*한 사례.

```cpp
folly::Indestructible<Mutex>  logMutex;
folly::Indestructible<Logger> logger{*logMutex};
// 둘 다 destroy되지 않음 — 의존 그래프 신경 안 써도 됨
```

## 비교 — leak vs Indestructible

```cpp
// 1. raw leak
Foo* g_foo = nullptr;
Foo& GetFoo() {
  static std::once_flag flag;
  std::call_once(flag, [] { g_foo = new Foo; });
  return *g_foo;
}

// 2. Indestructible
Foo& GetFoo() {
  static folly::Indestructible<Foo> g_foo;
  return *g_foo;
}
```

| 항목 | raw leak | Indestructible |
|------|----------|----------------|
| memory | heap | static storage |
| init | once_flag 명시 | static init magic |
| 코드 | 길음 | 한 줄 |
| sanitizer leak 검출 | 잡힘 (suppress 필요) | 잡히지 않음 (storage가 static) |

Indestructible이 더 깔끔하다.

## constexpr 친화

```cpp
// constexpr 생성자가 있는 T면 Indestructible도 constinit 가능
constinit folly::Indestructible<MyConfig> kConfig{/* args */};
```

`constinit` storage가 static initialization fiasco를 더 줄인다. 모든 의존이 compile-time 결정된다.

## std와의 비교

| 항목 | std (없음) | folly::Indestructible | absl::NoDestructor |
|------|------------|------------------------|---------------------|
| 도입 | N/A | 수년 전 | 2020 |
| API | N/A | `Indestructible<T>` | `NoDestructor<T>` |
| constexpr 생성자 | N/A | 지원 | 지원 |
| operator* | N/A | 있음 | 있음 |

Abseil이 같은 패턴을 `absl::NoDestructor<T>`로 늦게 도입했다. 둘은 거의 동일. 이름이 의도를 더 명확히 한다는 점에서 NoDestructor 명명이 낫다는 의견도 있다.

## Meyers singleton과 Indestructible

```cpp
// Meyers
Foo& GetFooMeyers() {
  static Foo instance;          // ~Foo() 호출됨 → 순서 문제 risk
  return instance;
}

// Indestructible
Foo& GetFooIndestructible() {
  static folly::Indestructible<Foo> instance;  // ~Foo() 호출 안 됨 → 안전
  return *instance;
}
```

Meyers는 thread-safe init (C++11+)을 제공한다. `Indestructible`도 static initialization이므로 같은 보장. 차이는 *destruction 시점*.

대부분의 의존 객체는 process 생명주기 동안 살아있으면 충분. *destructor가 의미 있게 할 일*이 있는 객체만 일반 static. 예외 처리, 의도적 reset이 필요한 객체는 일반 static이 옳다.

## 코드 리뷰 포인트

- global mutex/logger/cache 가 일반 `static T`로 선언 → Indestructible로 바꿔 deinit 위험 제거.
- Indestructible 내부 T가 *RAII로 자원 release를 해야*하는 타입 (file handle, network connection) → process exit 시 OS가 닫지 않는 자원이라면 leak. 그땐 일반 static.
- Indestructible이 사용자 init 코드를 가지면 static init order 문제가 남음. 가능하면 default constructor.
- ASan/LSan에서 false negative 우려 — leak이 OK인 거지 *진짜 leak*도 못 잡는 건 아님. 명시적 표현으로 의도 분명히.

## 자주 보는 안티패턴

```cpp
// 1. heavy 자원을 Indestructible로 보유
folly::Indestructible<std::vector<HeavyObject>> kCache{LoadCache()};
// → process exit 시 heap에 leak — OS가 회수하지만 leak detector noise

// 2. Indestructible을 thread_local
thread_local folly::Indestructible<Foo> kFoo;
// → thread 종료 시 storage 사라짐 — 의도와 맞나? 보통은 그냥 thread_local Foo가 OK

// 3. ~Indestructible() 실행 후 *kFoo 접근 (불가능하지만 의도 헷갈림)
// → Indestructible 자체는 trivially destructible이므로 함수 frame 끝에 사라짐
//   global storage에 두는 게 일반 사용. local Indestructible은 어색.
```

## 실전 — fbcode global registry

```cpp
// log category registry
namespace folly {
LogCategoryRegistry& LoggerDB::get() {
  static folly::Indestructible<LogCategoryRegistry> registry;
  return *registry;
}
}
```

logger registry는 process 생명주기 동안 항상 있어야 하고 exit 시점에 임의 순서로 destroyed되면 안 됨. Indestructible이 표준 패턴.

## 정리

- `Indestructible<T>`는 *영원히 살아있는* wrapper.
- destructor 호출을 건너뛰어 static deinit order 문제를 회피.
- Meyers singleton의 더 안전한 대안.
- `absl::NoDestructor<T>`가 같은 패턴 (명명이 더 명확).
- destructor가 정말 *의미 있는 일*을 해야 하면 일반 static 사용.

## 다음 편

[Part 18-03: MicroLock](/blog/programming/code-review/folly/part18-03-micro-lock)에서 1-byte lock primitive를 본다.

## 관련 항목

- [Folly Part 12-01 — Singleton vs Meyers](/blog/programming/code-review/folly/part12-01-singleton-vs-meyers)
- [Folly Part 12-02 — Singleton Vault](/blog/programming/code-review/folly/part12-02-singleton-vault)
- [원문 — folly/Indestructible.h](https://github.com/facebook/folly/blob/main/folly/Indestructible.h)
