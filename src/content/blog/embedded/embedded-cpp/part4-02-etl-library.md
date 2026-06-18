---
title: "ETL 라이브러리 분석 — Embedded Template Library의 STL 대체"
date: 2026-05-01T09:30:00
description: "Embedded Template Library — heap 없는 STL 대체, fsm, message router 포함."
series: "Embedded C++ for Real Systems"
seriesOrder: 30
tags: [cpp, embedded, etl, library, stl-alternative, fsm]
type: tech
---

## 한 줄 요약

> **"ETL은 STL의 임베디드 친화 대체입니다."** 모든 컨테이너가 고정 크기이고 heap을 쓰지 않으며, FSM과 message router와 factory도 함께 제공합니다.

## 어떤 문제를 푸는가

C++ STL은 대부분 heap을 사용하지만, 임베디드에서는 heap을 회피해야 합니다. ETL은 STL과 비슷한 인터페이스를 fixed-size + zero heap으로 제공합니다.

```cpp
#include <etl/vector.h>

etl::vector<int, 32> v;   // 최대 32개
v.push_back(1);
if (v.full()) { /* */ }
```

추가로 다음을 제공합니다.

- Fixed-size FSM
- Fixed-size message router
- `etl::delegate` (std::function 대체)
- `etl::observer` (Observer 패턴)
- `etl::string` (fixed-size)

