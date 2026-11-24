---
title: "임베디드 C++ 소유권 모델 — single·shared·borrow 패턴"
slug: "embedded/embedded-cpp/part3-10-ownership-model"
date: 2026-04-30T09:28:00
description: "Owner, observer, borrower — 객체 lifetime의 명확한 책임 할당."
series: "Embedded C++ for Real Systems"
seriesOrder: 28
tags: [cpp, embedded, ownership, lifetime, reference, design]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **"객체마다 owner는 한 명이고 나머지는 non-owning 참조입니다."** 누가 해제하는지를 타입으로 드러내면 복사로 생기는 double free는 컴파일 오류가 되고, raw `new`/`delete` 경로는 clang-tidy `cppcoreguidelines-owning-memory`가 지적합니다. dangling 참조는 여전히 수명 계약으로 지켜야 합니다.

## 어떤 문제를 푸는가

아래 네 가지 메모리 버그는 모두 "이 객체를 누가 언제 해제하는가"가 코드에 드러나지 않을 때 생깁니다.

- **Use after free** — 소유자가 사라진 뒤에 누가 사용했는지 분명하지 않습니다.
- **Double free** — 두 owner가 각자 delete를 호출합니다.
- **Memory leak** — owner가 미정이라 delete를 누가 할지 모릅니다.
- **Dangling pointer** — owner는 소멸했는데 참조가 살아 있습니다.

해결책은 명시적인 소유권 모델입니다. 단일 owner로 표현할 수 있으면 우선 사용하고, 여러 owner가 수명을 연장해야 한다면 공유 소유를 선택합니다. 어느 모델도 비소유 참조의 dangling이나 pointee의 data race를 자동으로 막지는 않습니다.

Rust는 이를 컴파일러 차원에서 강제하지만, C++는 프로그래머의 규율에 맡깁니다.

## 세 역할 — Owner, Observer, Borrower

C++ 스마트 포인터의 세 가지 소유권 모델을 그림으로 보면 차이가 분명합니다. `unique_ptr`은 단일 소유자가 자원을 직접 가리키고, `shared_ptr`은 control block을 매개로 여러 소유자가 공유합니다. weak_ptr는 strong count를 늘리지 않지만 control block의 weak 수명 관리에는 참여합니다.

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

이 글에서 borrower는 호출 동안만 사용하는 계약, observer는 멤버 등에 보관하는 비소유 참조를 뜻합니다. C++의 참조 타입이 이 기간을 강제하지는 않습니다. 실제 객체는 호출보다 오래 살 수 있지만 참조를 저장하려면 별도 수명 계약이 필요합니다.

C++에서 borrowing은 다음과 같이 표현합니다.

- `const T&` — read-only 빌림
- `T&` — mutable 빌림
- `T*` — nullable 빌림
- `std::span<T>`, `std::string_view`

## 결정 — 어느 모델

지금 다루는 함수나 객체를 놓고 위에서부터 차례로 답합니다.

| 질문 | YES일 때 |
| --- | --- |
| 1. 이 객체를 소유해야 하는가? | `unique_ptr` (단일) 또는 `shared_ptr` (공유, 드물게) |
| 2. 객체 lifetime을 외부에서 관리하는가? | 매개변수는 `const T&` 또는 `T*`, 멤버는 `T*` |
| 3. 함수 호출 동안만 필요한가? | 매개변수 (`const T&`, `T*`, `std::span`, `std::string_view`) |

## 임베디드 패턴 — Device class

```cpp
class Display {
public:
    Display(Bus& bus) : bus_(bus) {}   // observer — bus는 외부 소유

    void clear() { bus_.write(CLEAR_CMD); }

private:
    Bus& bus_;   // non-owning reference
};

class System {
    Bus bus_;             // owner
    Display display_;     // owner (display는 bus borrow)

public:
    System() : display_(bus_) {}   // bus_ 참조 전달
    System(const System&) = delete;
    System& operator=(const System&) = delete;
    System(System&&) = delete;
    System& operator=(System&&) = delete;
};
```

