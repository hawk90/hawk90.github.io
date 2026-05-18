---
title: "Part 3-10: 소유권 모델"
date: 2026-05-15T10:00:00
description: "Owner, observer, borrower — 객체 lifetime의 명확한 책임 할당."
series: "Embedded C++ for Real Systems"
seriesOrder: 28
tags: [cpp, embedded, ownership, lifetime, reference, design]
type: tech
---

## 한 줄 요약

> **"객체마다 *owner 한 명*. 나머지는 *non-owning 참조*."** — 명시적 책임 할당이 *bug의 90%* 방지.

## 어떤 문제를 푸는가

C++의 *메모리 안전 문제*는 거의 모두 *소유권 모호*에서 옵니다.

- *Use after free* — 소유자가 사라진 후 누가 사용?
- *Double free* — 두 owner가 *각자 delete*
- *Memory leak* — owner 미정 — *delete를 누가?*
- *Dangling pointer* — owner가 소멸했는데 *참조 살아 있음*

해결 — *명시적 소유권 모델*. 각 객체에 *정확히 한 owner*. 나머지는 *non-owning 참조*.

Rust가 *컴파일러 차원 강제*. C++는 *프로그래머 규율*.

## 세 역할 — Owner, Observer, Borrower

### Owner — 객체 lifetime 관리

```cpp
class Device {
    std::unique_ptr<Driver> driver_;   // owner — lifetime 책임
public:
    Device() : driver_(std::make_unique<Driver>()) {}
    // 자동 delete on destruction
};
```

`unique_ptr`이 *owner 명시*. *Device가 사라지면 Driver도 사라짐*.

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

`Logger`는 `Sink`를 *관찰만*. *Sink lifetime은 외부*.

Observer 표현:
- `T*` — nullable, *non-owning* 의도
- `T&` — non-null, *non-owning*
- `std::span<T>` — array + size, non-owning
- `std::string_view` — string, non-owning

### Borrower — 일시적 사용

```cpp
void process(const Data& data) {   // borrower
    // data를 잠시 사용
    // 함수 끝나면 빌림 끝
}
```

함수 매개변수가 *전형적 borrower*. *함수 scope 동안만* 유효.

C++에서 *borrowing 명시*:
- `const T&` — read-only 빌림
- `T&` — mutable 빌림
- `T*` — nullable 빌림
- `std::span<T>`, `std::string_view`

## 결정 — 어느 모델

```text
이 함수/객체가 ...

1. 이 객체를 *소유*해야 하나?
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

`System`이 *bus와 display 모두 소유*. `Display`는 *bus 빌림*. *cyclic ownership 없음*.

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

multi-task RTOS에서 *객체 공유*가 *복잡*. 패턴.

### 1. *Message passing* — 소유권 이전

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

*copy로 소유권 이전*. 두 task가 *공유 메모리 없음*. *race 0*.

### 2. *Pool + handle*

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

*큰 객체*는 copy 비싸 → *pool + pointer*. *소유권은 명확*: producer → consumer.

### 3. *Shared state with mutex*

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

*공유 객체 + lock*. 소유권은 *시스템 전체*. *non-owning ref*만 task가 사용.

## 임베디드 — Callback 소유권

callback의 *소유권 모호*가 *자주 bug*.

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

*Lambda capture by reference*는 *함수 scope 끝나면 dangling*. *value capture* 또는 *외부 owner*.

## C++ Core Guidelines

ISO C++ Core Guidelines의 *소유권 권장*.

- `unique_ptr<T>` — exclusive owner
- `shared_ptr<T>` — shared owner (필요 시만)
- `gsl::owner<T*>` — raw pointer지만 *owning 의도*
- `T*` (gsl::owner 없는) — *non-owning*
- `T&` — *non-owning, non-null*

```cpp
#include <gsl/pointers>

void take_owner(gsl::owner<int*> p);   // 의도: 소유권 받음
void observe(int* p);                  // 의도: 관찰만
void use(int& x);                      // 의도: 빌림
```

`gsl::owner`는 *static analysis tool*에 *힌트*. 임베디드 인증에 유용.

## 자주 보는 함정과 안티패턴

### 1. *Owner 불명확*
```cpp
class A { B* b; };   // A가 owner? 그냥 reference?
```
*명시적*: `unique_ptr<B>` (owner) 또는 *주석으로 표시*.

### 2. *Cyclic ownership*
```cpp
struct A { shared_ptr<B> b; };
struct B { shared_ptr<A> a; };   // cycle — 영원히 안 해제
```
한쪽 *weak_ptr* 또는 *재설계*.

### 3. *Local owner를 외부에 노출*
```cpp
void setup() {
    auto resource = std::make_unique<Resource>();
    register_handler([&resource](int e) { /* */ });   // dangling
}
```
*owner를 외부 객체에*.

### 4. *Reference 멤버의 함정*
```cpp
class A {
    B& b_;   // reference 멤버
public:
    A(B& b) : b_(b) {}
    // A를 어떻게 copy/move? b_ 못 재바인딩
};
```
*reference 멤버는 immutable*. copy/move 어려움. *pointer 멤버* 검토.

### 5. *Borrowed 객체 저장*
```cpp
void process(const Data& data) {
    saved_ = &data;   // data는 borrow — caller가 사라지면 dangling
}
```
*저장 의도*면 *copy* 또는 *shared_ptr*.

### 6. *void* 사용*
```cpp
void register_callback(void* ctx, void (*cb)(void*));
```
*type 정보 없음*. C 인터페이스에만. C++는 *template 또는 std::function*.

## 측정 — 소유권 명시의 효과

같은 모듈, *명시적 소유권*과 *raw pointer*.

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

*100 B 추가*로 *bug 완전 제거*. *모범 사례*.

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

[Part 4-01: Intrusive Containers](/blog/embedded/embedded-cpp/part4-01-intrusive-containers) — *동적 할당 없는 linked list*. 객체 자체가 *next pointer 보유*.
