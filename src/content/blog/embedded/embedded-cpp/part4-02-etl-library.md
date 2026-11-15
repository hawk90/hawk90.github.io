---
title: "ETL 라이브러리 분석 — Embedded Template Library의 STL 대체"
slug: "embedded/embedded-cpp/part4-02-etl-library"
date: 2026-05-01T09:30:00
description: "Embedded Template Library — heap 없는 STL 대체, fsm, message router 포함."
series: "Embedded C++ for Real Systems"
seriesOrder: 30
tags: [cpp, embedded, etl, library, stl-alternative, fsm]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **"ETL은 STL의 임베디드 친화 대체입니다."** 고정 capacity 컨테이너를 제공하며 container 자체의 node/buffer를 heap에서 확보하지 않습니다. 저장하는 T의 생성자·callback은 별도이며, FSM과 message router와 factory도 함께 제공합니다.

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

내부에 capacity N에 맞는 정렬 저장 공간을 확보하고 원소 수명을 관리합니다. T 생성자가 별도로 메모리를 할당할 수 있으므로 container 저장 공간과 T의 동작을 구분합니다.

### `etl::string<N>`

```cpp
#include <etl/string.h>

etl::string<64> s = "hello";
s += " world";

if (s.is_truncated()) { /* 잘린 문자열 처리 */ }

const char* cstr = s.c_str();
```

문자 capacity는 N이며 종료 null을 위한 공간도 확보합니다. capacity를 넘는 입력은 truncation 상태로 확인하며, 해당 판의 string truncation 검사 설정에 따라 오류 처리도 달라집니다. size가 capacity보다 커지는 것을 기다리면 truncation을 잡지 못합니다.

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

정렬 associative container이며 노드 pool은 고정 capacity입니다. 실제 tree 구현·삽입 비용은 고정한 ETL 판의 map.h를 확인합니다.

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

delegate 자체는 호출 대상과 stub을 저장하며 동적으로 호출 wrapper를 할당하지 않습니다. 정확한 sizeof와 대상 객체의 수명은 ABI·판에 따라 확인합니다.

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

```cpp title="etl-fsm-check.cpp"
#include <etl/fsm.h>
#include <cassert>
#include <iostream>
struct Start : etl::message<1> {};
struct Stop : etl::message<2> {};
struct Unknown : etl::message<3> {};
struct Machine : etl::fsm { Machine() : etl::fsm(0) {} };
struct Idle : etl::fsm_state<Machine, Idle, 0, Start> {
    etl::fsm_state_id_t on_event(const Start&) { return 1; }
    etl::fsm_state_id_t on_event_unknown(const etl::imessage&) { return STATE_ID; }
};
struct Running : etl::fsm_state<Machine, Running, 1, Stop> {
    etl::fsm_state_id_t on_event(const Stop&) { return 0; }
    etl::fsm_state_id_t on_event_unknown(const etl::imessage&) { return STATE_ID; }
};
int main() {
    Idle idle; Running running;
    etl::ifsm_state* states[] = {&idle, &running};
    Machine machine;
    machine.set_states(states, 2); machine.start();
    assert(machine.get_state_id() == 0);
    machine.receive(Start{}); assert(machine.get_state_id() == 1);
    machine.receive(Unknown{}); assert(machine.get_state_id() == 1);
    machine.receive(Stop{}); assert(machine.get_state_id() == 0);
    std::cout << "etl fsm start/unknown/stop passed\n";
}
```

이 완성 예시는 ETL 20.49.0에서 상태 ID와 states 배열 인덱스를 맞춥니다. 모든 상태의 unknown-event 처리까지 정의하며 states와 state 객체는 machine의 사용 기간 동안 살아 있어야 합니다.


heap을 쓰지 않고, type-safe event dispatch가 가능하며, 상태 전이가 명확합니다.

자세한 FSM 패턴은 [Part 4-06](/blog/embedded/embedded-cpp/part4-06-state-machine)에서 다룹니다.

## etl::message_router — Type-safe routing

