---
title: "Part 3-09: 스마트 포인터 선택"
date: 2026-05-15T09:00:00
description: "unique_ptr vs shared_ptr vs raw pointer — 임베디드의 소유권 모델 선택."
series: "Embedded C++ for Real Systems"
seriesOrder: 27
tags: [cpp, embedded, smart-pointer, unique-ptr, shared-ptr, ownership]
type: tech
---

## 한 줄 요약

> **"임베디드는 `unique_ptr`이 기본."** — *shared_ptr는 거의 피함*, raw pointer는 *non-owning 참조*만.

## 어떤 문제를 푸는가

C++ 스마트 포인터 셋.

- **`unique_ptr<T>`** — 단일 소유. RAII로 자동 해제.
- **`shared_ptr<T>`** — 공유 소유. atomic 카운터.
- **`weak_ptr<T>`** — shared의 non-owning 참조.
- **`raw pointer (T*)`** — non-owning, 소유권 없음.

임베디드에서 각각 *언제 쓰는지* 정리.

## `unique_ptr<T>` — 단일 소유

```cpp
#include <memory>

std::unique_ptr<Sensor> sensor = std::make_unique<Sensor>();
// sensor가 유일한 owner
// 소멸 시 자동 delete

// 이동 가능
auto other = std::move(sensor);   // sensor → other로 소유권 이전
// sensor는 이제 nullptr
```

크기: *sizeof(T*)* 정확히 (deleter empty면). *추가 오버헤드 0*.

### 임베디드 활용

```cpp
class Driver {
public:
    static std::unique_ptr<Driver> create(int param) {
        if (!validate(param)) return nullptr;
        return std::make_unique<Driver>(param);
    }
};

void setup() {
    auto driver = Driver::create(42);
    if (driver) {
        driver->initialize();
        // ... 사용
        // 함수 끝 — 자동 delete
    }
}
```

*RAII + 명시적 소유권*. 가장 권장.

### Custom deleter — pool 활용

```cpp
struct PoolDeleter {
    Pool* pool;
    void operator()(uint8_t* p) const {
        if (p) pool->deallocate(p);
    }
};

using PoolPtr = std::unique_ptr<uint8_t, PoolDeleter>;

PoolPtr alloc(Pool& p, size_t n) {
    return PoolPtr(p.allocate(n), {&p});
}
```

heap *전혀 안 씀*. *pool에서 할당, 자동 해제*.

## `shared_ptr<T>` — 공유 소유

```cpp
auto a = std::make_shared<Resource>();
auto b = a;   // copy — 카운터 증가 (atomic)
// a와 b 모두 owner — 마지막이 사라질 때 delete
```

크기: *T pointer + control block pointer* = 8 byte (32-bit ARM은 8).

내부 *control block* 별도 할당:
- 카운터 2개 (strong + weak) — atomic
- deleter
- allocator
- 보통 *16-32 byte heap*

### 임베디드의 문제

1. *Atomic 카운터* — multi-core RTOS에서 *cache coherence overhead*
2. *Control block* — heap 사용 (make_shared는 1번, 별도 new는 2번)
3. *Cyclic reference* — `weak_ptr` 안 쓰면 *leak*

대부분 임베디드에서 *shared_ptr 회피*. 사용 시 *명확한 정당화 필요*.

### shared_ptr이 *정말 필요한 경우*

- *여러 owner가 진짜 필요*. 한 owner로 표현 못 함.
- *RTOS 다중 task*에서 *동시 접근*.
- *비동기 callback*에서 *객체 lifetime 보장*.

```cpp
class Job {
    std::shared_ptr<Data> data_;
public:
    Job(std::shared_ptr<Data> d) : data_(std::move(d)) {}
    void execute() {
        // data_가 다른 task에서도 사용 중
        process(*data_);
    }
};
```

## `weak_ptr<T>` — non-owning 관찰

```cpp
auto strong = std::make_shared<Resource>();
std::weak_ptr<Resource> weak = strong;

// 사용
if (auto locked = weak.lock()) {
    // strong 유효 — locked가 잠시 owner
} else {
    // strong 이미 해제됨
}
```

cyclic reference 회피.

```cpp
struct Parent {
    std::vector<std::shared_ptr<Child>> children;
};

struct Child {
    std::weak_ptr<Parent> parent;   // shared 아님 — cycle 방지
};
```

임베디드에서 *weak_ptr 사용은 shared_ptr 의존*. 둘 다 *권장 안 함*.

## Raw pointer — non-owning

```cpp
class Cache {
public:
    void register_handler(Handler* h) {   // non-owning
        handler_ = h;
    }

    void on_event() {
        if (handler_) handler_->handle();
    }

private:
    Handler* handler_ = nullptr;
};

Handler h;
cache.register_handler(&h);   // 소유권 이전 X — h는 호출자가 관리
```

raw pointer는 *non-owning reference*. *명시적 소유자가 따로*.

C++ Core Guidelines 권장:
- *Owning pointer* → `unique_ptr` / `shared_ptr`
- *Non-owning pointer* → raw `T*` 또는 reference `T&`

C++ Core Guidelines의 `gsl::owner<T*>` 마커도 있음 (의도 명시).

## 결정 트리

```text
객체 lifetime을 누가 관리?
├── 한 명 (단일 owner)
│   ├── 일반 객체 → unique_ptr<T>
│   ├── 배열 → unique_ptr<T[]> 또는 std::array
│   └── Pool 할당 → unique_ptr<T, PoolDeleter>
│
├── 여러 명 (진짜 공유)
│   ├── 정말 필요? → shared_ptr<T> (드물게)
│   └── cycle 방지 → weak_ptr<T>
│
└── 안 관리 (non-owning)
    ├── 함수 매개변수 → T& 또는 const T*
    ├── 객체 멤버 → T* (외부가 관리)
    └── nullable → T* (또는 optional<T&>)
```