`System`이 bus와 display를 모두 소유하고 `Display`는 bus를 빌립니다. 멤버는 선언 순서로 생성되고 역순으로 소멸하므로 bus를 display보다 먼저 선언합니다. 기본 복사·이동 생성은 display의 참조를 새 System의 bus로 자동 재연결하지 않습니다. 여기서는 복사·이동을 금지해 원래 System의 bus를 계속 가리키는 문제를 피합니다. 이동이 필요하면 참조 재구성과 외부 observer까지 포함한 별도 수명 설계가 필요합니다.

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
| Optional 값 | `std::optional<T>` (T를 내부 저장; T 자체 할당은 별도) |
| Non-owning ref | `T*` (nullable) 또는 `T&` (non-null) |
| 다중 owner (드물게) | `shared_ptr<T>` |
| 외부 owner의 weak ref | `weak_ptr<T>` |

```cpp
class Service {
    Database db_;                       // owner, value
    std::unique_ptr<Logger> logger_;    // owner, optional (nullable)
    std::optional<Config> config_;      // Config 내부 저장; Config의 추가 할당은 별도
    Bus* bus_;                          // non-owning, nullable
    EventLoop& loop_;                   // non-owning, non-null (참조 멤버)
};
```

## 임베디드 — RTOS task 간 소유권

multi-task RTOS에서는 객체 공유가 복잡해집니다. 자주 쓰는 패턴은 다음과 같습니다.

### 1. Message passing — 소유권 이전

```cpp
// <type_traits>와 FreeRTOS queue 선언이 필요한 API 조각입니다.
struct Event {
    int type;
    uint32_t data;
};
static_assert(std::is_trivially_copyable_v<Event>);

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

FreeRTOS queue는 설정한 크기만큼 byte를 복사하며 C++ 복사·이동 생성자나 소멸자를 호출하지 않습니다. `std::string`·`unique_ptr`·`shared_ptr` 같은 객체를 그대로 byte 복사해 소유권을 전달하면 안 됩니다. 이 Event처럼 trivially copyable인 값의 표현을 전달하거나 별도 소유권 계약의 pointer/handle을 사용합니다. trivially copyable이라도 내부 포인터의 대상 수명이나 장치 주소까지 검증되는 것은 아닙니다.

이벤트 값은 queue가 복사하며 producer의 원본 소유권은 이전되지 않습니다. queue item size가 sizeof(Event)로 설정되어 있고 send가 성공해야 합니다. 포인터가 없는 이 Event payload는 별도 복사본이므로 payload 자체의 공유 race를 피하지만 task가 접근하는 다른 전역 상태까지 보호하지는 않습니다.

### 2. Pool + handle

```cpp
ObjectPool<LargeMessage, 16> pool;
QueueHandle_t handle_queue;

void producer() {
    auto* msg = pool.construct(/* 생성 인자 */);
    if (!msg) return; // 고갈 정책
    msg->fill(/* 데이터 */);
    if (xQueueSend(handle_queue, &msg, 0) != pdPASS) {
        pool.destroy(msg); // 전송 실패: producer가 계속 owner
        return;
    }
    // 전송 성공: 이제 producer는 msg에 접근하지 않음
}

