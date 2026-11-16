---
title: "임베디드 State Machine 패턴 — Variant·Visitor·Table-driven 비교"
slug: "embedded/embedded-cpp/part4-06-state-machine"
date: 2026-05-01T09:34:00
description: "타입 안전한 상태 머신 — enum + switch부터 std::variant, etl::fsm까지."
series: "Embedded C++ for Real Systems"
seriesOrder: 34
tags: [cpp, embedded, state-machine, fsm, variant, etl, type-safe]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **상태 표현과 전이 검증은 별개로 선택합니다.** enum+switch, variant+visit, table, ETL은 상태 수만으로 정하는 발전 단계가 아니라 데이터·오류 정책·외부 의존에 따른 대안입니다.

## 어떤 문제를 푸는가

임베디드는 state machine으로 가득합니다.

- TCP 연결 — Listen, Established, Closed
- 자판기 — Idle, HasMoney, Dispensing
- 프로토콜 파서 — Init, Header, Body, Trailer
- 미디어 플레이어 — Stopped, Playing, Paused

순진한 구현은 flag 변수와 if 분기에 의존합니다.

```cpp
bool is_idle = true;
bool is_playing = false;
bool is_paused = false;

void play() {
    if (is_idle) {
        is_idle = false;
        is_playing = true;
    }
    // ...복잡, 상태 invariant 깨지기 쉬움
}
```

상태 invariant가 깨지기 쉽고 전이도 모호합니다.

아래 예시는 각 방식에서 전이와 상태별 데이터를 어떻게 표현하는지 비교합니다.

## 미디어 플레이어 — 예시 FSM

이 글 전반에서 미디어 플레이어 state machine을 예시로 씁니다. 세 상태와 네 이벤트의 전이는 다음과 같습니다.

![미디어 플레이어 state machine — Stopped/Playing/Paused](/images/blog/embedded-cpp/diagrams/part4-06-state-machine.svg)

## 단계 1 — Enum + Switch

가장 기본 형태입니다. 직관적이고 코드도 짧습니다.

```cpp
enum class State { Stopped, Playing, Paused };

State current_state = State::Stopped;

void on_play() {
    switch (current_state) {
        case State::Stopped:
            start_playback();
            current_state = State::Playing;
            break;
        case State::Paused:
            // 재개는 별도 Resume event가 담당
            break;
        case State::Playing:
            // 이미 재생 중 — 무시
            break;
    }
}

void on_resume() {
    if (current_state == State::Paused) {
        resume_playback();
        current_state = State::Playing;
    }
}

void on_pause() {
    if (current_state == State::Playing) {
        pause_playback();
        current_state = State::Paused;
    }
}

void on_stop() {
    if (current_state != State::Stopped) {
        stop_playback();
        current_state = State::Stopped;
    }
}
```

장점은 다음과 같습니다.

- 작은 전이 집합을 직접 분기로 표현하기 쉽습니다.
- 디버깅이 쉽습니다.
- 언어 기능만 쓰므로 어느 코어에서도 컴파일됩니다. `Buffering`을 더한 축소판을 `-mcpu=cortex-m0plus -Os`로 컴파일하면 20바이트였고, 미정의 심볼은 전이 action 함수 하나뿐이었습니다.

단점은 다음과 같습니다.

- 전이 로직이 여러 함수에 흩어집니다.
- 새 state를 추가할 때 관련 분기와 누락 event 정책을 점검해야 합니다. `default` 없는 `switch`라면 `-Wall`이 도와줍니다. 위 `State`에 `Buffering`을 추가하고 `on_play`의 switch를 그대로 두면 g++-16과 Clang 23.1.5 모두 `warning: enumeration value 'Buffering' not handled in switch [-Wswitch]`를 냈습니다. `default:`를 두면 이 경고가 사라지므로 enum switch에는 `default`를 두지 않습니다.
- invariant 강제가 어렵습니다.

## 단계 2 — std::variant + std::visit

C++17부터 가능합니다. 각 state를 type으로 표현하므로 type system이 invariant를 강제합니다.

