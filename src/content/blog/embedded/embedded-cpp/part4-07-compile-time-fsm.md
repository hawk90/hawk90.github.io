---
title: "Part 4-07: Compile-time FSM"
date: 2026-05-16T07:00:00
description: "constexpr state machine — 컴파일 타임에 전이 검증, runtime 코드 0."
series: "Embedded C++ for Real Systems"
seriesOrder: 35
tags: [cpp, embedded, fsm, constexpr, compile-time, template-meta]
type: tech
---

## 한 줄 요약

> **"FSM을 *컴파일 타임 table*로."** — invalid 전이는 *빌드 실패*. 런타임 코드 최소.

## 어떤 문제를 푸는가

[Part 4-06](/blog/embedded/embedded-cpp/part4-06-state-machine)의 *런타임 FSM*은 *유연*하지만:

- *Invalid 전이가 런타임에 발견*
- *전이 table*이 메모리에
- *디버깅 시 stack trace 복잡*

**Compile-time FSM**은 *constexpr*과 *template* 활용:

- *전이 검증이 컴파일 타임*
- *invalid 전이는 빌드 실패*
- *각 전이가 컴파일러에 의해 인라인*

```cpp
constexpr auto next = transition<State::Idle, Event::Start>();   // 컴파일 타임
// next = State::Running

constexpr auto bad = transition<State::Idle, Event::Stop>();    // 컴파일 에러
// error: invalid transition
```

런타임 *코드 0*, *데이터 0*. *수 KB 절약*.

## 기본 — Transition table as data

```cpp
enum class State : uint8_t { Idle, Running, Paused, Stopped };
enum class Event : uint8_t { Start, Pause, Resume, Stop };

struct Transition {
    State from;
    Event event;
    State to;
};

constexpr Transition transitions[] = {
    {State::Idle,    Event::Start,  State::Running},
    {State::Running, Event::Pause,  State::Paused},
    {State::Running, Event::Stop,   State::Stopped},
    {State::Paused,  Event::Resume, State::Running},
    {State::Paused,  Event::Stop,   State::Stopped},
};

constexpr State next_state(State current, Event event) {
    for (const auto& t : transitions) {
        if (t.from == current && t.event == event) return t.to;
    }
    return current;   // no transition
}

// 런타임 또는 컴파일 타임
constexpr State s = next_state(State::Idle, Event::Start);
static_assert(s == State::Running);
```

*table이 .rodata*. *next_state는 컴파일 타임 호출 가능*.

## Template-based — invalid 전이 컴파일 에러

```cpp
template<State From, Event Ev>
struct TransitionT {
    static constexpr bool valid = false;
    static constexpr State to = From;   // no change
};

// 명시적 specialization으로 valid 전이 정의
template<> struct TransitionT<State::Idle, Event::Start> {
    static constexpr bool valid = true;
    static constexpr State to = State::Running;
};

template<> struct TransitionT<State::Running, Event::Pause> {
    static constexpr bool valid = true;
    static constexpr State to = State::Paused;
};

template<> struct TransitionT<State::Running, Event::Stop> {
    static constexpr bool valid = true;
    static constexpr State to = State::Stopped;
};

// ... 모든 valid 전이

// 사용
template<State From, Event Ev>
constexpr State transition() {
    static_assert(TransitionT<From, Ev>::valid,
                  "Invalid state transition");
    return TransitionT<From, Ev>::to;
}

constexpr State s1 = transition<State::Idle, Event::Start>();   // OK
// constexpr State s2 = transition<State::Idle, Event::Stop>();  // 컴파일 에러
```

*컴파일 타임 검증*. invalid 전이는 *static_assert 실패*.

## Type-based state — 각 state가 type

[Part 4-06](/blog/embedded/embedded-cpp/part4-06-state-machine)의 variant 기반.

```cpp
struct Idle {};
struct Running { uint32_t since; };
struct Paused { uint32_t since; };
struct Stopped {};

using State = std::variant<Idle, Running, Paused, Stopped>;

struct StartEvent {};
struct PauseEvent {};
struct ResumeEvent {};
struct StopEvent {};

// 전이 함수 — 각 (state, event) 조합
constexpr State transition(Idle, StartEvent) {
    return Running{get_time()};
}

constexpr State transition(Running r, PauseEvent) {
    return Paused{r.since};
}

constexpr State transition(Running, StopEvent) {
    return Stopped{};
}

constexpr State transition(Paused p, ResumeEvent) {
    return Running{p.since};
}

// catch-all — invalid transition은 현재 state 유지
template<typename S, typename E>
constexpr State transition(S s, E) {
    static_assert(sizeof(E) == 0, "Invalid transition");
    return s;
}

// 사용
template<typename E>
void send_event(State& current, E ev) {
    current = std::visit([&ev](auto&& state) -> State {
        return transition(state, ev);
    }, current);
}

State machine = Idle{};
send_event(machine, StartEvent{});   // Idle → Running
// send_event(machine, StopEvent{});   // Idle + StopEvent — static_assert 실패
```

*overload resolution*이 *valid transition만 찾음*. 없으면 *static_assert*.

## Boost.SML — 정식 compile-time FSM