void consumer() {
    LargeMessage* msg;
    if (xQueueReceive(handle_queue, &msg, portMAX_DELAY)) {
        process(*msg);
        pool.destroy(msg);   // 소멸 후 슬롯 반환
    }
}
```

이 스케치는 queue item size=sizeof(LargeMessage*)와 성공한 queue 생성을 전제로 합니다. 소유권은 send 성공 시에만 consumer로 이전합니다. 실패·queue 삭제·shutdown 때 남은 메시지의 반환 정책이 필요하고, producer와 consumer가 pool을 동시에 사용하면 pool 메타데이터를 task-safe하게 보호해야 합니다. pointer 전달 자체가 이 계약을 강제하지는 않습니다.

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

이 스케치는 mutex 생성·획득 성공을 전제로 합니다. 모든 접근 경로가 같은 lock을 지켜야 하며 mutex는 ISR에서 사용할 수 없습니다. 소유자는 정적 저장 기간의 시스템 객체이고 각 task는 잠시 비소유 접근합니다.

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

lambda를 reference로 capture하면 함수 scope가 끝나는 순간 dangling이 됩니다. 첫 번째 `setup()`을 `std::function`에 저장하는 `register_callback`과 함께 호스트에서 실행하면 컴파일 경고 없이 빌드되고, AddressSanitizer(`detect_stack_use_after_return=1`, Clang 23.1.5)가 callback 호출 시점에 `ERROR: AddressSanitizer: stack-use-after-return`과 `READ of size 4 ... in LocalData::process(int)`를 보고했습니다. sanitizer 없이 실행하면 이미 다른 용도로 쓰인 stack을 읽고 씁니다. value capture로 잡거나 외부 owner를 둡니다. 다만 data가 포인터·span·string_view를 포함하면 복사는 얕은 참조를 남길 수 있으며 callback 등록 해제와 실행 중 호출의 수명도 관리해야 합니다.

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

`gsl::owner<T*>`는 `T*`의 별칭일 뿐이라 생성 코드는 같습니다. 의미는 정적 분석기가 읽습니다. clang-tidy(Homebrew LLVM 23.1.5)의 `cppcoreguidelines-owning-memory` 검사를 `gsl::owner`를 별칭으로만 정의한 작은 파일에 돌리면 두 줄을 지적했습니다.

```text
own.cpp:4:15: warning: initializing non-owner 'Resource *' with a newly created 'gsl::owner<>' [cppcoreguidelines-owning-memory]
own.cpp:6:32: warning: deleting a pointer through a type that is not marked 'gsl::owner<>'; consider using a smart pointer instead [cppcoreguidelines-owning-memory]
```

4행은 `new`의 결과를 그냥 `Resource*`에 담은 곳, 6행은 owner 표시가 없는 매개변수를 `delete`한 곳입니다. `gsl::owner<Resource*>`로 받아 `delete`한 함수는 지적하지 않았습니다.

## 자주 보는 함정과 안티패턴

### 1. Owner 불명확
```cpp
class A { B* b; };   // A가 owner? 그냥 reference?
```
`unique_ptr<B>`로 명시합니다. raw 포인터를 유지해야 하면 `gsl::owner<B*>`로 표시해 위 clang-tidy 검사가 확인하게 합니다. 주석은 도구가 읽지 않습니다.

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
참조 멤버를 가진 타입도 복사·이동 생성될 수 있으며 새 객체의 참조는 같은 대상을 가리킵니다. 반면 암시적 copy/move 대입은 참조를 재바인딩할 수 없어 삭제됩니다([class.copy.assign]). 아래 예제의 `-DASSIGN_OBSERVER` 빌드에서 Clang 23.1.5는 `error: object of type 'Observer' cannot be assigned because its copy assignment operator is implicitly deleted`, g++-16은 `error: use of deleted function 'Observer& Observer::operator=(const Observer&)'`를 냈습니다. 생성과 대입을 구분하고, 보관 대상의 수명이 두 객체보다 긴지 확인합니다.

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
void* 경계에서는 대상 type을 복원할 계약이 필요합니다. C++ 내부에서는 typed callback이나 template으로 이 계약을 표현할 수 있습니다. std::function을 선택하면 callable의 소유·할당 정책과 캡처 대상의 수명을 함께 확인하며, 고정 메모리 환경에서는 함수 포인터나 delegate도 고려합니다.

## 실행 확인 — 전달 성공·실패와 보관 참조

다음 host 예제는 용량 1인 queue 모형으로 소유권 계약을 검증합니다. 실제 FreeRTOS scheduler나 queue 구현을 실행한 것은 아닙니다. 성공하면 caller의 unique_ptr가 비고 실패하면 caller가 계속 소유해야 합니다.

```cpp title="ownership.cpp"
#include <cassert>
#include <memory>
#include <type_traits>
#include <utility>
struct Message {
    static inline int live = 0;
    Message() { ++live; }
    ~Message() { --live; }
};
class Queue {
    std::unique_ptr<Message> slot_;
public:
    bool send(std::unique_ptr<Message>& owner) {
        if (slot_ || !owner) return false;
        slot_ = std::move(owner);
        return true;
    }
    std::unique_ptr<Message> receive() { return std::move(slot_); }
};
struct Observer { int& value; };
static_assert(std::is_copy_constructible_v<Observer>);
static_assert(std::is_move_constructible_v<Observer>);
static_assert(!std::is_copy_assignable_v<Observer>);
int main() {
    Queue queue;
    auto a = std::make_unique<Message>();
    auto b = std::make_unique<Message>();
    assert(queue.send(a) && !a);
    assert(!queue.send(b) && b && Message::live == 2);
    auto received = queue.receive();
    assert(received); received.reset();
    assert(Message::live == 1);
    assert(queue.send(b) && !b);
    queue.receive().reset();
    assert(Message::live == 0 && !queue.receive());
    int bus = 7; Observer first{bus}; Observer second = first;
    assert(&first.value == &second.value);
#ifdef ASSIGN_OBSERVER
    first = second;
#endif
}
```

Homebrew Clang 23.1.5와 g++-16 모두 ASan·UBSan으로 exit 0이었습니다. 명시적 owner만으로 dangling 참조나 race가 사라지지는 않습니다. 실제 RTOS에서는 queue 성공·실패·shutdown·pool 고갈·consumer 중단도 시험하고 callback 해제 뒤 실행 중 호출이 남는지 확인합니다. 버그 감소·코드 크기 수치는 측정하지 않았습니다.

## 정리

- 단일 소유와 공유 소유를 구분하고, non-owning reference의 사용 기간도 제한합니다.
- 도구는 owner로 `unique_ptr`, non-owning으로 `T*`/`T&`, 드물게 `shared_ptr`을 씁니다.
- 함수 매개변수는 의도에 맞게 value, `const&`, `&`, pointer, span, string_view를 선택합니다.
- 멤버 변수는 value, `unique_ptr`, optional, pointer 중에서 고릅니다.
- RTOS task 간에는 message passing (copy)이나 pool + handle로 전달합니다.
- Lambda를 reference로 capture하면 dangling 위험이 있으므로 value capture나 외부 owner를 씁니다.

## 근거와 검증 범위

2026-11-16에 `ownership.cpp`, reference capture 실험(ASan), clang-tidy 검사를 Homebrew Clang 23.1.5·g++-16으로 macOS arm64 host에서 실행했습니다. 실제 FreeRTOS queue와 보드 실행은 하지 않았습니다. 다른 이름 없는 코드 블록은 주변에 정의한 장치 API를 가정하는 부분 예제이며 하나의 translation unit으로 합치지 않습니다.

- [참조 멤버와 암시적 copy/move 대입](https://eel.is/c++draft/class.copy.assign)

## 관련 항목

- [Part 3-09: 스마트 포인터 선택](/blog/embedded/embedded-cpp/part3-09-smart-pointer-choice)
- [Part 2-01: RAII 기초](/blog/embedded/embedded-cpp/part2-01-raii-basics)
- [FreeRTOS xQueueSend — 값 복사와 반환 상태](https://www.freertos.org/Documentation/02-Kernel/04-API-references/06-Queues/03-xQueueSend)
- [C++ Core Guidelines — Resource Management](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-resource)

## 다음 글 (Part 4 시작)

[Part 4-01: Intrusive Containers](/blog/embedded/embedded-cpp/part4-01-intrusive-containers) — 동적 할당 없는 linked list로, 객체 자체가 next pointer를 보유합니다.