```cpp
#include <variant>
#include <cstdint>
#include <type_traits>

struct Stopped {};
struct Playing { uint32_t position; };
struct Paused  { uint32_t position; };

using State = std::variant<Stopped, Playing, Paused>;

State current_state = Stopped{};

State on_play(State s) {
    return std::visit([](auto&& state) -> State {
        using T = std::decay_t<decltype(state)>;
        if constexpr (std::is_same_v<T, Stopped>) {
            start_playback();
            return Playing{0};
        }
        else {
            return state;   // 이미 Playing
        }
    }, s);
}

State on_pause(State s) {
    return std::visit([](auto&& state) -> State {
        using T = std::decay_t<decltype(state)>;
        if constexpr (std::is_same_v<T, Playing>) {
            pause_playback();
            return Paused{state.position};
        }
        return state;
    }, s);
}

current_state = on_play(current_state);
current_state = on_pause(current_state);
```

장점은 다음과 같습니다.

- 각 state가 자기 데이터를 가집니다. 예를 들어 Playing은 position을 보유합니다.
- 전이가 명시적이며 함수가 새 state를 반환합니다.
- 위 fallback은 미처리 조합을 그대로 유지합니다. 새 type 누락을 컴파일 오류로 만들려면 명시적인 overload 목록이나 dependent static_assert를 포함한 별도 exhaustive 정책이 필요합니다.

단점은 다음과 같습니다.

- `std::visit + if constexpr` 조합이 약간 복잡합니다.
- 큰 state machine에서는 함수가 길어집니다.

## 임베디드 — TCP 연결 state

```cpp
struct Listen { uint16_t port; };
struct SynReceived { Conn conn; };
struct Established { Conn conn; uint32_t seq; };
struct FinWait { Conn conn; };
struct Closed {};

using TcpState = std::variant<Listen, SynReceived, Established, FinWait, Closed>;

TcpState handle_syn(TcpState s, const Packet& p) {
    return std::visit([&p](auto&& state) -> TcpState {
        using T = std::decay_t<decltype(state)>;
        if constexpr (std::is_same_v<T, Listen>) {
            return SynReceived{accept(state.port, p)};
        }
        return state;
    }, s);
}

TcpState handle_ack(TcpState s, const Packet& p) {
    return std::visit([&p](auto&& state) -> TcpState {
        using T = std::decay_t<decltype(state)>;
        if constexpr (std::is_same_v<T, SynReceived>) {
            return Established{state.conn, p.seq};
        }
        // ... 다른 state는 ack 무시
        return state;
    }, s);
}
```

variant는 가장 큰 alternative의 저장 공간과 discriminator·정렬을 포함합니다. 위 미디어 플레이어 `State`(`Stopped` 빈 struct, `Playing`·`Paused` 각 `uint32_t`)는 libstdc++·libc++ 모두 8바이트(position 4 + index + padding)였습니다. Playing과 Paused의 position을 따로 두는 enum + 멤버 설계와 비교하면, alternative가 비슷한 크기일 때는 이 차이가 작습니다.

## 단계 3 — etl::fsm

[Part 4-02](/blog/embedded/embedded-cpp/part4-02-etl-library)에서 본 ETL FSM은 대규모 FSM을 형식화할 때 적합합니다.

```cpp title="etl-media.cpp"
#include <etl/fsm.h>
#include <cassert>
#include <iostream>
struct Play : etl::message<1> {}; struct Pause : etl::message<2> {};
struct Resume : etl::message<3> {}; struct Stop : etl::message<4> {};
struct Player : etl::fsm { Player() : etl::fsm(0) {} };
struct Stopped : etl::fsm_state<Player, Stopped, 0, Play> {
    etl::fsm_state_id_t on_event(const Play&) { return 1; }
    etl::fsm_state_id_t on_event_unknown(const etl::imessage&) { return STATE_ID; }
};
struct Playing : etl::fsm_state<Player, Playing, 1, Pause, Stop> {
    etl::fsm_state_id_t on_event(const Pause&) { return 2; }
    etl::fsm_state_id_t on_event(const Stop&) { return 0; }
    etl::fsm_state_id_t on_event_unknown(const etl::imessage&) { return STATE_ID; }
};
struct Paused : etl::fsm_state<Player, Paused, 2, Resume, Stop> {
    etl::fsm_state_id_t on_event(const Resume&) { return 1; }
    etl::fsm_state_id_t on_event(const Stop&) { return 0; }
    etl::fsm_state_id_t on_event_unknown(const etl::imessage&) { return STATE_ID; }
};
int main() {
    Stopped stopped; Playing playing; Paused paused;
    etl::ifsm_state* states[] = {&stopped, &playing, &paused};
    Player player; player.set_states(states, 3); player.start();
    assert(player.get_state_id() == 0);
    player.receive(Pause{}); assert(player.get_state_id() == 0);
    player.receive(Play{}); assert(player.get_state_id() == 1);
    player.receive(Pause{}); assert(player.get_state_id() == 2);
    player.receive(Play{}); assert(player.get_state_id() == 2);
    player.receive(Resume{}); assert(player.get_state_id() == 1);
    player.receive(Stop{}); assert(player.get_state_id() == 0);
    std::cout << "etl media play/pause/resume/stop and ignored events passed\n";
}
```

