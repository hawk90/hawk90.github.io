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

`std::array`를 제외한 표준 컨테이너는 기본 allocator로 heap을 사용합니다([Part 3-01](/blog/embedded/embedded-cpp/part3-01-no-dynamic-alloc)). heap을 쓰지 않기로 한 프로젝트에서는 이 컨테이너들을 쓸 수 없습니다. ETL은 STL과 비슷한 인터페이스를 fixed-size + zero heap으로 제공합니다.

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

홈은 [etlcpp.com](https://www.etlcpp.com/)이며 MIT 라이선스의 header-only 라이브러리입니다. 이 글의 확인은 2026-09-08에 공개된 20.49.0 release(GitHub API 기준 최신)의 헤더로 했습니다.

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

ETL은 `etl::array`도 제공합니다. 차이는 `at()`의 범위 검사에서 드러납니다.

```cpp
etl::array<int, 8> a = {1, 2, 3};
// std::array와 거의 동일 API
```

20.49.0의 `etl::array::at()`은 `ETL_ASSERT(i < SIZE, ETL_ERROR(array_out_of_range))`로 검사합니다. 그런데 `error_handler.h`를 보면 `ETL_THROW_EXCEPTIONS`·`ETL_LOG_ERRORS`·`ETL_USE_ASSERT_FUNCTION`·`ETL_DEBUG` 중 아무것도 정의하지 않은 기본 구성에서 `ETL_ASSERT`는 `static_cast<void>(sizeof(b))`, 즉 아무 일도 하지 않습니다. `std::array::at()`은 `-fno-exceptions`에서도 라이브러리가 던져 `terminate`로 끝나지만([Part 1-02](/blog/embedded/embedded-cpp/part1-02-compiler-flags#주의--stl-함수가-던지는-예외)), `etl::array::at()`은 설정하지 않으면 범위 밖 접근을 그대로 합니다. `at()`을 쓰지 않는 코드라면 `std::array`로 충분합니다.

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

두 파일은 ETL 20.49.0 release tarball의 `include/`를 `ETL_INCLUDE`로 준 저장소 검증 스크립트 `scripts/verify-embedded-cpp-part4-examples.mjs 02`로 Homebrew Clang 23.1.5·ASan·UBSan에서 실행했고, 각각 `etl=20.49.0 full=detected string=truncated delegate=42`와 `etl fsm start/unknown/stop passed`를 출력했습니다. no-exception 제품에서는 ETL_LOG_ERRORS, ETL_USE_ASSERT_FUNCTION, ETL_NO_CHECKS 및 NDEBUG 등 error_handler.h의 분기를 검토하고 반환 여부를 포함한 실패 정책을 정해야 합니다. logging callback이 돌아온 뒤에도 모든 API가 안전하게 작업을 중단한다고 가정하지 않습니다. 정상 경로에서는 full()/empty()를 먼저 검사합니다.

ETL_ASSERT를 애플리케이션에서 임의로 재정의하는 대신 이 판의 공식 설정과 handler API를 사용합니다. capacity N의 RAM은 저장 기간에 따라 stack·static 영역 등에 놓이며 항상 .bss인 것은 아닙니다. .text·RAM·worst-case 동작은 실제 target 산출물과 workload로 비교해야 하며 이 host 검증은 STM32 코드 크기 개선 측정이 아닙니다.

## 1차 자료

- [ETL 20.49.0 release](https://github.com/ETLCPP/etl/releases/tag/20.49.0)
- [vector.h](https://github.com/ETLCPP/etl/blob/20.49.0/include/etl/vector.h), [basic_string.h](https://github.com/ETLCPP/etl/blob/20.49.0/include/etl/basic_string.h), [error_handler.h](https://github.com/ETLCPP/etl/blob/20.49.0/include/etl/error_handler.h), [fsm.h](https://github.com/ETLCPP/etl/blob/20.49.0/include/etl/fsm.h) — 이 글에서 확인한 판의 구현

## 자주 보는 함정과 안티패턴

### 1. fixed-size 초과
```cpp
etl::vector<int, 4> v;
for (int i = 0; i < 10; ++i) v.push_back(i);   // 기본 구성: 5번째부터 검사 없음
```

20.49.0의 `push_back`은 `ETL_ASSERT_CHECK_PUSH_POP_OR_RETURN(size() != CAPACITY, ETL_ERROR(vector_full))`로 시작합니다. 이 매크로는 `ETL_CHECK_PUSH_POP`을 정의했을 때만 검사로 바뀌고, 정의하지 않으면 빈 매크로입니다(`error_handler.h`). 그래서 기본 구성에서는 5번째 `push_back`이 실패하지 않고 capacity를 넘어 씁니다. 위 `etl-capacity-check.cpp`가 `-DETL_CHECK_PUSH_POP`을 주는 이유입니다. `full()`을 먼저 체크하거나, 검사 매크로와 오류 처리 정책을 함께 켭니다.

### 2. STL과 혼용
```cpp
std::vector<etl::string<32>> v;   // STL vector는 heap
```

완전히 ETL을 쓰거나, STL이 허용되는 환경에서만 섞습니다.

### 3. exception 가정
ETL 20.49.0은 compiler의 예외 설정을 보지 않습니다. `platform.h`는 `ETL_THROW_EXCEPTIONS`를 정의했을 때만 `ETL_USING_EXCEPTIONS`를 1로 두고, 그 밖에는 위의 `ETL_ASSERT` 분기(로그 callback, 사용자 assert 함수, `ETL_DEBUG`면 `assert`, 아니면 아무것도 안 함)를 탑니다. 기본값은 마지막 경우라, 아무 설정 없이 쓰면 오류를 알리지 않습니다.

### 4. 큰 N으로 .bss 폭증
```cpp
etl::vector<HugeStruct, 1000> v;
```

지역 automatic 객체라면 stack 등 automatic 저장 공간을 사용합니다. static 저장 기간 객체도 초기화 내용과 linker 배치에 따라 .bss/.data 등이 달라집니다. 측정 후 적정 N을 선택합니다.

### 5. Boost.Intrusive와 비교하지 않음
ETL은 Boost 의존성이 없는 header-only이고, Boost.Intrusive는 hook 모드·검증 hook 같은 선택지가 더 많습니다. 이 글에서는 두 라이브러리의 코드 크기를 비교하지 않았습니다.

### 6. Header-only 의존
header-only 라이브러리는 include하는 모든 TU가 헤더를 다시 파싱합니다. 이 글에서는 ETL의 컴파일 시간을 재지 않았습니다. 늘어난다면 PCH를 검토합니다([Part 2-07](/blog/embedded/embedded-cpp/part2-07-templates-cost#precompiled-headers-pch)).

## ETL의 장점 vs 단점

| 장점 | 단점 |
| --- | --- |
| Heap 0 | API가 STL과 일부 다름 |
| 동적 할당 없는 저장 정책을 선택하기 쉬움 | 지침 준수·인증은 프로젝트 근거가 별도 필요 |
| Header-only | 컴파일 시간 |
| Fixed-size 명시 | 동적 크기 불가 |
| FSM, router 포함 | 학습 곡선 |
| 최신 release 20.49.0 (2026-09-08) | 기본 구성에서 오류 검사 꺼짐 |

## 정리

- ETL은 고정 capacity 컨테이너와 임베디드 유틸리티를 제공합니다. 원소와 callback의 할당·수명은 별도 계약입니다.
- 기본 컨테이너로 `etl::vector`, `etl::string`, `etl::list`, `etl::map`, `etl::queue`를 제공합니다.
- 특수 도구로 `etl::delegate`(std::function 대체), `etl::observer`, `etl::fsm`, `etl::message_router`가 있습니다.
- 20.49.0 기본 구성은 `push_back` 경계 검사와 `ETL_ASSERT`가 꺼져 있습니다. `ETL_CHECK_PUSH_POP`과 오류 처리 매크로를 명시적으로 고릅니다.
- 측정 가능한 fixed-size이므로 `.bss` 영향을 추적할 수 있습니다.
- MIT 라이선스이며 header-only로 배포됩니다.

## 관련 항목

- [Part 3-01: 동적 할당 없이](/blog/embedded/embedded-cpp/part3-01-no-dynamic-alloc)
- [Part 4-01: Intrusive Containers](/blog/embedded/embedded-cpp/part4-01-intrusive-containers)
- [Part 4-06: State Machine](/blog/embedded/embedded-cpp/part4-06-state-machine) — etl::fsm
- [ETL website](https://www.etlcpp.com/)

## 다음 글

[Part 4-03: Lock-free 기초](/blog/embedded/embedded-cpp/part4-03-lock-free-basics) — mutex 없이 동시성. atomic, CAS, memory order.