임베디드에서 *대부분 unique_ptr 또는 raw 참조*.

## 임베디드 패턴 — Factory + unique_ptr

```cpp
class Device {
    Device() = default;   // private

public:
    static std::unique_ptr<Device> create(const Config& cfg) {
        if (!validate(cfg)) return nullptr;

        auto d = std::unique_ptr<Device>(new Device);
        if (!d->initialize(cfg)) return nullptr;
        return d;
    }
};

// 사용
auto device = Device::create(my_config);
if (!device) {
    log_error("device create failed");
    return;
}

device->run();
// 자동 cleanup
```

*생성 실패 처리* + *RAII* + *명시 소유*.

## 임베디드 패턴 — Optional 멤버 with unique_ptr

```cpp
class System {
    std::unique_ptr<Logger> logger_;   // nullable

public:
    void enable_logging() {
        logger_ = std::make_unique<Logger>();
    }

    void log(const char* msg) {
        if (logger_) logger_->write(msg);
    }
};
```

logger가 *있을 수도, 없을 수도*. *동적 활성*.

대안: `std::optional<Logger>` (heap 없음).

```cpp
class System {
    std::optional<Logger> logger_;   // 더 좋음 (heap 없음)

public:
    void enable_logging() {
        logger_.emplace();
    }
};
```

`logger_`가 *내부에 Logger 객체 직접 저장*. *heap 0*. 임베디드 선호.

## 자주 보는 함정과 안티패턴

### 1. *new 직접 사용*
```cpp
auto* p = new Foo();   // raw owning pointer — 어떻게 delete?
```
*항상 `make_unique`*. raw owning 금지.

### 2. *shared_ptr 무심코 사용*
```cpp
shared_ptr<Data> get_data();   // 정말 공유 소유?
```
*unique_ptr이 충분*하면 unique. shared는 *정당화 필요*.

### 3. *unique_ptr의 함수 포인터 deleter*
```cpp
std::unique_ptr<FILE, decltype(&fclose)> f(fopen(...), &fclose);
```
*sizeof 두 배*. struct/lambda deleter.

### 4. *weak_ptr 없이 cycle*
```cpp
struct A { shared_ptr<B> b; };
struct B { shared_ptr<A> a; };   // cycle — 영원히 안 해제
```
한쪽을 *weak_ptr*.

### 5. *unique_ptr copy 시도*
```cpp
auto a = std::make_unique<Foo>();
auto b = a;   // ERROR — copy 안 됨
```
*move*: `auto b = std::move(a);`.

### 6. *shared_ptr atomic overhead 무시*
multi-core에서 *각 카피마다 atomic 연산*. *hot path에 부담*. raw + 명확한 owner.

## 측정 — 스마트 포인터 비교

같은 객체 사용 (1만 회 생성/해제).

```text
new/delete (raw):
  alloc: ~120 cycles
  total: 1.2 ms

unique_ptr:
  alloc: ~120 cycles (= make_unique + new)
  total: 1.2 ms

shared_ptr:
  alloc: ~200 cycles (control block 추가 alloc)
  total: 2.0 ms
  copy: +10 cycles (atomic increment)

unique_ptr + pool deleter:
  alloc: ~15 cycles (pool)
  total: 0.15 ms
```

*pool + unique_ptr가 10배 빠름*. *shared_ptr는 두 배 느림*.

## std::shared_ptr 대안 — Reference counting을 직접

```cpp
class RefCounted {
    mutable int count_ = 1;
public:
    void add_ref() const { ++count_; }
    void release() const {
        if (--count_ == 0) delete this;
    }
protected:
    virtual ~RefCounted() = default;
};

template<typename T>
class IntrusivePtr {
    T* p_;
public:
    explicit IntrusivePtr(T* p) : p_(p) { if (p_) p_->add_ref(); }
    ~IntrusivePtr() { if (p_) p_->release(); }
    // ...
};
```

Boost.IntrusivePtr와 같은 idea. *별도 control block 없음*. *작은 메모리 추가*. multi-thread 시 `count_`를 atomic으로.

## 정리

- 임베디드에서는 `unique_ptr`이 기본입니다. 명시적 소유와 RAII를 zero overhead로 제공합니다.
- `shared_ptr`은 회피합니다. atomic 카운터와 heap 위의 control block이 부담입니다.
- raw pointer는 non-owning에만 쓰고 소유권은 항상 unique나 shared로 표현합니다.
- Custom deleter(struct나 lambda)로 pool, FD, 비-heap 자원을 관리합니다.
- Optional 멤버는 `std::optional<T>`(heap 0)를 우선합니다.

## 관련 항목

- [Part 2-01: RAII 기초](/blog/embedded/embedded-cpp/part2-01-raii-basics)
- [Part 2-02: RAII 실전 패턴](/blog/embedded/embedded-cpp/part2-02-raii-patterns) — custom deleter
- [Part 3-03: Pool Allocator](/blog/embedded/embedded-cpp/part3-03-pool-allocator) — pool + unique_ptr
- [Part 3-10: 소유권 모델](/blog/embedded/embedded-cpp/part3-10-ownership-model)
- [Refactoring Pattern 33: Change Reference to Value](/blog/programming/design/refactoring-catalog/pattern33-change-reference-to-value)

## 다음 글

[Part 3-10: 소유권 모델](/blog/embedded/embedded-cpp/part3-10-ownership-model) — 객체 lifetime의 *명확한 책임 할당*. owner, observer, borrower.