ETL 20.49.0에서 세 상태를 모두 정의하고 상태 ID와 배열 순서를 맞춘 완성 예시입니다. diagram과 같이 Resume를 별도 event로 쓰며 Paused+Play는 무시합니다. 위 variant 조각도 재개를 추가하려면 별도 on_resume 전이를 구현해야 합니다.


장점은 다음과 같습니다.

- 상태와 전이가 명시적입니다.
- Type-safe event dispatch가 가능합니다.
- unknown event 처리도 명시적으로 작성합니다.
- FSM diagram에 직접 매핑됩니다.

단점은 다음과 같습니다.

- boilerplate가 많습니다.
- 작은 FSM에는 과합니다.

## 패턴 비교

| 방식 | 주된 선택 이유 | 확인할 비용과 계약 |
| --- | --- | --- |
| Enum + switch | 단순 상태와 직접 분기 | 빠진 전이·switch 경고·공유 데이터 invariant |
| Variant + visit | 상태별 데이터 type | 최대 alternative 크기·copy/move·valueless 예외 경로 |
| Table | 전이를 데이터로 비교·검증 | lookup·action·guard·중복 pair 정책 |
| ETL FSM | message/state interface와 외부 library 계약 | 고정한 판·state 수명·unknown-event·재진입 정책 |

## Hierarchical State Machine (HSM)

복잡한 시스템에서는 상태가 계층화되기도 합니다.

![HSM 계층 — Operating 하위에 Idle, Working(Reading/Writing), Error](/images/blog/embedded-cpp/diagrams/part4-06-hsm-hierarchy.svg)

`etl::hsm`이나 Boost.SML을 사용합니다. 이 글에서는 둘 다 빌드하지 않았습니다. 여러 상태가 같은 이벤트를 같은 방식으로 처리할 때(위 그림의 Error 전이처럼) 계층이 중복을 줄이고, 그런 공유 전이가 없으면 flat FSM으로 충분합니다.

## 임베디드 — Compile-time FSM

이처럼 loop를 사용하는 constexpr 함수는 C++14부터 표현할 수 있습니다. 아래 완성 table 예시는 C++17로 검증했으며 C++23을 요구하지 않습니다.

```cpp title="media-table.cpp"
#include <cassert>
#include <iostream>
enum class State { Stopped, Playing, Paused };
enum class Event { Play, Pause, Resume, Stop };
struct Transition { State from; Event event; State to; };
constexpr Transition transitions[] = {
    {State::Stopped, Event::Play, State::Playing},
    {State::Playing, Event::Pause, State::Paused},
    {State::Playing, Event::Stop, State::Stopped},
    {State::Paused, Event::Resume, State::Playing},
    {State::Paused, Event::Stop, State::Stopped},
};
constexpr State next_state(State current, Event event) {
    for (const auto& t : transitions) if (t.from == current && t.event == event) return t.to;
    return current;
}
static_assert(next_state(State::Stopped, Event::Play) == State::Playing);
static_assert(next_state(State::Paused, Event::Play) == State::Paused);
int main() {
    State state = State::Stopped;
    for (auto event : {Event::Play, Event::Pause, Event::Resume, Event::Stop}) state = next_state(state, event);
    assert(state == State::Stopped);
    assert(next_state(state, Event::Resume) == state);
    std::cout << "table media sequence and unknown transition passed\n";
}
```

상태 전이를 table로 만들어 데이터로 다루면 검증이 쉽고, 새 전이도 table에 한 줄만 추가하면 됩니다.

자세한 compile-time FSM은 [Part 4-07](/blog/embedded/embedded-cpp/part4-07-compile-time-fsm)에서 다룹니다.

## State machine + Logging

각 전이를 자동으로 로깅할 수 있습니다.

