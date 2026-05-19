---
title: "Part 4-06: State Machine"
date: 2026-05-07T06:00:00
description: "타입 안전한 상태 머신 — enum + switch부터 std::variant, etl::fsm까지."
series: "Embedded C++ for Real Systems"
seriesOrder: 34
tags: [cpp, embedded, state-machine, fsm, variant, etl, type-safe]
type: tech
---

## 한 줄 요약

> **"State machine은 세 단계로 발전합니다."** enum + switch는 간단하고, `std::variant`는 type-safe하며, `etl::fsm`은 정식 구현입니다.

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

State machine 패턴은 세 단계로 점진적으로 개선합니다.

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
            resume_playback();
            current_state = State::Playing;
            break;
        case State::Playing:
            // 이미 재생 중 — 무시
            break;
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

- 가장 적은 코드로 구현할 수 있습니다.
- 디버깅이 쉽습니다.
- Cortex-M0+에서도 동작합니다.

단점은 다음과 같습니다.

- 전이 로직이 여러 함수에 흩어집니다.
- 새 state를 추가하면 모든 함수를 수정해야 합니다.
- invariant 강제가 어렵습니다.

## 단계 2 — std::variant + std::visit

C++17부터 가능합니다. 각 state를 type으로 표현하므로 type system이 invariant를 강제합니다.

```cpp
#include <variant>

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
        else if constexpr (std::is_same_v<T, Paused>) {
            resume_playback(state.position);
            return Playing{state.position};
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
- `if constexpr` 패턴으로 variant의 모든 type을 처리하도록 강제할 수 있어 exhaustive check가 가능합니다.

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

각 state에 필요한 데이터만 두고 다른 state에는 두지 않으므로 RAM이 절약됩니다.

## 단계 3 — etl::fsm

[Part 4-02](/blog/embedded/embedded-cpp/part4-02-etl-library)에서 본 ETL FSM은 대규모 FSM을 형식화할 때 적합합니다.

```cpp
#include <etl/fsm.h>

// Event 정의
class PlayEvent  : public etl::message<1> {};
class PauseEvent : public etl::message<2> {};
class StopEvent  : public etl::message<3> {};

// State ID
enum class StateId : etl::fsm_state_id_t {
    Stopped,
    Playing,
    Paused,
};

// FSM 클래스
class MediaPlayerFsm : public etl::fsm {
public:
    MediaPlayerFsm() : fsm(0) {}
    void log_transition(const char* msg) { /* */ }
};

// State 구현
class StoppedState : public etl::fsm_state<MediaPlayerFsm, StoppedState,
                                              (etl::fsm_state_id_t)StateId::Stopped,
                                              PlayEvent> {
public:
    etl::fsm_state_id_t on_event(const PlayEvent&) {
        get_fsm_context().log_transition("Stopped → Playing");
        start_playback();
        return (etl::fsm_state_id_t)StateId::Playing;
    }

    etl::fsm_state_id_t on_event_unknown(const etl::imessage&) {
        return STATE_ID;
    }
};

class PlayingState : public etl::fsm_state<MediaPlayerFsm, PlayingState,
                                              (etl::fsm_state_id_t)StateId::Playing,
                                              PauseEvent, StopEvent> {
public:
    etl::fsm_state_id_t on_event(const PauseEvent&) {
        pause_playback();
        return (etl::fsm_state_id_t)StateId::Paused;
    }

    etl::fsm_state_id_t on_event(const StopEvent&) {
        stop_playback();
        return (etl::fsm_state_id_t)StateId::Stopped;
    }

    etl::fsm_state_id_t on_event_unknown(const etl::imessage&) {
        return STATE_ID;
    }
};

// 사용
StoppedState stopped;
PlayingState playing;
PausedState paused;

etl::ifsm_state* states[] = {&stopped, &playing, &paused};

MediaPlayerFsm fsm;
fsm.set_states(states, etl::size(states));
fsm.start();

