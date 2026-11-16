---
title: "Compile-time FSM 구현 — 템플릿으로 상태 전이 검증"
slug: "embedded/embedded-cpp/part4-07-compile-time-fsm"
date: 2026-05-01T09:35:00
description: "constexpr state machine — 컴파일 타임 전이 검증과 runtime dispatch의 역할을 구분합니다."
series: "Embedded C++ for Real Systems"
seriesOrder: 35
tags: [cpp, embedded, fsm, constexpr, compile-time, template-meta]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **고정된 전이 규칙은 컴파일 타임에 검증하고, 런타임에 들어오는 event는 런타임 코드가 처리합니다.** template 인자로 고정한 잘못된 전이와 runtime에 입력되는 잘못된 event를 구분합니다.

## 어떤 문제를 푸는가

[Part 4-06](/blog/embedded/embedded-cpp/part4-06-state-machine)의 런타임 FSM은 유연하지만 다음과 같은 단점이 있습니다.

- Invalid 전이가 런타임에야 발견됩니다.
- 런타임에 조회하는 전이 table은 읽기 전용 데이터로 이미지에 남습니다.

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

전체 연산이 상수 평가되고 결과만 사용되면 실행 시 계산이 남지 않습니다. runtime state·event·action이 있는 FSM의 코드와 저장 공간이 0이라는 뜻은 아닙니다. 아래 table 예제에서 그 차이를 잽니다.

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

arm-none-eabi-g++ 16.2.0 `-mcpu=cortex-m4 -Os`로 컴파일해 보면 쓰는 방식에 따라 결과가 갈립니다. 위처럼 `static_assert`에서만 `next_state`를 쓰면 오브젝트의 `.text`가 0바이트이고 `.rodata`도 없었습니다. 같은 파일에 런타임 인자로 부르는 `State step(State s, Event e) { return next_state(s, e); }`를 더하면 `.text` 36바이트와 `.rodata` 15바이트(전이 5개 × 3바이트)가 생겼습니다.

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

컴파일 타임에 검증되며 invalid 전이는 `static_assert`로 잡힙니다. 아래 재현 절의 `checked_transition<State::Idle, Event::Stop>()`에 g++-16은 `error: static assertion failed: Invalid state transition`을 냈고, 출력 전체가 8줄이었습니다.

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
State transition(Idle, StartEvent) {
    return Running{get_time()};
}

State transition(Running r, PauseEvent) {
    return Paused{r.since};
}

State transition(Running, StopEvent) {
    return Stopped{};
}

State transition(Paused p, ResumeEvent) {
    return Running{p.since};
}

