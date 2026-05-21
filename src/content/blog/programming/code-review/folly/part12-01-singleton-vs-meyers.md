---
title: "Part 12-01: Singleton vs Meyers / static (왜 Folly의 Singleton인가)"
date: 2026-05-25T07:00:00
description: "Part 12-01: Meyers singleton과 static 변수의 한계 — destruction order, fork safety, dependency 관리."
series: "Folly Code Review"
seriesOrder: 53
tags: [cpp, folly, singleton, meyers, lifetime]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

## 한 줄 요약

`folly::Singleton<T>`는 Meyers singleton(함수 내부 static)이 풀지 못하는 세 가지 — **destruction order, fork safety, dependency**를 명시적으로 다룬다. 모든 singleton이 `SingletonVault`에 등록되어 통합 관리되고, 의존성 그래프를 토대로 역순 소멸이 보장된다.

## 동기 — Meyers singleton의 한계

```cpp
// 가장 흔한 패턴
SomeService& instance() {
  static SomeService s;
  return s;
}
```

이게 Meyers singleton이다. C++11 이후 thread-safe 초기화가 보장되고, 코드 한 줄이라 빠르다. 그러나 production에서 다음 문제가 나타난다.

### 1. destruction order 미정의

전역 static의 소멸 순서는 **TU(translation unit) 간 미정의**다. A가 B에 의존하면 A 소멸 시 B가 이미 소멸됐을 수 있다.

```cpp
LoggerService& logger();
DatabaseService& db();  // logger 사용

DatabaseService::~DatabaseService() {
  logger().log("db shutdown"); // 어쩌면 logger가 이미 사라짐 → crash
}
```

함수 내부 static은 "처음 호출된 순서의 역순으로 소멸"되지만, 호출 시점은 런타임마다 다르다. atexit handler에서 race 발생 가능.

### 2. fork-safety 없음

```cpp
auto pid = fork();
if (pid == 0) {
  // child
  logger().log("hi"); // mutex가 lock된 상태로 fork되면 deadlock
}
```

fork는 메모리는 copy하지만 스레드는 안 가져온다. 다른 스레드가 잡고 있던 mutex가 child에서 영원히 lock 상태로 남는다. Meyers singleton 안의 mutex가 그렇게 되면 child가 first call에서 hang.

### 3. dependency 관리 없음

A가 B를 쓴다. 그러면 B가 먼저 초기화돼야 한다. Meyers는 lazy니까 "처음 호출 시"에 초기화되는데, A의 생성자가 호출되기 전에 B가 ready인지 보장 안 됨. 실제로는 우연히 잘 작동하다가 link 순서가 바뀌면 깨진다.

### 4. test isolation

테스트에서 singleton을 reset/replace하기가 거의 불가능. process 단위로만 lifecycle이 정의된다.

## folly::Singleton의 해법

```cpp
#include <folly/Singleton.h>

namespace {
  folly::Singleton<DatabaseService> kDatabase;
  folly::Singleton<LoggerService> kLogger;

  // 의존성 명시
  folly::Singleton<DatabaseService> kDatabaseDep =
    folly::Singleton<DatabaseService>().shouldEagerInit();
}

// 사용
auto db = folly::Singleton<DatabaseService>::try_get();
if (db) {
  db->query(...);
}
```

핵심 메커니즘.

- **SingletonVault에 등록** — 모든 singleton이 vault에 자동 등록.
- **명시적 시작/종료** — `SingletonVault::singleton()->registrationComplete()` / `->destroyInstances()`.
- **dependency tracking** — Vault가 의존성 그래프를 알고 역순 소멸.
- **fork hook** — fork 직전 vault가 모든 singleton의 mutex 상태 정리.

## API

```cpp
// 등록 (TU-level)
namespace {
  folly::Singleton<MyService> kMyService;

  // 커스텀 생성자
  folly::Singleton<MyService> kMyService2{
    [] { return new MyService(42); }
  };

  // 의존성
  folly::Singleton<MyService> kMyService3 = folly::Singleton<MyService>()
    .shouldEagerInit();
}

// 접근
auto p = folly::Singleton<MyService>::try_get();  // shared_ptr<T> (nullable)
auto r = folly::Singleton<MyService>::try_get_fast(); // TLS-cached (다음 절)

// main()에서
int main() {
  folly::SingletonVault::singleton()->registrationComplete();
  // 이후 사용 가능
  ...
  // exit 시 자동 destroyInstances 호출
}
```

`try_get`은 **shared_ptr**을 돌려준다. 호출자가 들고 있는 동안 vault는 그 singleton을 못 destroy한다. 이게 race-free shutdown의 핵심.

## destruction order — 역순 보장

vault는 등록 순서를 기록한다. `destroyInstances()` 호출 시 등록 역순으로 destroy.

```cpp
// 등록 순서
folly::Singleton<Logger> kLogger;     // 1번
folly::Singleton<Database> kDatabase; // 2번
folly::Singleton<Server> kServer;     // 3번

// shutdown
vault->destroyInstances();
// 소멸 순서: Server → Database → Logger
```

