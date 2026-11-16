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
- **`shared_ptr<T>`**는 공유 소유를 표현하며, 참조 계수를 스레드 안전하게 갱신합니다.
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

기본 deleter는 빈 타입이라 공간을 차지하지 않습니다. 64비트 호스트에서 `sizeof(std::unique_ptr<int>)`는 libstdc++·libc++ 모두 8바이트, 즉 포인터 하나였습니다. 표준이 이 크기를 보장하지는 않으며, 상태 있는 deleter는 그만큼 크기를 늘립니다([Part 2-02](/blog/embedded/embedded-cpp/part2-02-raii-patterns#함수-포인터-deleter--runtime-비용-발생)의 크기 표).

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

`shared_ptr`은 객체 포인터와 control block 포인터를 저장합니다. 64비트 호스트에서 `sizeof(std::shared_ptr<int>)`와 `sizeof(std::weak_ptr<int>)`는 libstdc++·libc++ 모두 16바이트였습니다. 이 글의 ARM 툴체인에는 libstdc++가 없어 32비트 크기는 재지 못했습니다.

control block은 객체와 수명이 다른 관리 정보입니다. `make_shared`는 객체와 control block을 한 번에 할당하고, `shared_ptr<T>(new T)`는 두 번 할당합니다(호스트 g++-16에서 `operator new` 호출 1회 대 2회, [Part 1-01](/blog/embedded/embedded-cpp/part1-01-cpp-vs-c#5-stdshared_ptr로-모든-소유권-표현)). 표준이 고정 레이아웃을 정하지는 않지만 다음 정보가 들어갑니다.

- strong과 weak 두 개의 atomic 카운터
- deleter
- allocator
- 구현별 관리 정보와 정렬 공간

### 임베디드에서의 문제

1. 복사·소멸마다 참조 계수를 갱신합니다. libstdc++는 이 갱신을 `__gnu_cxx::__exchange_and_add_dispatch`로 하며, 스레드가 활성이면 원자 연산을 씁니다([Part 1-01](/blog/embedded/embedded-cpp/part1-01-cpp-vs-c#5-stdshared_ptr로-모든-소유권-표현)). 여러 코어가 같은 카운터를 갱신하면 그 캐시 라인을 코어끼리 주고받습니다.
2. control block이 heap을 사용합니다(`make_shared`는 1번, 별도 `new`는 2번 할당).
3. cyclic reference에서 `weak_ptr`을 쓰지 않으면 leak이 발생합니다. 아래 함정 4에서 실행해 봅니다.

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

weak_ptr은 shared_ptr이 만든 control block을 가리키므로 shared_ptr 없이 쓸 수 없습니다(크기도 포인터 두 개, 16바이트). heap을 피하는 설계라면 둘을 함께 피합니다.

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

소유자가 하나로 정해지면 unique_ptr, 소유하지 않는 접근이면 raw 포인터·참조입니다. shared_ptr은 "마지막 사용자가 누구인지 실행 전에 알 수 없다"는 조건이 있을 때만 남습니다.

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

`logger_`가 내부에 Logger 객체를 직접 저장하므로 heap을 쓰지 않습니다. 대신 Logger를 쓰지 않을 때도 `System` 안에 `sizeof(Logger)`와 플래그만큼 공간을 차지합니다. `unique_ptr` 쪽은 포인터 하나만 차지하고 Logger는 heap에 둡니다.

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
생성자·소멸자에서 살아 있는 객체 수를 세는 두 구조체를 `make_shared`로 만들어 서로 가리키게 한 뒤 scope를 벗어나면, g++-16·Clang 23.1.5 모두 살아 있는 객체가 2였습니다. B → A를 `weak_ptr`로 바꾸면 0이었습니다. 한쪽을 weak_ptr로 둡니다.

### 5. unique_ptr copy 시도
```cpp
auto a = std::make_unique<Foo>();
auto b = a;   // ERROR — copy 안 됨
```
아래 예제의 `-DCOPY_OWNER` 빌드에서 g++-16은 `error: use of deleted function 'std::unique_ptr<_Tp, _Dp>::unique_ptr(const std::unique_ptr<_Tp, _Dp>&)'`, Clang 23.1.5는 `error: call to implicitly-deleted copy constructor of 'std::unique_ptr<Resource, CountDelete>'`를 냈습니다. move를 씁니다(`auto b = std::move(a);`).

### 6. shared_ptr atomic overhead 무시
복사·소멸마다 참조 계수를 갱신합니다. 함수 인자를 `shared_ptr<T>` 값으로 받으면 호출마다 복사가 일어나므로, 소유권을 넘기지 않는 함수는 `T&`나 `T*`로 받습니다(C++ Core Guidelines F.7). 이 글에서는 갱신 비용을 cycle로 재지 않았습니다.

## 실행 확인 — 해제 횟수와 공유 수명

다음 독립 파일은 custom deleter의 해제 횟수, unique 소유권 이동, weak 관찰의 만료를 검증합니다. Homebrew Clang 23.1.5와 g++-16 모두 ASan·UBSan으로 exit 0이었습니다. 시간·cycle 비교는 하지 않았습니다.

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

- 임베디드에서는 `unique_ptr`이 기본입니다. 기본 deleter로는 포인터 하나 크기(측정 8바이트, 64비트 호스트)로 명시적 소유와 RAII를 제공합니다.
- `shared_ptr`은 회피합니다. atomic 카운터와 heap 위의 control block이 부담입니다.
- raw pointer는 non-owning에만 쓰고 소유권은 항상 unique나 shared로 표현합니다.
- Custom deleter(struct나 lambda)로 pool, FD, 비-heap 자원을 관리합니다.
- Optional 멤버는 `std::optional<T>`(heap 0)를 우선합니다.

## 근거와 검증 범위

2026-11-16에 `smart-pointers.cpp`, 순환 참조·`sizeof` 시험을 Homebrew Clang 23.1.5(libc++)와 g++-16(libstdc++)으로 macOS arm64 host에서 실행했습니다. 보드 실행·32비트 크기·cycle 측정은 하지 않았습니다. 다른 이름 없는 코드 블록은 주변에 정의한 장치 API를 가정하는 부분 예제이며 하나의 translation unit으로 합치지 않습니다.

- [shared_ptr의 공유 소유 계약](https://eel.is/c++draft/util.smartptr.shared)

## 관련 항목

- [Part 2-01: RAII 기초](/blog/embedded/embedded-cpp/part2-01-raii-basics)
- [Part 2-02: RAII 실전 패턴](/blog/embedded/embedded-cpp/part2-02-raii-patterns) — custom deleter
- [Part 3-03: Pool Allocator](/blog/embedded/embedded-cpp/part3-03-pool-allocator) — pool + unique_ptr
- [Part 3-10: 소유권 모델](/blog/embedded/embedded-cpp/part3-10-ownership-model)
- [C++ Core Guidelines R.20–R.24](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-resource)

## 다음 글

[Part 3-10: 소유권 모델](/blog/embedded/embedded-cpp/part3-10-ownership-model) — 객체 lifetime에 책임을 명확히 할당하는 owner, observer, borrower 모델을 다룹니다.
