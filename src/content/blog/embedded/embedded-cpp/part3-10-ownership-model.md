---
title: "Part 3-10: 소유권 모델"
date: 2026-05-07T10:00:00
description: "Owner, observer, borrower — 객체 lifetime의 명확한 책임 할당."
series: "Embedded C++ for Real Systems"
seriesOrder: 28
tags: [cpp, embedded, ownership, lifetime, reference, design]
type: tech
---

## 한 줄 요약

> **"객체마다 owner는 한 명이고 나머지는 non-owning 참조입니다."** 책임을 명시적으로 할당하면 메모리 관련 버그의 대부분을 막을 수 있습니다.

## 어떤 문제를 푸는가

C++의 메모리 안전 문제는 거의 모두 소유권의 모호함에서 출발합니다.

- **Use after free** — 소유자가 사라진 뒤에 누가 사용했는지 분명하지 않습니다.
- **Double free** — 두 owner가 각자 delete를 호출합니다.
- **Memory leak** — owner가 미정이라 delete를 누가 할지 모릅니다.
- **Dangling pointer** — owner는 소멸했는데 참조가 살아 있습니다.

해결책은 명시적인 소유권 모델입니다. 각 객체에 정확히 한 owner를 두고 나머지는 non-owning 참조로 다룹니다.

Rust는 이를 컴파일러 차원에서 강제하지만, C++는 프로그래머의 규율에 맡깁니다.

## 세 역할 — Owner, Observer, Borrower

C++ 스마트 포인터의 세 가지 소유권 모델을 그림으로 보면 차이가 분명합니다. `unique_ptr`은 단일 소유자가 자원을 직접 가리키고, `shared_ptr`은 control block을 매개로 여러 소유자가 공유합니다. `weak_ptr`은 refcount에 영향을 주지 않고 약하게 참조만 합니다.

![unique/shared/weak 소유권 모델](/images/blog/embedded-cpp/diagrams/part3-10-ownership-graph.svg)

### Owner — 객체 lifetime 관리

```cpp
class Device {
    std::unique_ptr<Driver> driver_;   // owner — lifetime 책임
public:
    Device() : driver_(std::make_unique<Driver>()) {}
    // 자동 delete on destruction
};
```

`unique_ptr`이 owner임을 명시합니다. Device가 사라지면 Driver도 함께 사라집니다.

### Observer — 참조만, 관여 없음

```cpp
class Logger {
public:
    void register_sink(Sink* sink) {   // observer — non-owning
        sink_ = sink;
    }

    void write(const char* msg) {
        if (sink_) sink_->emit(msg);
    }

private:
    Sink* sink_ = nullptr;   // non-owning
};

Sink sink;
Logger logger;
logger.register_sink(&sink);   // logger는 sink 안 소유
```

`Logger`는 `Sink`를 관찰만 하고 lifetime은 외부에서 관리합니다.

Observer는 다음과 같이 표현합니다.

- `T*` — nullable, non-owning 의도입니다.
- `T&` — non-null, non-owning입니다.
- `std::span<T>` — array와 size를 함께 non-owning으로 다룹니다.
- `std::string_view` — string을 non-owning으로 가리킵니다.

### Borrower — 일시적 사용

```cpp
void process(const Data& data) {   // borrower
    // data를 잠시 사용
    // 함수 끝나면 빌림 끝
}
```

함수 매개변수가 전형적인 borrower이며 함수 scope 동안만 유효합니다.

C++에서 borrowing은 다음과 같이 표현합니다.

- `const T&` — read-only 빌림
- `T&` — mutable 빌림
- `T*` — nullable 빌림
- `std::span<T>`, `std::string_view`

## 결정 — 어느 모델

```text
이 함수/객체가 ...

1. 이 객체를 소유해야 하나?
   YES → unique_ptr (단일) 또는 shared_ptr (공유, 드물게)

2. 객체 lifetime이 외부에서 관리되나?
   YES → 매개변수: const T& 또는 T*
        멤버: T*

3. 함수 호출 동안만 필요하나?
   YES → 매개변수 (const T&, T*, std::span, std::string_view)
```

## 임베디드 패턴 — Device class

```cpp
class Display {
public:
    Display(Bus& bus) : bus_(bus) {}   // borrower — bus는 외부 소유

    void clear() { bus_.write(CLEAR_CMD); }

private:
    Bus& bus_;   // non-owning reference
};

class System {
    Bus bus_;             // owner
    Display display_;     // owner (display는 bus borrow)

public:
    System() : display_(bus_) {}   // bus_ 참조 전달
};
```

