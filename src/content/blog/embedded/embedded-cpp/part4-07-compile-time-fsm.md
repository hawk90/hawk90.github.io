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

> **"FSM을 컴파일 타임 table로 표현합니다."** invalid 전이는 빌드 실패로 잡히고 런타임 코드는 최소가 됩니다.

## 어떤 문제를 푸는가

[Part 4-06](/blog/embedded/embedded-cpp/part4-06-state-machine)의 런타임 FSM은 유연하지만 다음과 같은 단점이 있습니다.

- Invalid 전이가 런타임에야 발견됩니다.
- 전이 table이 메모리에 올라갑니다.
- 디버깅 시 stack trace가 복잡합니다.

**Compile-time FSM**은 `constexpr`과 template을 활용해 다음을 얻습니다.

- 전이 검증을 컴파일 타임에 합니다.
- invalid 전이는 빌드 실패로 잡힙니다.
- 각 전이가 컴파일러에 의해 인라인됩니다.

```cpp
constexpr auto next = transition<State::Idle, Event::Start>();   // 컴파일 타임
// next = State::Running

constexpr auto bad = transition<State::Idle, Event::Stop>();    // 컴파일 에러
// error: invalid transition
```

런타임 코드와 데이터 모두 0이며 수 KB를 절약할 수 있습니다.

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

table은 `.rodata`에 들어가고, `next_state`는 컴파일 타임에도 호출할 수 있습니다.

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

컴파일 타임에 검증되며 invalid 전이는 `static_assert`로 잡힙니다.

## Type-based state — 각 state가 type

[Part 4-06](/blog/embedded/embedded-cpp/part4-06-state-machine)의 variant 기반 접근입니다.

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

overload resolution이 valid transition만 찾고, 없으면 `static_assert`가 실패합니다.

## Boost.SML — 정식 compile-time FSM

[Boost.SML](https://github.com/boost-ext/sml)은 정식 State Machine Library이며 DSL과 비슷한 syntax를 제공합니다.

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

장점은 다음과 같습니다.

- DSL syntax가 UML state diagram에 가깝습니다.
- 컴파일 타임에 검증됩니다.
- guard, action, sub-state machine을 지원합니다.
- meta-programming으로 최적화되어 거의 zero-cost입니다.

단점은 다음과 같습니다.

- heavy template이라 컴파일 시간이 늘어납니다.
- 학습 곡선이 있습니다.

임베디드에서 큰 FSM에 유용합니다. 작으면 직접 enum이나 variant를 씁니다.

## 임베디드 — Compile-time HSM

Hierarchical State Machine을 template으로 만드는 방법입니다.

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

구현이 복잡하므로 Boost.SML이 대부분을 처리합니다. 직접 구현은 학습 목적에만 권합니다.

## Compile-time 검증 — Unreachable state

전이 table에서 도달 불가능한 state를 찾을 수 있습니다.

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

컴파일 시점에 unreachable state를 발견할 수 있어 디자인을 검증할 수 있습니다.

## Compile-time 검증 — Dead-end state

빠져나갈 수 없는 dead state를 찾을 수도 있습니다.

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

Stopped 같은 종착 state는 의도된 dead state이므로 명시합니다. 의도하지 않은 dead state는 bug입니다.

## 자주 보는 함정과 안티패턴

### 1. 모든 FSM을 compile-time으로
런타임 동적 변경이 필요한 시스템에서는 runtime FSM이 자연스럽습니다. compile-time은 trade-off가 있는 선택입니다.

### 2. Template error message 폭증
잘못된 전이 시 에러가 수십 줄로 늘어납니다. `static_assert` 메시지를 명확히 작성합니다.

### 3. Compile time 폭증
큰 FSM의 template instantiation은 컴파일 시간이 수 분에 이를 수도 있습니다. 측정이 필요합니다.

### 4. Action 누락
전이마다 side effect(logging, action)가 따라옵니다. table에 함수 포인터나 action class를 함께 둡니다.

### 5. Guard 누락
조건부 전이가 필요한 경우 단순한 from/event/to만으로는 부족합니다. Boost.SML이 guard를 지원합니다.

### 6. Sub-machine 결합
큰 시스템에서는 sub-FSM이 필요해집니다. 직접 구현이 어렵다면 Boost.SML이나 `etl::hsm`을 씁니다.

## 측정 — Compile vs Runtime FSM

같은 5-state FSM에서 1000 event를 처리한 결과입니다.

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

Compile-time이 가장 작고 빠르지만 유연성은 낮습니다.

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

[Part 4-08: Singleton 대안](/blog/embedded/embedded-cpp/part4-08-singleton-alternatives) — 임베디드의 DI 패턴. Singleton 없이 의존성을 명확히 합니다.
