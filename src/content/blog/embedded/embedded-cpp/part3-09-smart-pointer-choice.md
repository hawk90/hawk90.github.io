---
title: "임베디드 스마트 포인터 선택 — unique·shared·custom 비교"
slug: "embedded/embedded-cpp/part3-09-smart-pointer-choice"
date: 2026-04-30T09:27:00
description: "unique_ptr vs shared_ptr vs raw pointer — 임베디드의 소유권 모델 선택."
series: "Embedded C++ for Real Systems"
seriesOrder: 27
tags: [cpp, embedded, smart-pointer, unique-ptr, shared-ptr, ownership]
type: tech
topics: ["embedded"]
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

빈 deleter를 압축하는 일반적인 구현에서는 sizeof(T*)와 같을 수 있습니다. 표준이 모든 ABI의 동일 크기를 보장하는 것은 아니며 상태 있는 deleter·fancy pointer는 크기를 바꿀 수 있습니다.

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

RAII와 명시적 소유권을 제공합니다. make_unique는 할당 실패를 nullptr로 바꾸지 않습니다. 복구 가능한 OOM이 필요하면 예외 정책에 맞는 nothrow factory나 pool API를 별도로 설계합니다.

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

일반적인 구현은 객체 포인터와 control block 포인터를 저장하므로 32비트에서 흔히 8바이트, 64비트에서 흔히 16바이트입니다. 정확한 크기는 구현·ABI별로 확인합니다.

control block은 객체와 수명이 다른 관리 정보이며, make_shared에서는 객체와 한 allocation에 묶일 수 있습니다. 보통 다음 정보를 포함하지만 표준이 고정 레이아웃을 정하지는 않습니다.

- strong과 weak 두 개의 atomic 카운터
- deleter
- allocator
- 구현별 관리 정보와 정렬 공간

### 임베디드에서의 문제

1. atomic 카운터가 multi-core RTOS에서 cache coherence 오버헤드를 만듭니다.
2. control block이 heap을 사용합니다(`make_shared`는 1번, 별도 `new`는 2번 할당).
3. cyclic reference에서 `weak_ptr`을 쓰지 않으면 leak이 발생합니다.

공유 수명 관리가 필요한지 먼저 확인합니다. control block의 thread safety는 pointee 데이터의 thread safety가 아니며, 같은 shared_ptr 객체의 동시 변경도 별도 동기화가 필요합니다.

### shared_ptr이 정말 필요한 경우

- 여러 owner가 진짜로 필요해서 한 명의 owner로 표현이 어려운 경우
- 서로 다른 task가 독립적으로 객체의 수명을 연장해야 하는 경우
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

![스마트 포인터 결정 트리 — 소유권 기준으로 unique_ptr, shared_ptr, raw pointer 선택](/images/blog/embedded-cpp/diagrams/part3-09-decision-tree.svg)

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
일반 생성은 make_unique를 우선합니다. private 생성자에 접근하는 클래스 내부 factory나 nothrow 할당처럼 직접 new가 필요한 경우에는 즉시 owner로 감쌉니다.

### 2. shared_ptr 무심코 사용
```cpp
shared_ptr<Data> get_data();   // 정말 공유 소유?
```
unique_ptr로 충분하면 unique로 갑니다. shared는 정당화가 필요합니다.

### 3. unique_ptr의 함수 포인터 deleter
```cpp
std::unique_ptr<FILE, decltype(&fclose)> f(fopen(...), &fclose);
```
함수 포인터 deleter는 별도 상태 저장 공간이 들 수 있습니다. ABI에 따라 크기를 확인하고, 상태가 필요 없다면 빈 functor deleter를 검토합니다.

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

## 실행 확인 — 해제 횟수와 공유 수명

다음 독립 파일은 custom deleter의 해제 횟수, unique 소유권 이동, weak 관찰의 만료를 검증합니다. 시간·cycle 비교는 수행하지 않았고, 원래 표의 120/15=8배를 10배로 적은 결론도 근거로 사용하지 않습니다.