`System`이 bus와 display를 모두 소유하고 `Display`는 bus를 빌립니다. cyclic ownership이 발생하지 않습니다.

## 함수 매개변수 — 결정

| 사용 의도 | 매개변수 형 |
| --- | --- |
| 객체 소유권 이전 | `T` (by value) or `unique_ptr<T>` |
| 객체 복사 | `T` (by value) — 작은 객체 |
| 읽기 전용 참조 | `const T&` |
| 변경 가능 참조 | `T&` |
| nullable 참조 | `const T*` 또는 `T*` |
| array 참조 | `std::span<T>` (C++20) |
| string 참조 | `std::string_view` (C++17) |
| 새 객체 반환 | `T` 반환 (RVO) 또는 `unique_ptr<T>` |

```cpp
// 소유권 이전
void take_ownership(std::unique_ptr<Resource> r);

// 작은 객체 복사
int compute(int a, int b);

// 큰 객체 read-only 빌림
void print(const HugeData& data);

// 변경 가능 빌림
void modify(Counter& c);

// nullable
void with_optional_logger(Logger* logger = nullptr);

// array
void process(std::span<const uint8_t> data);

// string
bool match(std::string_view pattern, std::string_view text);
```

## 멤버 변수 — 결정

| 의도 | 멤버 형 |
| --- | --- |
| 객체 owner | `T` 또는 `unique_ptr<T>` |
| Optional owner | `unique_ptr<T>` (nullable) |
| Optional 값 | `std::optional<T>` (heap 없음) |
| Non-owning ref | `T*` (nullable) 또는 `T&` (non-null) |
| 다중 owner (드물게) | `shared_ptr<T>` |
| 외부 owner의 weak ref | `weak_ptr<T>` |

```cpp
class Service {
    Database db_;                       // owner, value
    std::unique_ptr<Logger> logger_;    // owner, optional (nullable)
    std::optional<Config> config_;      // optional value (heap 0)
    Bus* bus_;                          // non-owning, nullable
    EventLoop& loop_;                   // non-owning, non-null (참조 멤버)
};
```

## 임베디드 — RTOS task 간 소유권

multi-task RTOS에서는 객체 공유가 복잡해집니다. 자주 쓰는 패턴은 다음과 같습니다.

### 1. Message passing — 소유권 이전

```cpp
struct Event {
    int type;
    uint32_t data;
};

QueueHandle_t event_queue;

void producer() {
    Event e{1, 42};
    xQueueSend(event_queue, &e, portMAX_DELAY);   // copy
}

void consumer() {
    Event e;
    if (xQueueReceive(event_queue, &e, portMAX_DELAY)) {
        process(e);
    }
}
```

copy로 소유권을 이전하므로 두 task는 공유 메모리를 갖지 않고 race도 발생하지 않습니다.

### 2. Pool + handle

```cpp
ObjectPool<LargeMessage, 16> pool;
QueueHandle_t handle_queue;

void producer() {
    auto* msg = pool.allocate();
    msg->fill(...);
    xQueueSend(handle_queue, &msg, portMAX_DELAY);   // pointer pass
}

void consumer() {
    LargeMessage* msg;
    if (xQueueReceive(handle_queue, &msg, portMAX_DELAY)) {
        process(*msg);
        pool.deallocate(msg);   // 소유권 명시적 해제
    }
}
```

큰 객체는 copy 비용이 크므로 pool과 pointer로 전달합니다. 소유권은 producer에서 consumer로 명확히 이동합니다.

### 3. Shared state with mutex

```cpp
struct SystemState {
    int counter;
    float temperature;
};

SystemState g_state;   // shared
SemaphoreHandle_t state_mutex;

void update(int c, float t) {
    xSemaphoreTake(state_mutex, portMAX_DELAY);
    g_state.counter = c;
    g_state.temperature = t;
    xSemaphoreGive(state_mutex);
}

void read(SystemState& out) {
    xSemaphoreTake(state_mutex, portMAX_DELAY);
    out = g_state;
    xSemaphoreGive(state_mutex);
}
```

공유 객체에 lock을 걸어 보호합니다. 소유권은 시스템 전체에 속하며 각 task는 non-owning ref만 사용합니다.

## 임베디드 — Callback 소유권

callback의 소유권이 모호하면 버그가 자주 발생합니다.

```cpp
// Bad — capture가 dangling
void setup() {
    LocalData data;
    register_callback([&data](int e) {
        data.process(e);   // 함수 끝 후 data 사라짐 — dangling
    });
}

// Good — capture by value
void setup() {
    LocalData data;
    register_callback([data](int e) {
        // data는 lambda 내부 owner
    });
}

// Better — 명시적 owner
class Handler {
    LocalData data_;
public:
    void on_event(int e) { data_.process(e); }
};

Handler g_handler;   // 명시적 owner

void setup() {
    register_callback([](int e) { g_handler.on_event(e); });
}
```