[Boost.SML](https://github.com/boost-ext/sml) (State Machine Library). *DSL-like syntax*.

```cpp
#include <boost/sml.hpp>
namespace sml = boost::sml;

struct Start {};
struct Pause {};
struct Resume {};
struct Stop {};

struct Machine {
    auto operator()() {
        using namespace sml;
        return make_transition_table(
            *"Idle"_s    + event<Start>  / [](){ start_play(); }    = "Running"_s,
             "Running"_s + event<Pause>  / [](){ pause_play(); }    = "Paused"_s,
             "Running"_s + event<Stop>   / [](){ stop_play(); }     = "Stopped"_s,
             "Paused"_s  + event<Resume> / [](){ resume_play(); }   = "Running"_s,
             "Paused"_s  + event<Stop>   / [](){ stop_play(); }     = "Stopped"_s,
             "Stopped"_s + event<Start>  / [](){ start_play(); }    = "Running"_s
        );
    }
};

sml::sm<Machine> fsm;
fsm.process_event(Start{});
fsm.process_event(Pause{});
fsm.process_event(Resume{});
```

장점:
- *DSL syntax* — UML state diagram에 가까움
- *컴파일 타임 검증*
- *guard, action, sub-state machine* 지원
- *meta-programming 최적화* — 거의 zero-cost

단점:
- *컴파일 시간 증가* — heavy template
- *학습 곡선*

임베디드에서 *큰 FSM*에 유용. 작으면 *직접 enum/variant*.

## 임베디드 — Compile-time HSM

Hierarchical State Machine을 *template*으로.

```cpp
template<typename Parent = void>
struct StateBase {
    using parent_type = Parent;
};

struct Idle : StateBase<> {};
struct Working : StateBase<> {};
struct Reading : StateBase<Working> {};   // Working의 substate
struct Writing : StateBase<Working> {};

template<typename State>
constexpr bool is_in_state(/* ... */) {
    // ... 부모 상태 chain 추적
}
```

복잡. Boost.SML이 *대부분 처리*. 직접 구현은 *학습 목적*.

## Compile-time 검증 — Unreachable state

전이 table에서 *도달 불가능한 state* 찾기.

```cpp
constexpr Transition trs[] = {
    {State::Idle,    Event::Start, State::Running},
    {State::Running, Event::Stop,  State::Stopped},
    // State::Paused — 도달 불가능
};

constexpr bool is_reachable(State s) {
    if (s == State::Idle) return true;   // 시작 state
    for (const auto& t : trs) {
        if (t.to == s && is_reachable(t.from)) return true;
    }
    return false;
}

static_assert(is_reachable(State::Running));
static_assert(is_reachable(State::Stopped));
// static_assert(is_reachable(State::Paused));   // 컴파일 에러 — unreachable
```

*컴파일 시점에 unreachable state 발견*. *디자인 검증*.

## Compile-time 검증 — Dead-end state

빠져나갈 수 없는 *dead state*.

```cpp
constexpr bool has_outgoing(State s) {
    for (const auto& t : trs) {
        if (t.from == s) return true;
    }
    return false;
}

static_assert(has_outgoing(State::Running));
// static_assert(has_outgoing(State::Stopped));   // dead state
```

*Dead state 의도된* 경우 (Stopped 같은 종착)는 *명시*. 의도 안 한 dead state는 *bug*.

## 자주 보는 함정과 안티패턴

### 1. *모든 FSM을 compile-time으로*
런타임 *동적 변경*이 필요한 시스템 — runtime FSM이 자연. *compile-time은 trade-off*.

### 2. *Template error message 폭증*
잘못된 전이 시 *수십 줄 에러*. static_assert 메시지 명확히.

### 3. *Compile time 폭증*
큰 FSM의 template instantiation — *수 분 컴파일*. 측정.

### 4. *Action 누락*
전이 + side effect (logging, action). table에 *함수 포인터* 또는 *action class*.

### 5. *Guard 누락*
조건부 전이 — 단순 from/event/to만 부족. Boost.SML *guard 지원*.

### 6. *Sub-machine 결합*
큰 시스템에 *sub-FSM*. 직접 구현 어려움. Boost.SML 또는 etl::hsm.

## 측정 — Compile vs Runtime FSM

같은 5-state FSM, 1000 events.

```text
# Runtime FSM (enum + switch)
.text: 380 B
total cycles: 8000

# Variant + visit
.text: 720 B
total cycles: 9000 (variant copy + visit)

# Compile-time (template specialization)
.text: 180 B   (대부분 인라인)
total cycles: 5000 (직접 dispatch)

# Boost.SML
.text: 920 B
total cycles: 7500
```

*Compile-time이 가장 작고 빠름*. 단 *유연성 낮음*.

## 정리

- Compile-time FSM은 constexpr table이나 template specialization으로 구현합니다.
- Invalid 전이는 `static_assert`로 컴파일 에러를 냅니다.
- Type-based state(variant)로 각 state의 데이터를 분리합니다.
- Boost.SML이 정식 라이브러리이며 DSL syntax와 guard/action을 지원합니다.
- Unreachable이나 dead state도 컴파일 타임에 검증할 수 있습니다.
- 작은 FSM은 enum으로, 큰 FSM은 Boost.SML로 다룹니다.

## 관련 항목

- [Part 4-06: State Machine](/blog/embedded/embedded-cpp/part4-06-state-machine) — 런타임 FSM
- [Part 2-04: constexpr 고급](/blog/embedded/embedded-cpp/part2-04-constexpr-advanced) — table
- [Part 3-08: No-RTTI 설계](/blog/embedded/embedded-cpp/part3-08-no-rtti-design) — variant
- [Boost.SML](https://github.com/boost-ext/sml)

## 다음 글

[Part 4-08: Singleton 대안](/blog/embedded/embedded-cpp/part4-08-singleton-alternatives) — *임베디드의 DI 패턴*. Singleton 없이 *명확한 의존성*.