```cpp title="smart-pointers.cpp"
#include <cassert>
#include <memory>
struct Resource {
    static inline int live = 0;
    Resource() { ++live; }
    ~Resource() { --live; }
};
struct CountDelete {
    int* released;
    void operator()(Resource* p) const noexcept { ++*released; delete p; }
};
int main() {
    int released = 0;
    {
        std::unique_ptr<Resource, CountDelete> first(new Resource, {&released});
#ifdef COPY_OWNER
        auto copy = first;
#endif
        auto second = std::move(first);
        assert(!first && second && Resource::live == 1);
        second.reset();
        assert(Resource::live == 0 && released == 1);
    }
    assert(released == 1);
    std::weak_ptr<Resource> observer;
    {
        auto owner = std::make_shared<Resource>();
        observer = owner;
        auto pin = observer.lock();
        owner.reset();
        assert(pin && !observer.expired() && Resource::live == 1);
    }
    assert(observer.expired() && Resource::live == 0);
}
```

heap 금지 설계에서는 이 heap 기반 실험을 그대로 채택하지 말고 Part 3-03의 pool 계약과 deleter를 조합합니다.

## 직접 reference counting을 만들기 전의 계약

Intrusive reference count는 객체에 카운터를 넣는 방식입니다. 초기 count=1인 객체를 포인터 생성자에서 다시 add_ref하면 한 번의 release 뒤 count가 1로 남을 수 있습니다. adopt와 retain 생성 경로를 구분하거나 count=0에서 첫 owner가 증가시키도록 계약을 정해야 합니다.

copy는 add_ref, move는 증가 없이 이전, 소멸은 release이며 대입·자기 대입·빈 상태까지 구현해야 합니다. delete this를 쓸 객체는 그 delete 정책과 맞게 생성되어야 하며 stack·pool 객체를 같은 경로로 해제하면 안 됩니다. 카운터를 atomic으로 바꾸는 것만으로 객체 데이터·회수 프로토콜·overflow·ISR 안전성까지 해결되지 않습니다. 이 장은 불완전한 intrusive pointer를 완성 구현으로 제시하지 않습니다.

## 정리

- 임베디드에서는 `unique_ptr`이 기본입니다. 명시적 소유와 RAII를 zero overhead로 제공합니다.
- `shared_ptr`은 회피합니다. atomic 카운터와 heap 위의 control block이 부담입니다.
- raw pointer는 non-owning에만 쓰고 소유권은 항상 unique나 shared로 표현합니다.
- Custom deleter(struct나 lambda)로 pool, FD, 비-heap 자원을 관리합니다.
- Optional 멤버는 `std::optional<T>`(heap 0)를 우선합니다.

## 근거와 검증 범위

2026-10-22에 장별 명명 예제를 Homebrew Clang 23.1.3·libc++의 macOS arm64 host에서 실행했습니다. ASan·UBSan을 적용했으며 보드 실행·WCET·인증 적합성·외부 라이브러리 성공은 이 결과에 포함하지 않습니다. 다른 이름 없는 코드 블록은 주변에 정의한 장치 API를 가정하는 부분 예제이며 하나의 translation unit으로 합치지 않습니다.

- [shared_ptr의 공유 소유 계약](https://eel.is/c++draft/util.smartptr.shared)

## 관련 항목

- [Part 2-01: RAII 기초](/blog/embedded/embedded-cpp/part2-01-raii-basics)
- [Part 2-02: RAII 실전 패턴](/blog/embedded/embedded-cpp/part2-02-raii-patterns) — custom deleter
- [Part 3-03: Pool Allocator](/blog/embedded/embedded-cpp/part3-03-pool-allocator) — pool + unique_ptr
- [Part 3-10: 소유권 모델](/blog/embedded/embedded-cpp/part3-10-ownership-model)
- [C++ Core Guidelines R.20–R.24](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-resource)

## 다음 글

[Part 3-10: 소유권 모델](/blog/embedded/embedded-cpp/part3-10-ownership-model) — 객체 lifetime에 책임을 명확히 할당하는 owner, observer, borrower 모델을 다룹니다.