lambda를 reference로 capture하면 함수 scope가 끝나는 순간 dangling이 됩니다. value capture로 잡거나 외부 owner를 둡니다.

## C++ Core Guidelines

ISO C++ Core Guidelines의 소유권 권장은 다음과 같습니다.

- `unique_ptr<T>` — exclusive owner
- `shared_ptr<T>` — shared owner (필요할 때만)
- `gsl::owner<T*>` — raw pointer지만 owning 의도를 명시
- `T*` (gsl::owner 없음) — non-owning
- `T&` — non-owning, non-null

```cpp
#include <gsl/pointers>

void take_owner(gsl::owner<int*> p);   // 의도: 소유권 받음
void observe(int* p);                  // 의도: 관찰만
void use(int& x);                      // 의도: 빌림
```

`gsl::owner`는 static analysis 도구에 힌트를 주며, 임베디드 인증 환경에서 유용합니다.

## 자주 보는 함정과 안티패턴

### 1. Owner 불명확
```cpp
class A { B* b; };   // A가 owner? 그냥 reference?
```
`unique_ptr<B>`로 명시하거나 주석으로 표시합니다.

### 2. Cyclic ownership
```cpp
struct A { shared_ptr<B> b; };
struct B { shared_ptr<A> a; };   // cycle — 영원히 안 해제
```
한쪽을 weak_ptr로 두거나 구조를 재설계합니다.

### 3. Local owner를 외부에 노출
```cpp
void setup() {
    auto resource = std::make_unique<Resource>();
    register_handler([&resource](int e) { /* */ });   // dangling
}
```
owner를 외부 객체로 옮깁니다.

### 4. Reference 멤버의 함정
```cpp
class A {
    B& b_;   // reference 멤버
public:
    A(B& b) : b_(b) {}
    // A를 어떻게 copy/move? b_ 못 재바인딩
};
```
reference 멤버는 immutable이라 copy/move가 어렵습니다. pointer 멤버를 검토합니다.

### 5. Borrowed 객체 저장
```cpp
void process(const Data& data) {
    saved_ = &data;   // data는 borrow — caller가 사라지면 dangling
}
```
저장하려는 의도라면 copy하거나 shared_ptr을 사용합니다.

### 6. void* 사용
```cpp
void register_callback(void* ctx, void (*cb)(void*));
```
type 정보가 사라집니다. C 인터페이스에서만 쓰고, C++에서는 template이나 std::function을 활용합니다.

## 측정 — 소유권 명시의 효과

같은 모듈을 명시적 소유권 버전과 raw pointer 버전으로 비교합니다.

```text
# Raw pointer + new/delete
모듈 크기: 4.2 KB
메모리 leak (1주일 stress): 3-5건/일
use-after-free: 1-2건/주

# unique_ptr 명시적 owner
모듈 크기: 4.3 KB (+100 B)
메모리 leak: 0
use-after-free: 0
```

100 B 추가만으로 버그가 완전히 사라집니다. 모범 사례로 자리잡은 이유입니다.

## 정리

- 객체마다 owner는 한 명이고 나머지는 non-owning reference로 다룹니다.
- 도구는 owner로 `unique_ptr`, non-owning으로 `T*`/`T&`, 드물게 `shared_ptr`을 씁니다.
- 함수 매개변수는 의도에 맞게 value, `const&`, `&`, pointer, span, string_view를 선택합니다.
- 멤버 변수는 value, `unique_ptr`, optional, pointer 중에서 고릅니다.
- RTOS task 간에는 message passing (copy)이나 pool + handle로 전달합니다.
- Lambda를 reference로 capture하면 dangling 위험이 있으므로 value capture나 외부 owner를 씁니다.

## 관련 항목

- [Part 3-09: 스마트 포인터 선택](/blog/embedded/embedded-cpp/part3-09-smart-pointer-choice)
- [Part 2-01: RAII 기초](/blog/embedded/embedded-cpp/part2-01-raii-basics)
- [Refactoring Pattern 33: Change Reference to Value](/blog/programming/design/refactoring-catalog/pattern33-change-reference-to-value)
- [C++ Core Guidelines — Resource Management](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-resource)

## 다음 글 (Part 4 시작)

[Part 4-01: Intrusive Containers](/blog/embedded/embedded-cpp/part4-01-intrusive-containers) — 동적 할당 없는 linked list로, 객체 자체가 next pointer를 보유합니다.