Server가 Database를 쓰고, Database가 Logger를 쓰는 dependency라면 등록 순서대로 잡으면 안전. shouldEagerInit으로 명시하면 더 확실하다.

## fork safety

```cpp
folly::SingletonVault::singleton()->reenableInstances(); // fork 후 child에서
```

Vault는 `pthread_atfork` 훅을 등록한다. fork 직전에 모든 singleton mutex를 잡고, fork 후 child에서 release. mutex가 lock된 채로 fork되어 deadlock에 빠지는 케이스를 차단.

## std / Meyers 비교

| 방식 | thread-safe init | destruction order | fork-safe | test reset |
|------|-----------------|-------------------|-----------|------------|
| 함수 내부 static (Meyers) | yes (C++11+) | undefined | no | no |
| 전역 변수 | no | undefined | no | no |
| `std::shared_ptr<T>` + once_flag | yes | manual | manual | yes |
| `folly::Singleton<T>` | yes | reverse-registration | yes | yes (vault reset) |
| `absl::NoDestructor<T>` | yes | **소멸 안 함** | leak이므로 N/A | no |

`absl::NoDestructor`는 "destruction 문제를 아예 없애기" 전략 — 객체를 destroy하지 않는다. 메모리 누수지만 단순. Folly는 반대로 "제대로 destroy하자" 전략.

## 코드 리뷰 포인트

### 1. try_get 결과를 항상 null check

```cpp
// 회피
folly::Singleton<MyService>::try_get()->doWork(); // shutdown 후 null

// Good
if (auto p = folly::Singleton<MyService>::try_get()) {
  p->doWork();
}
```

`try_get`은 vault가 destroyInstances를 호출한 후엔 nullptr. 항상 null check.

### 2. registrationComplete 누락

```cpp
// 회피
int main() {
  // registrationComplete 호출 안 함
  folly::Singleton<Foo>::try_get(); // 항상 nullptr
}
```

main 시작부에 한 번 명시. 다중 main이 있는 라이브러리는 first call에 fence 둠.

### 3. 의존성 그래프 명시

```cpp
// 회피 — 의존성 implicit
folly::Singleton<A> kA;
folly::Singleton<B> kB; // A를 씀, 그러나 vault는 모름

// Good
folly::Singleton<A> kA;
folly::Singleton<B> kB([]{ return new B(folly::Singleton<A>::try_get().get()); });
```

생성자에서 다른 singleton을 try_get하면 vault가 의존성을 추적한다.

### 4. singleton 안에서 자기 자신 try_get

```cpp
// 회피 — 무한 재귀 또는 nullptr
A::A() {
  folly::Singleton<A>::try_get()->bar(); // 자기 자신, 초기화 진행 중
}
```

singleton 생성자에서 같은 type을 try_get하면 안 된다.

## 안티패턴

### 1. main 밖에서 try_get

```cpp
// 회피
struct GlobalInit {
  GlobalInit() { folly::Singleton<Foo>::try_get(); } // registrationComplete 전
};
GlobalInit g;
```

전역 객체 생성자는 main 전에 실행 → vault가 아직 안 준비됨.

### 2. shared_ptr 결과를 멤버로 영구 보관

```cpp
// 회피
class Server {
  std::shared_ptr<Database> db_ = folly::Singleton<Database>::try_get();
  // ↑ vault가 db_를 영원히 못 destroy → leak
};
```

shared_ptr은 짧게만 들고 작업 후 놓는다. 멤버에 들고 있으면 destruction order 보장이 깨진다.

### 3. test에서 singleton state share

```cpp
// 회피
TEST(A) { folly::Singleton<Counter>::try_get()->inc(); EXPECT_EQ(1, ...); }
TEST(B) { folly::Singleton<Counter>::try_get()->inc(); EXPECT_EQ(1, ...); } // fail, counter=2
```

테스트마다 vault reset 필요. `folly::SingletonVault::singleton()->destroyInstances()` 후 reregister.

## 정리

- Meyers singleton의 destruction order/fork/dependency 문제를 `folly::Singleton`이 해결.
- 모든 singleton이 SingletonVault에 등록되어 통합 lifecycle.
- 등록 역순 소멸로 dependency 안전.
- pthread_atfork 훅으로 fork-safe.
- try_get은 shared_ptr 반환 → race-free shutdown.
- main에서 registrationComplete 호출 필수.

## 다음 편

[Part 12-02 SingletonVault](/blog/programming/code-review/folly/part12-02-singleton-vault) — vault 내부 자료구조와 eager/lazy 초기화 전략.

## 관련 항목

- [Part 12-02 SingletonVault](/blog/programming/code-review/folly/part12-02-singleton-vault) — 등록·소멸 메커니즘 상세
- [Part 12-03 try_get_fast](/blog/programming/code-review/folly/part12-03-try-get-fast) — 핫패스 접근 최적화
- [Effective Modern C++ Item 18](/blog/programming/cpp/effective-modern-cpp/item18-use-unique-ptr-for-exclusive-ownership) — shared_ptr lifetime
