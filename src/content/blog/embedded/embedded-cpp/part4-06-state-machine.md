---
title: "Part 4-06: State Machine"
date: 2026-05-16T06:00:00
description: "타입 안전한 상태 머신 — enum + switch부터 std::variant, etl::fsm까지."
series: "Embedded C++ for Real Systems"
seriesOrder: 34
tags: [cpp, embedded, state-machine, fsm, variant, etl, type-safe]
type: tech
---

## 한 줄 요약

> **"State machine은 *3가지 단계*."** — enum + switch (간단), std::variant (type-safe), etl::fsm (정식).

## 어떤 문제를 푸는가

임베디드는 *state machine 가득*.

- *TCP 연결* — Listen, Established, Closed
- *자판기* — Idle, HasMoney, Dispensing
- *프로토콜 파서* — Init, Header, Body, Trailer
- *미디어 플레이어* — Stopped, Playing, Paused

순진한 구현 — *flag 변수 + if 분기*:

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

*상태 invariant 깨짐 + 전이 모호*.

State machine 패턴이 *3가지 단계*로 개선.

## 미디어 플레이어 — 예시 FSM

전체 글에서 *미디어 플레이어 state machine*을 예시로 씁니다. 세 상태와 네 이벤트의 전이는 다음과 같습니다.

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

장점:
- 가장 *작은 코드*
- 디버깅 쉬움
- *Cortex-M0+*에도 OK

단점:
- *전이 로직이 함수에 흩어짐*
- 새 state 추가 시 *모든 함수 수정*
- *invariant 강제 어려움*

## 단계 2 — std::variant + std::visit

C++17. 각 *state를 type*으로. *type system이 invariant 강제*.

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

장점:
- *각 state가 자기 데이터 보유* (Playing의 position 등)
- *전이가 명시적* — 함수가 새 state 반환
- *exhaustive check* — variant의 모든 type 처리 강제 (if constexpr 패턴)

단점:
- `std::visit + if constexpr` 약간 복잡
- 큰 state 머신은 *함수 길어짐*

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

*각 state에 필요한 데이터*. 다른 state에는 *불필요한 데이터 없음*. *RAM 절약*.

## 단계 3 — etl::fsm

[Part 4-02](/blog/embedded/embedded-cpp/part4-02-etl-library)의 ETL FSM. *대규모, 형식화*.

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

장점:
- *상태와 전이가 명시적*
- *Type-safe event dispatch*
- *unknown event 처리 명시*
- *FSM diagram에 직접 매핑*

단점:
- *boilerplate 많음*
- *작은 FSM에는 과함*

## 패턴 비교

| 패턴 | 코드 크기 | 표현력 | 적합 |
| --- | --- | --- | --- |
| Enum + switch | 가장 작음 | 낮음 | 3-5 state |
| std::variant + visit | 중간 | 높음 | 5-15 state |
| etl::fsm | 큼 | 매우 높음 | 15+ state, 형식 검증 |

## Hierarchical State Machine (HSM)

복잡한 시스템 — 상태가 *계층화*.

```text
Operating
├── Idle
├── Working
│   ├── Reading
│   └── Writing
└── Error
```

`etl::hsm` 또는 *Boost.SML*. 대부분 임베디드는 *flat FSM으로 충분*.

## 임베디드 — Compile-time FSM

C++23 *constexpr*로 *컴파일 타임 검증*.

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

*상태 전이 table을 데이터로*. 검증 용이. 새 전이 *table만 추가*.

자세한 compile-time FSM은 [Part 4-07](/blog/embedded/embedded-cpp/part4-07-compile-time-fsm).

## State machine + Logging

각 전이를 *자동 로깅*.

```cpp
template<typename FsmType>
void transition(FsmType& fsm, StateId from, StateId to, const char* event) {
    log_info("FSM transition: %s -> %s on %s",
             to_string(from), to_string(to), event);
    fsm.state = to;
}
```

production debugging에 *crucial*. *상태 흐름 추적*.

## 자주 보는 함정과 안티패턴

### 1. *State invariant 깨짐*
```cpp
bool playing = false;
bool paused = false;
playing = true;
paused = true;   // 둘 다 true? — 불가능한 상태
```
*single enum* 또는 *variant*로 강제.

### 2. *전이 로직 흩어짐*
```cpp
void on_play() { state = ...; }
void on_pause() { state = ...; }
void on_other() { state = ...; }
// 한곳에 모이지 않음
```
*FSM 패턴*으로 *전이 중앙화*.

### 3. *Unhandled event*
```cpp
switch (state) {
    case A: break;
    case B: break;
    // C 처리 누락
}
```
*default + assert* 또는 *exhaustive check*.

### 4. *State에 너무 많은 데이터*
모든 state가 *모든 데이터 보유* → RAM 낭비. *std::variant*로 *state별 데이터*.

### 5. *동시 event 처리*
ISR + main이 *동시 receive* → race. *mutex 또는 queue*.

### 6. *Hardcoded transition*
새 state 추가 시 *모든 switch 수정*. *transition table data-driven*.

## 측정 — 패턴별 코드 크기

같은 5-state FSM (STM32F4, -Os).

```text
Enum + switch:        ~400 B
std::variant + visit: ~800 B (variant 인스턴스)
etl::fsm:             ~1.6 KB (5 state class + FSM base)
```

작은 FSM은 *enum*, 큰 것은 *etl::fsm*.

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

[Part 4-07: Compile-time FSM](/blog/embedded/embedded-cpp/part4-07-compile-time-fsm) — *constexpr FSM* — 컴파일 타임에 *전이 검증*.