// runtime 정책: 미정의 (state, event)는 현재 state 유지
template<typename S, typename E>
State transition(S s, E) {
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
send_event(machine, StopEvent{});   // 현재 state에 전이가 없으면 유지
```

std::visit는 현재 활성 alternative뿐 아니라 모든 alternative와 event 조합에 대해 visitor가 유효해야 합니다. catch-all에 무조건 실패하는 static_assert를 두면 정상 Start event도 다른 state 조합 때문에 컴파일 실패합니다. 이 예시는 fallback을 상태 유지로 정하고, 전이가 없는 조합을 정적으로 금지하려면 앞의 template 인자 API처럼 호출 시 state도 type/value로 고정합니다. get_time은 runtime 함수이므로 해당 전이를 constexpr라고 표시하지 않습니다.

## 재현 — visit의 모든 alternative 검사

```cpp title="variant-visit.cpp"
#include <variant>
#include <cassert>
#include <iostream>
struct Idle {}; struct Running {}; struct Start {}; struct Stop {};
using MachineState = std::variant<Idle, Running>;
MachineState step(Idle, Start) { return Running{}; }
MachineState step(Running, Stop) { return Idle{}; }
template<typename S, typename E> MachineState step(S state, E) {
#ifdef BAD_VISIT_FALLBACK
    static_assert(sizeof(E) == 0, "Unhandled variant alternative");
#endif
    return state;
}
template<typename E> void send(MachineState& current, E event) {
    current = std::visit([&](auto state) { return step(state, event); }, current);
}
int main() {
    MachineState state = Idle{};
    send(state, Stop{}); assert(std::holds_alternative<Idle>(state));
    send(state, Start{}); assert(std::holds_alternative<Running>(state));
    send(state, Start{}); assert(std::holds_alternative<Running>(state));
    send(state, Stop{}); assert(std::holds_alternative<Idle>(state));
    std::cout << "variant fallback keeps invalid runtime state/event passed\n";
}
```

정상 fallback은 미정의 조합을 유지합니다. BAD_VISIT_FALLBACK을 정의하면 실제 현재 상태와 관계없이 std::visit가 검사하는 다른 alternative에서 static_assert가 실패합니다. 이를 compile-time invalid 전이와 runtime 오류 정책의 차이로 확인합니다.

## Boost.SML — 외부 compile-time FSM

[Boost.SML](https://github.com/boost-ext/sml)은 외부 State Machine Library이며 DSL과 비슷한 syntax를 제공합니다.

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

이 글에서는 Boost.SML을 설치·빌드하지 않았습니다. 아래 장단점은 저장소 README의 설명입니다.

장점은 다음과 같습니다.

- DSL syntax가 UML state diagram에 가깝습니다.
- 컴파일 타임에 검증됩니다.
- guard, action, sub-state machine을 지원합니다.
- 고정된 전이 구조를 compiler가 최적화할 수 있습니다. 실제 dispatch·action·state 저장 공간은 별도로 남습니다.

단점은 다음과 같습니다.

- template 기반이라 컴파일러가 처리할 인스턴스가 많습니다.
- 학습 곡선이 있습니다.

guard·action·sub-machine이 필요하면 SML 같은 library가 직접 구현할 양을 줄이고, 전이 몇 개짜리라면 위 table이나 enum으로 충분합니다.

## 임베디드 — Compile-time HSM

다음은 상태의 부모 type 관계만 표현하는 설계 조각입니다. 동작 가능한 HSM이나 부모 탐색 구현은 아닙니다.

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
constexpr bool is_in_state();  // 부모 탐색은 여기서 구현하지 않음
```

실제 HSM은 event 전파·entry/exit·부모 전이 규칙까지 구현해야 하므로, Boost.SML의 sub-machine이나 `etl::hsm` 같은 library를 쓰고 선택한 판에서 검증합니다.

## 재현 — 전이 오류와 cycle을 포함한 도달성 검사

단순 recursive reachability는 graph에 cycle이 있으면 종료하지 않을 수 있습니다. 아래는 방문 집합을 유한 횟수 갱신해 graph cycle을 처리합니다. entry state에서 도달 가능한지와 의도한 terminal state인지를 따로 검사합니다.

```cpp title="compile-fsm.cpp"
#include <cstddef>
#include <cassert>
#include <iostream>
enum class State : std::size_t { Idle, Running, Paused, Stopped, Orphan, Count };
enum class Event { Start, Pause, Resume, Stop };
struct Edge { State from; Event event; State to; };
constexpr Edge edges[] = {
    {State::Idle, Event::Start, State::Running},
    {State::Running, Event::Pause, State::Paused},
    {State::Paused, Event::Resume, State::Running},
    {State::Running, Event::Stop, State::Stopped},
    {State::Paused, Event::Stop, State::Stopped},
};
constexpr State next(State from, Event event) {
    for (auto edge : edges) if (edge.from == from && edge.event == event) return edge.to;
    return from;
}
template<State From, Event Ev> constexpr State checked_transition() {
    constexpr State to = next(From, Ev);
    // 이 예시는 self-transition이 없는 graph를 전제로 합니다.
    static_assert(to != From, "Invalid state transition");
    return to;
}
constexpr bool reachable(State target) {
    constexpr auto count = static_cast<std::size_t>(State::Count);
    if (static_cast<std::size_t>(target) >= count) return false;
    bool seen[count]{}; seen[0] = true;
    for (std::size_t round = 0; round < count; ++round)
        for (auto edge : edges) if (seen[static_cast<std::size_t>(edge.from)]) seen[static_cast<std::size_t>(edge.to)] = true;
    return seen[static_cast<std::size_t>(target)];
}
constexpr bool has_outgoing(State state) {
    for (auto edge : edges) if (edge.from == state) return true;
    return false;
}
static_assert(checked_transition<State::Idle, Event::Start>() == State::Running);
static_assert(reachable(State::Paused) && reachable(State::Stopped));
static_assert(!reachable(State::Orphan));
static_assert(!has_outgoing(State::Stopped));
#ifdef BAD_TRANSITION
constexpr auto bad = checked_transition<State::Idle, Event::Stop>();
#endif
#ifdef BAD_REACHABILITY
static_assert(reachable(State::Orphan), "Unreachable state");
#endif
int main() {
    State state = State::Idle;
    for (auto event : {Event::Start, Event::Pause, Event::Resume, Event::Stop}) state = next(state, event);
    assert(state == State::Stopped);
    std::cout << "compile-time checks and runtime event sequence passed\n";
}
```

이 graph에는 self-transition이 없으므로 next==from을 미정의 전이로 판정합니다. self-transition을 추가한다면 별도의 found/valid 값을 반환해야 합니다. graph 자체가 고정된 유효 enum 값으로 구성된 예시이며 외부 입력으로 table을 생성할 때는 index 범위와 중복 (from,event)도 검증합니다.

## 자주 보는 함정과 안티패턴

### 1. 모든 FSM을 compile-time으로
런타임 동적 변경이 필요한 시스템에서는 runtime FSM이 자연스럽습니다. compile-time은 trade-off가 있는 선택입니다.

### 2. Template error message 폭증
`static_assert` 하나가 실패하면 출력은 짧습니다(g++-16에서 `BAD_TRANSITION` 8줄, `BAD_REACHABILITY` 3줄). 길어지는 것은 `std::visit` 쪽입니다. 아래 `BAD_VISIT_FALLBACK`은 g++-16에서 75줄(Clang 23.1.5에서 25줄)이었고, 활성 state와 무관하게 `step<Idle, Stop>` 같은 조합마다 `static assertion failed due to requirement 'sizeof(Stop) == 0'`이 반복됐습니다. `static_assert` 메시지에 어떤 조합인지 드러나게 적습니다.

### 3. Compile time 폭증
state × event 조합마다 template이 하나씩 인스턴스화되므로 조합 수에 비례해 컴파일러 작업이 늘어납니다. 이 글에서는 큰 FSM의 컴파일 시간을 재지 않았습니다.

### 4. Action 누락
전이마다 side effect(logging, action)가 따라옵니다. table에 함수 포인터나 action class를 함께 둡니다.

### 5. Guard 누락
조건부 전이가 필요한 경우 단순한 from/event/to만으로는 부족합니다. Boost.SML이 guard를 지원합니다.

### 6. Sub-machine 결합
큰 시스템에서는 sub-FSM이 필요해집니다. 직접 구현이 어렵다면 Boost.SML이나 `etl::hsm`을 씁니다.

## 검증 범위와 1차 자료

Homebrew Clang 23.1.5와 g++-16에서 C++17·ASan·UBSan으로 `compile-fsm.cpp`와 `variant-visit.cpp`를 실행했고 둘 다 정상 메시지를 출력했습니다. cycle이 있는 Running↔Paused graph의 도달성, terminal Stopped, 고립 Orphan, runtime event sequence를 확인했습니다. BAD_TRANSITION과 BAD_REACHABILITY는 각각 의도한 static_assert 실패입니다. runtime dispatch·action의 크기와 board cycle 수는 측정하지 않았습니다.

- [C++ draft constexpr](https://eel.is/c++draft/dcl.constexpr) — 상수 평가 가능한 함수와 실제 runtime 호출 구분
- [variant visitation](https://eel.is/c++draft/variant.visit) — 모든 alternative에 대한 호출 유효성
- [Boost.SML repository](https://github.com/boost-ext/sml) — 외부 library 설명. 이 글에서는 SML 버전을 설치·빌드하지 않았습니다.

## 정리

- Compile-time FSM은 constexpr table이나 template specialization으로 구현합니다.
- 호출 시 state/event가 template 인자로 고정된 잘못된 전이는 static_assert로 막고 runtime event는 별도 오류 정책을 둡니다.
- Type-based state(variant)로 각 state의 데이터를 분리합니다.
- Boost.SML 같은 외부 library는 전이 DSL과 guard/action의 표현을 제공하며 실제 채택 판에서 검증합니다.
- Unreachable이나 dead state도 컴파일 타임에 검증할 수 있습니다.
- guard·action·계층이 없는 FSM은 constexpr table로 충분하고, 그런 기능이 필요할 때 Boost.SML 같은 library를 검토합니다.

## 관련 항목

- [Part 4-06: State Machine](/blog/embedded/embedded-cpp/part4-06-state-machine) — 런타임 FSM
- [Part 2-04: constexpr 고급](/blog/embedded/embedded-cpp/part2-04-constexpr-advanced) — table
- [Part 3-08: No-RTTI 설계](/blog/embedded/embedded-cpp/part3-08-no-rtti-design) — variant
- [Boost.SML](https://github.com/boost-ext/sml)

## 다음 글

[Part 4-08: Singleton 대안](/blog/embedded/embedded-cpp/part4-08-singleton-alternatives) — 임베디드의 DI 패턴. Singleton 없이 의존성을 명확히 합니다.