```cpp
template<typename FsmType>
void transition(FsmType& fsm, StateId from, StateId to, const char* event) {
    log_info("FSM transition: %s -> %s on %s",
             to_string(from), to_string(to), event);
    fsm.state = to;
}
```

모든 전이가 이 함수를 지나므로, 로그만으로 현장에서 어떤 이벤트 순서로 어느 상태에 도달했는지 재구성할 수 있습니다.

## 자주 보는 함정과 안티패턴

### 1. State invariant 깨짐
```cpp
bool playing = false;
bool paused = false;
playing = true;
paused = true;   // 둘 다 true? — 불가능한 상태
```

single enum이나 variant로 invariant를 강제합니다.

### 2. 전이 로직이 흩어짐
```cpp
void on_play() { state = ...; }
void on_pause() { state = ...; }
void on_other() { state = ...; }
// 한곳에 모이지 않음
```

FSM 패턴으로 전이를 중앙화합니다.

### 3. Unhandled event
```cpp
switch (state) {
    case A: break;
    case B: break;
    // C 처리 누락
}
```

enum class switch라면 `default` 없이 `-Wswitch`(`-Wall`에 포함)를 `-Werror`로 켜서 누락을 컴파일 오류로 만듭니다. 처리하지 않는 상태가 의도적이면 `case`를 적고 빈 `break`를 둡니다.

### 4. State에 너무 많은 데이터
모든 state가 모든 데이터를 들고 있으면 RAM이 낭비됩니다. `std::variant`로 state별 데이터를 분리합니다.

### 5. 동시 event 처리
ISR과 main이 동시에 receive하면 race가 발생합니다. mutex나 queue를 둡니다.

### 6. Hardcoded transition
새 state를 추가할 때 영향을 받는 switch와 전이 정책을 점검합니다. table을 쓰면 비교·검증을 모을 수 있지만 action·guard·중복 pair 정책이 추가로 필요합니다.

## 검증 범위와 1차 자료

`media-table.cpp`는 Homebrew Clang 23.1.5와 g++-16에서 C++17·ASan·UBSan으로 실행해 둘 다 `table media sequence and unknown transition passed`를 출력했습니다. `etl-media.cpp`는 ETL 20.49.0 release 헤더로 저장소 검증 스크립트 `scripts/verify-embedded-cpp-part4-examples.mjs 06`에서 Clang 23.1.5·ASan·UBSan으로 실행해 `etl media play/pause/resume/stop and ignored events passed`를 출력했습니다. 실제 playback action·하드웨어·board code size는 측정하지 않았습니다.

- [C++ draft: variant visitation](https://eel.is/c++draft/variant.visit) — visit가 모든 alternative에 대해 유효해야 하는 계약
- [ETL 20.49.0 fsm.h](https://github.com/ETLCPP/etl/blob/20.49.0/include/etl/fsm.h) — state array·ID·unknown event·재진입 검사
- [C++ draft: constexpr functions](https://eel.is/c++draft/dcl.constexpr) — 컴파일 타임 호출과 runtime 호출의 구분

## 정리

- enum, variant, table과 ETL은 제약에 따라 고르는 대안이며 상태 수만으로 크기·안전 순위를 정하지 않습니다.
- State invariant는 variant나 single enum으로 강제합니다.
- 전이를 한 곳에 모아 중앙화합니다.
- 상태별 데이터 표현에는 variant를 검토하고 실제 크기·이동·예외 조건을 확인합니다.
- 전이를 한 함수로 모으면 그 함수에 로그를 넣어 현장의 상태 흐름을 재구성할 수 있습니다.
- Compile-time FSM은 검증과 안전을 함께 얻습니다.

## 관련 항목

- [Part 4-02: ETL 라이브러리](/blog/embedded/embedded-cpp/part4-02-etl-library) — etl::fsm
- [Part 4-07: Compile-time FSM](/blog/embedded/embedded-cpp/part4-07-compile-time-fsm)
- [Part 3-08: No-RTTI 설계](/blog/embedded/embedded-cpp/part3-08-no-rtti-design) — std::variant
- [C++ variant 계약](https://eel.is/c++draft/variant) — 단일 활성 상태 표현의 조건

## 다음 글

[Part 4-07: Compile-time FSM](/blog/embedded/embedded-cpp/part4-07-compile-time-fsm) — constexpr FSM으로 컴파일 타임에 전이를 검증합니다.