fsm.receive(PlayEvent{});
fsm.receive(PauseEvent{});
fsm.receive(StopEvent{});
```

장점은 다음과 같습니다.

- 상태와 전이가 명시적입니다.
- Type-safe event dispatch가 가능합니다.
- unknown event 처리도 명시적으로 작성합니다.
- FSM diagram에 직접 매핑됩니다.

단점은 다음과 같습니다.

- boilerplate가 많습니다.
- 작은 FSM에는 과합니다.

## 패턴 비교

| 패턴 | 코드 크기 | 표현력 | 적합 |
| --- | --- | --- | --- |
| Enum + switch | 가장 작음 | 낮음 | 3-5 state |
| std::variant + visit | 중간 | 높음 | 5-15 state |
| etl::fsm | 큼 | 매우 높음 | 15+ state, 형식 검증 |

## Hierarchical State Machine (HSM)

복잡한 시스템에서는 상태가 계층화되기도 합니다.

```text
Operating
├── Idle
├── Working
│   ├── Reading
│   └── Writing
└── Error
```

`etl::hsm`이나 Boost.SML을 사용합니다. 대부분의 임베디드는 flat FSM으로 충분합니다.

## 임베디드 — Compile-time FSM

C++23의 `constexpr`로 컴파일 타임에 검증할 수 있습니다.

```cpp
// transition table — 컴파일 타임 데이터
struct Transition {
    StateId from;
    EventId event;
    StateId to;
};

constexpr Transition transitions[] = {
    {StateId::Stopped, EventId::Play,  StateId::Playing},
    {StateId::Playing, EventId::Pause, StateId::Paused},
    {StateId::Playing, EventId::Stop,  StateId::Stopped},
    {StateId::Paused,  EventId::Play,  StateId::Playing},
    {StateId::Paused,  EventId::Stop,  StateId::Stopped},
};

constexpr StateId next_state(StateId current, EventId event) {
    for (const auto& t : transitions) {
        if (t.from == current && t.event == event) return t.to;
    }
    return current;
}

// 런타임 또는 컴파일 타임
constexpr StateId s1 = next_state(StateId::Stopped, EventId::Play);
static_assert(s1 == StateId::Playing);

StateId state = StateId::Stopped;
state = next_state(state, EventId::Play);
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

production debugging에서 상태 흐름을 추적할 때 매우 유용합니다.

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

default + assert를 추가하거나 exhaustive check를 강제합니다.

### 4. State에 너무 많은 데이터
모든 state가 모든 데이터를 들고 있으면 RAM이 낭비됩니다. `std::variant`로 state별 데이터를 분리합니다.

### 5. 동시 event 처리
ISR과 main이 동시에 receive하면 race가 발생합니다. mutex나 queue를 둡니다.

### 6. Hardcoded transition
새 state를 추가할 때 모든 switch를 수정해야 하므로 transition table을 data-driven으로 만듭니다.

## 측정 — 패턴별 코드 크기

같은 5-state FSM 기준입니다 (STM32F4, -Os).

```text
Enum + switch:        ~400 B
std::variant + visit: ~800 B (variant 인스턴스)
etl::fsm:             ~1.6 KB (5 state class + FSM base)
```

작은 FSM에는 enum이, 큰 FSM에는 `etl::fsm`이 적합합니다.

## 정리

- State machine은 세 단계로 발전합니다 — enum+switch(작음), variant(type-safe), etl::fsm(formal).
- State invariant는 variant나 single enum으로 강제합니다.
- 전이를 한 곳에 모아 중앙화합니다.
- State별 데이터를 다룰 때는 variant가 최적입니다.
- Logging을 통합하면 production debugging이 가능합니다.
- Compile-time FSM은 검증과 안전을 함께 얻습니다.

## 관련 항목

- [Part 4-02: ETL 라이브러리](/blog/embedded/embedded-cpp/part4-02-etl-library) — etl::fsm
- [Part 4-07: Compile-time FSM](/blog/embedded/embedded-cpp/part4-07-compile-time-fsm)
- [Part 3-08: No-RTTI 설계](/blog/embedded/embedded-cpp/part3-08-no-rtti-design) — std::variant
- [GoF 20: State](/blog/programming/design/gof-design-patterns/item20-state)

## 다음 글

[Part 4-07: Compile-time FSM](/blog/embedded/embedded-cpp/part4-07-compile-time-fsm) — constexpr FSM으로 컴파일 타임에 전이를 검증합니다.