```cpp
#include <etl/message_router.h>

struct TempMessage : public etl::message<1> {
    float celsius;
    explicit TempMessage(float value) : celsius(value) {}
};
struct PressureMessage : public etl::message<2> {
    float kpa;
    explicit PressureMessage(float value) : kpa(value) {}
};

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

## 판과 오류 정책을 고정하고 재현하기

아래 예시는 **ETL 20.49.0**의 vector.h·basic_string.h·error_handler.h를 확인한 결과입니다. ETL_THROW_EXCEPTIONS로 예외 경로를 선택하고 ETL_CHECK_PUSH_POP으로 vector의 경계 검사를 켭니다. compiler에 예외가 켜졌다는 이유만으로 ETL이 기본적으로 throw한다고 가정하지 않습니다.

```cpp title="etl-capacity-check.cpp"
#include <etl/vector.h>
#include <etl/string.h>
#include <etl/delegate.h>
#include <etl/version.h>
#include <cassert>
#include <iostream>
struct Handler { int last = 0; void event(int value) { last = value; } };
int main() {
    static_assert(ETL_VERSION_MAJOR == 20 && ETL_VERSION_MINOR == 49 && ETL_VERSION_PATCH == 0);
    etl::vector<int, 4> values;
    for (int i = 0; i < 4; ++i) values.push_back(i);
    assert(values.full());
    bool full_error = false;
    try { values.push_back(4); } catch (const etl::vector_full&) { full_error = true; }
    assert(full_error && values.size() == 4);
    etl::string<4> text = "abcdef";
    assert(text.size() == 4 && text.is_truncated());
    Handler handler;
    auto callback = etl::delegate<void(int)>::create<Handler, &Handler::event>(handler);
    callback(42); assert(handler.last == 42);
    std::cout << "etl=" << ETL_VERSION << " full=detected string=truncated delegate=42\n";
}
```

```bash
clang++ -std=c++17 -I /path/to/etl-20.49.0/include -DETL_THROW_EXCEPTIONS -DETL_CHECK_PUSH_POP etl-capacity-check.cpp -o etl-capacity-check
./etl-capacity-check
clang++ -std=c++17 -I /path/to/etl-20.49.0/include etl-fsm-check.cpp -o etl-fsm-check
./etl-fsm-check
```

Clang 23.1.3 host에서 정상 capacity 경계·다섯 번째 삽입 오류·문자열 truncation·delegate 호출·FSM unknown event를 실행했습니다. no-exception 제품에서는 ETL_LOG_ERRORS, ETL_USE_ASSERT_FUNCTION, ETL_NO_CHECKS 및 NDEBUG 등 error_handler.h의 분기를 검토하고 반환 여부를 포함한 실패 정책을 정해야 합니다. logging callback이 돌아온 뒤에도 모든 API가 안전하게 작업을 중단한다고 가정하지 않습니다. 정상 경로에서는 full()/empty()를 먼저 검사합니다.

ETL_ASSERT를 애플리케이션에서 임의로 재정의하는 대신 이 판의 공식 설정과 handler API를 사용합니다. capacity N의 RAM은 저장 기간에 따라 stack·static 영역 등에 놓이며 항상 .bss인 것은 아닙니다. .text·RAM·worst-case 동작은 실제 target 산출물과 workload로 비교해야 하며 이 host 검증은 STM32 코드 크기 개선 측정이 아닙니다.

## 1차 자료

- [ETL 20.49.0 release](https://github.com/ETLCPP/etl/releases/tag/20.49.0)
- [vector.h](https://github.com/ETLCPP/etl/blob/20.49.0/include/etl/vector.h), [basic_string.h](https://github.com/ETLCPP/etl/blob/20.49.0/include/etl/basic_string.h), [error_handler.h](https://github.com/ETLCPP/etl/blob/20.49.0/include/etl/error_handler.h), [fsm.h](https://github.com/ETLCPP/etl/blob/20.49.0/include/etl/fsm.h) — 이 글에서 확인한 판의 구현

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
ETL 20.49.0에서는 ETL_THROW_EXCEPTIONS와 error-handler 설정을 확인합니다. no-exception compiler 옵션과 library 오류 정책은 별개이며, abort·callback·검사 생략 중 무엇인지 실제 설정으로 확인합니다.

### 4. 큰 N으로 .bss 폭증
```cpp
etl::vector<HugeStruct, 1000> v;
```

지역 automatic 객체라면 stack 등 automatic 저장 공간을 사용합니다. static 저장 기간 객체도 초기화 내용과 linker 배치에 따라 .bss/.data 등이 달라집니다. 측정 후 적정 N을 선택합니다.

### 5. Boost.Intrusive와 비교하지 않음
ETL은 가볍고 Boost는 더 강력합니다. 프로젝트의 요구에 맞게 선택합니다.

### 6. Header-only 의존
ETL은 header-only라서 컴파일 시간이 늘어납니다. PCH를 활용합니다.

## ETL의 장점 vs 단점

| 장점 | 단점 |
| --- | --- |
| Heap 0 | API가 STL과 일부 다름 |
| 동적 할당 없는 저장 정책을 선택하기 쉬움 | 지침 준수·인증은 프로젝트 근거가 별도 필요 |
| Header-only | 컴파일 시간 |
| Fixed-size 명시 | 동적 크기 불가 |
| FSM, router 포함 | 학습 곡선 |
| Active maintenance | Boost만큼 풍부하진 않음 |

## 정리

- ETL은 고정 capacity 컨테이너와 임베디드 유틸리티를 제공합니다. 원소와 callback의 할당·수명은 별도 계약입니다.
- 기본 컨테이너로 `etl::vector`, `etl::string`, `etl::list`, `etl::map`, `etl::queue`를 제공합니다.
- 특수 도구로 `etl::delegate`(std::function 대체), `etl::observer`, `etl::fsm`, `etl::message_router`가 있습니다.
- 예외·경계 검사·error handler 설정을 고정한 판에서 함께 검증합니다.
- 측정 가능한 fixed-size이므로 `.bss` 영향을 추적할 수 있습니다.
- MIT 라이선스이며 header-only로 배포됩니다.

## 관련 항목

- [Part 3-01: 동적 할당 없이](/blog/embedded/embedded-cpp/part3-01-no-dynamic-alloc)
- [Part 4-01: Intrusive Containers](/blog/embedded/embedded-cpp/part4-01-intrusive-containers)
- [Part 4-06: State Machine](/blog/embedded/embedded-cpp/part4-06-state-machine) — etl::fsm
- [ETL website](https://www.etlcpp.com/)

## 다음 글

[Part 4-03: Lock-free 기초](/blog/embedded/embedded-cpp/part4-03-lock-free-basics) — mutex 없이 동시성. atomic, CAS, memory order.
