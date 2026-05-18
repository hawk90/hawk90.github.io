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

> **"임베디드에서는 `unique_ptr`이 기본입니다."** `shared_ptr`은 거의 피하고, raw pointer는 non-owning 참조에만 씁니다.

## 어떤 문제를 푸는가

C++의 스마트 포인터 세트는 다음과 같습니다.

- **`unique_ptr<T>`**는 단일 소유를 표현하며 RAII로 자동 해제합니다.
- **`shared_ptr<T>`**는 공유 소유를 표현하며 atomic 카운터를 사용합니다.
- **`weak_ptr<T>`**는 shared의 non-owning 참조입니다.
- **raw pointer(`T*`)**는 non-owning이며 소유권을 갖지 않습니다.

각각을 임베디드에서 언제 쓸지 정리합니다.

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

크기는 deleter가 비어 있다면 정확히 `sizeof(T*)`입니다. 추가 오버헤드가 0입니다.

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

RAII와 명시적 소유권을 동시에 제공하므로 가장 권장합니다.

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

heap을 전혀 쓰지 않고 pool에서 할당한 뒤 자동으로 해제합니다.

## `shared_ptr<T>` — 공유 소유

```cpp
auto a = std::make_shared<Resource>();
auto b = a;   // copy — 카운터 증가 (atomic)
// a와 b 모두 owner — 마지막이 사라질 때 delete
```

크기는 T pointer와 control block pointer를 합쳐 8 byte입니다(32-bit ARM에서도 8 byte).

내부의 control block은 별도로 할당되며 다음을 포함합니다.

- strong과 weak 두 개의 atomic 카운터
- deleter
- allocator
- 보통 16~32 byte의 heap

### 임베디드에서의 문제

1. atomic 카운터가 multi-core RTOS에서 cache coherence 오버헤드를 만듭니다.
2. control block이 heap을 사용합니다(`make_shared`는 1번, 별도 `new`는 2번 할당).
3. cyclic reference에서 `weak_ptr`을 쓰지 않으면 leak이 발생합니다.

대부분의 임베디드 환경에서는 shared_ptr을 회피합니다. 사용하려면 명확한 정당화가 필요합니다.

### shared_ptr이 정말 필요한 경우

- 여러 owner가 진짜로 필요해서 한 명의 owner로 표현이 어려운 경우
- RTOS 다중 task에서 동시 접근이 필요한 경우
- 비동기 callback에서 객체 lifetime을 보장해야 하는 경우

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

cyclic reference를 회피할 때 씁니다.

```cpp
struct Parent {
    std::vector<std::shared_ptr<Child>> children;
};

struct Child {
    std::weak_ptr<Parent> parent;   // shared 아님 — cycle 방지
};
```

임베디드에서 weak_ptr을 쓰려면 shared_ptr이 전제되어야 하므로 둘 다 권장하지 않습니다.

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

raw pointer는 non-owning reference 역할만 하며, 소유자는 따로 둡니다.

C++ Core Guidelines의 권장은 다음과 같습니다.

- Owning pointer는 `unique_ptr`이나 `shared_ptr`로 표현합니다.
- Non-owning pointer는 raw `T*`나 reference `T&`로 표현합니다.

C++ Core Guidelines의 `gsl::owner<T*>` 마커로 의도를 명시할 수도 있습니다.

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

임베디드에서는 대부분 unique_ptr 또는 raw 참조로 정리됩니다.

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

생성 실패 처리, RAII, 명시 소유를 한 번에 해결합니다.

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

logger가 있을 수도 없을 수도 있는 상황에서 동적으로 활성화합니다.

대안은 heap을 쓰지 않는 `std::optional<Logger>`입니다.

```cpp
class System {
    std::optional<Logger> logger_;   // 더 좋음 (heap 없음)

public:
    void enable_logging() {
        logger_.emplace();
    }
};
```

`logger_`가 내부에 Logger 객체를 직접 저장하므로 heap을 쓰지 않습니다. 임베디드에서 선호합니다.

## 자주 보는 함정과 안티패턴

### 1. new 직접 사용
```cpp
auto* p = new Foo();   // raw owning pointer — 어떻게 delete?
```
항상 `make_unique`를 씁니다. raw owning은 금지합니다.

### 2. shared_ptr 무심코 사용
```cpp
shared_ptr<Data> get_data();   // 정말 공유 소유?
```
unique_ptr로 충분하면 unique로 갑니다. shared는 정당화가 필요합니다.

### 3. unique_ptr의 함수 포인터 deleter
```cpp
std::unique_ptr<FILE, decltype(&fclose)> f(fopen(...), &fclose);
```
sizeof가 두 배가 됩니다. struct나 lambda deleter를 씁니다.

### 4. weak_ptr 없이 cycle
```cpp
struct A { shared_ptr<B> b; };
struct B { shared_ptr<A> a; };   // cycle — 영원히 안 해제
```
한쪽을 weak_ptr로 둡니다.

### 5. unique_ptr copy 시도
```cpp
auto a = std::make_unique<Foo>();
auto b = a;   // ERROR — copy 안 됨
```
move를 씁니다(`auto b = std::move(a);`).

### 6. shared_ptr atomic overhead 무시
multi-core에서는 카피마다 atomic 연산이 일어나므로 hot path에 부담이 됩니다. raw pointer와 명확한 owner로 대체합니다.

## 측정 — 스마트 포인터 비교

같은 객체를 1만 회 생성하고 해제합니다.

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

pool과 unique_ptr 조합이 10배 빠릅니다. shared_ptr은 두 배 가까이 느립니다.

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

Boost.IntrusivePtr와 같은 아이디어입니다. 별도의 control block이 없고 메모리 추가도 적습니다. multi-thread 환경에서는 `count_`를 atomic으로 둡니다.

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

[Part 3-10: 소유권 모델](/blog/embedded/embedded-cpp/part3-10-ownership-model) — 객체 lifetime에 책임을 명확히 할당하는 owner, observer, borrower 모델을 다룹니다.