홈은 [etlcpp.com](https://www.etlcpp.com/)이며 MIT 라이선스의 header-only 라이브러리입니다.

## 기본 컨테이너

### `etl::vector<T, N>`

```cpp
#include <etl/vector.h>

etl::vector<int, 32> v;

v.push_back(1);
v.push_back(2);

for (auto x : v) { /* */ }

if (v.full()) { /* 32 도달 */ }
if (v.empty()) { /* */ }

v.erase(v.begin());
v.clear();
```

내부적으로는 `T storage[N]`과 size만 갖고 있어 heap을 쓰지 않습니다.

### `etl::string<N>`

```cpp
#include <etl/string.h>

etl::string<64> s = "hello";
s += " world";

if (s.size() > 64) { /* truncated */ }

const char* cstr = s.c_str();
```

고정 크기 char array이며 길이가 초과되면 잘립니다.

### `etl::list<T, N>`

```cpp
#include <etl/list.h>

etl::list<Order, 16> orders;

orders.push_back(o);
orders.pop_front();

for (auto& o : orders) { /* */ }
```

doubly linked list이며 고정 크기 pool을 내부에 두므로 heap을 쓰지 않습니다.

### `etl::map<K, V, N>`

```cpp
#include <etl/map.h>

etl::map<int, Order, 16> m;
m.insert({1, Order{}});
m[5] = Order{};

auto it = m.find(1);
if (it != m.end()) { /* */ }
```

RB-tree 기반이며 노드 pool도 고정 크기입니다.

### `etl::queue<T, N>`

```cpp
#include <etl/queue.h>

etl::queue<int, 8> q;
q.push(1);
int v = q.front();
q.pop();
```

ring buffer 기반입니다.

## etl::delegate — std::function 대체

`std::function`은 내부에서 heap을 쓸 수 있지만, `etl::delegate`는 fixed-size입니다.

```cpp
#include <etl/delegate.h>

class Handler {
public:
    void on_event(int e) { /* */ }
};

Handler h;

etl::delegate<void(int)> d;
d = etl::delegate<void(int)>::create<Handler, &Handler::on_event>(h);

d(42);   // h.on_event(42) 호출
```

크기는 object와 method 두 pointer만큼이며 heap을 쓰지 않습니다.

함수와 lambda도 받을 수 있습니다.

```cpp
auto d1 = etl::delegate<int(int, int)>::create<add_function>();
auto d2 = etl::delegate<void()>::create<&Class::static_method>();
```

## etl::observer — Observer 패턴

```cpp
#include <etl/observer.h>

struct TempEvent { float celsius; };

class TempObserver : public etl::observer<TempEvent> {
public:
    void notification(TempEvent e) override {
        if (e.celsius > 80) alarm();
    }
};

class TempSensor : public etl::observable<TempObserver, 4> {   // 최대 4 observer
public:
    void update() {
        notify_observers(TempEvent{read_temperature()});
    }
};

TempSensor sensor;
TempObserver obs;
sensor.add_observer(obs);

sensor.update();   // obs.notification 호출
```

heap 없는 pub/sub이며 최대 observer 수가 고정되어 있습니다.

## etl::fsm — Finite State Machine

ETL의 대표 기능으로 fixed-size FSM을 제공합니다.

```cpp
#include <etl/fsm.h>

// Event 정의
struct events {
    enum {
        start,
        stop,
        error,
    };
};

class StartEvent : public etl::message<events::start> {};
class StopEvent : public etl::message<events::stop> {};

// State 정의
enum class StateId : etl::fsm_state_id_t {
    idle,
    running,
    error,
};

class MyFsm : public etl::fsm {
public:
    MyFsm() : fsm(0) {}
};

class IdleState : public etl::fsm_state<MyFsm, IdleState, (etl::fsm_state_id_t)StateId::idle,
                                          StartEvent> {
public:
    etl::fsm_state_id_t on_event(const StartEvent&) {
        log("starting");
        return (etl::fsm_state_id_t)StateId::running;
    }

    etl::fsm_state_id_t on_event_unknown(const etl::imessage&) {
        return STATE_ID;   // 무시
    }
};

class RunningState : public etl::fsm_state<MyFsm, RunningState, (etl::fsm_state_id_t)StateId::running,
                                            StopEvent> {
public:
    etl::fsm_state_id_t on_event(const StopEvent&) {
        log("stopping");
        return (etl::fsm_state_id_t)StateId::idle;
    }
    // ...
};

// 사용
IdleState idle;
RunningState running;
etl::ifsm_state* states[] = {&idle, &running};

MyFsm fsm;
fsm.set_states(states, etl::size(states));
fsm.start();

fsm.receive(StartEvent{});   // idle → running
fsm.receive(StopEvent{});    // running → idle
```

heap을 쓰지 않고, type-safe event dispatch가 가능하며, 상태 전이가 명확합니다.

자세한 FSM 패턴은 [Part 4-06](/blog/embedded/embedded-cpp/part4-06-state-machine)에서 다룹니다.

## etl::message_router — Type-safe routing

```cpp
#include <etl/message_router.h>

struct TempMessage : public etl::message<1> { float celsius; };
struct PressureMessage : public etl::message<2> { float kpa; };

class SensorRouter : public etl::message_router<SensorRouter,
                                                  TempMessage,
                                                  PressureMessage> {
public:
    void on_receive(const TempMessage& m) {
        log_temp(m.celsius);
    }

    void on_receive(const PressureMessage& m) {
        log_pressure(m.kpa);
    }

    void on_receive_unknown(const etl::imessage&) {
        // 무시
    }
};

SensorRouter router;
router.receive(TempMessage{25.0f});
router.receive(PressureMessage{101.3f});
```

message type별 dispatch가 컴파일 타임에 결정되며 RTTI를 쓰지 않습니다.

## etl::array vs std::array

ETL은 `etl::array`도 제공합니다. 차이는 주로 예외 환경에서 드러납니다.

```cpp
etl::array<int, 8> a = {1, 2, 3};
// std::array와 거의 동일 API
// 단 -fno-exceptions에서 .at() 동작이 차이
```

대부분의 경우 `std::array`로 충분합니다.

## etl::optional

```cpp
#include <etl/optional.h>

etl::optional<int> x;
if (x) { /* */ }
x = 42;
*x = 10;
```

C++17 이전 환경에서 std::optional의 대체로 쓰며, C++17 이상에서는 표준을 사용합니다.

## 설정 매크로

ETL은 컴파일러와 플랫폼 설정이 필요합니다.

```cpp
// etl_profile.h
#define ETL_NO_STL                        // STL 의존 끔
#define ETL_NO_LARGE_CHAR_SUPPORT
#define ETL_LOG_ERRORS                    // 로깅
#define ETL_VERBOSE_ERRORS                // 상세 에러
#define ETL_DEBUG_COUNT                   // 디버깅 통계
```

```cpp
// 또는 컴파일러 플래그
CXXFLAGS += -DETL_NO_STL -DETL_LOG_ERRORS
```

## 에러 처리

ETL은 예외 또는 abort를 선택할 수 있습니다.

```cpp
// 예외 모드 (기본)
etl::vector<int, 4> v;
v.push_back(1); v.push_back(2); v.push_back(3); v.push_back(4);
v.push_back(5);   // throws etl::vector_full

// no-exception 모드
#define ETL_NO_EXCEPTIONS

// → push_back에 5번째는 그냥 *무시* 또는 ETL_ASSERT trigger
```

`ETL_ASSERT` 매크로를 정의해 fail 동작을 직접 통제할 수 있습니다.

```cpp
#define ETL_ASSERT(condition, error) \
    if (!(condition)) { fatal_error(error.what()); }
```

## 측정 — ETL vs STL

같은 코드를 STL과 ETL로 비교한 결과입니다 (STM32F4).

```text
std::vector<int> + 16 elements:
  .text:  6.2 KB (vector + heap)
  .heap usage: ~64 B
  alloc cost: 변동 (realloc 가능)

etl::vector<int, 16>:
  .text:  0.4 KB (간단한 wrapper)
  .heap usage: 0
  alloc cost: 0 (compile-time fixed)
```

코드 크기가 15배 작고 heap도 쓰지 않습니다.

## 자주 보는 함정과 안티패턴

### 1. fixed-size 초과
```cpp
etl::vector<int, 4> v;
for (int i = 0; i < 10; ++i) v.push_back(i);   // 4 이후 fail
```

`full()`을 먼저 체크하거나 capacity를 늘립니다.

### 2. STL과 혼용
```cpp
std::vector<etl::string<32>> v;   // STL vector는 heap
```

완전히 ETL을 쓰거나, STL이 허용되는 환경에서만 섞습니다.

### 3. exception 가정
ETL은 기본적으로 exception을 던집니다. `-fno-exceptions` 환경에서는 abort합니다. 이때는 `ETL_NO_EXCEPTIONS`를 정의합니다.

### 4. 큰 N으로 .bss 폭증
```cpp
etl::vector<HugeStruct, 1000> v;
```

`sizeof(HugeStruct) * 1000`이 그대로 `.bss`에 잡힙니다. 측정 후 적정 N을 선택합니다.

### 5. Boost.Intrusive와 비교하지 않음
ETL은 가볍고 Boost는 더 강력합니다. 프로젝트의 요구에 맞게 선택합니다.

### 6. Header-only 의존
ETL은 header-only라서 컴파일 시간이 늘어납니다. PCH를 활용합니다.

## ETL의 장점 vs 단점

| 장점 | 단점 |
| --- | --- |
| Heap 0 | API가 STL과 일부 다름 |
| 인증 친화 (MISRA 가까움) | C++11/14 위주 (C++20 일부) |
| Header-only | 컴파일 시간 |
| Fixed-size 명시 | 동적 크기 불가 |
| FSM, router 포함 | 학습 곡선 |
| Active maintenance | Boost만큼 풍부하진 않음 |

## 정리

- ETL은 임베디드용 STL 대체 라이브러리로, 모두 fixed-size이며 heap을 쓰지 않습니다.
- 기본 컨테이너로 `etl::vector`, `etl::string`, `etl::list`, `etl::map`, `etl::queue`를 제공합니다.
- 특수 도구로 `etl::delegate`(std::function 대체), `etl::observer`, `etl::fsm`, `etl::message_router`가 있습니다.
- `-fno-exceptions` 환경에서는 `ETL_NO_EXCEPTIONS` 매크로를 정의합니다.
- 측정 가능한 fixed-size이므로 `.bss` 영향을 추적할 수 있습니다.
- MIT 라이선스이며 header-only로 배포됩니다.

## 관련 항목

- [Part 3-01: 동적 할당 없이](/blog/embedded/embedded-cpp/part3-01-no-dynamic-alloc)
- [Part 4-01: Intrusive Containers](/blog/embedded/embedded-cpp/part4-01-intrusive-containers)
- [Part 4-06: State Machine](/blog/embedded/embedded-cpp/part4-06-state-machine) — etl::fsm
- [ETL website](https://www.etlcpp.com/)

## 다음 글

[Part 4-03: Lock-free 기초](/blog/embedded/embedded-cpp/part4-03-lock-free-basics) — mutex 없이 동시성. atomic, CAS, memory order.
