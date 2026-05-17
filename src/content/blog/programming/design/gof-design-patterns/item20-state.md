---
title: "GoF 20: State"
date: 2026-02-01T20:00:00
description: "객체의 내부 상태에 따라 동작이 변하도록 — if/switch 대신 상태 객체."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 20
draft: false
---

## 한 줄 요약

> **"상태마다 다른 동작 → 상태마다 다른 클래스"** — switch 폭탄 대신 다형성.

## 어떤 문제를 푸는가

객체의 동작이 **내부 상태**에 따라 다릅니다.

- TCP 연결 — Listen, Established, Closed
- 자판기 — Idle, HasMoney, Dispensing
- 게임 캐릭터 — Idle, Running, Attacking, Dead
- 미디어 플레이어 — Stopped, Playing, Paused

순진하게 짜면 모든 메서드가 `switch (state)` 폭탄.

```cpp
// Bad: 모든 메서드에 같은 switch
class VendingMachine {
    enum State { Idle, HasCoin, Dispensing } state;
public:
    void insertCoin() {
        switch (state) {
            case Idle: state = HasCoin; break;
            case HasCoin: /* error */ break;
            case Dispensing: /* wait */ break;
        }
    }
    void selectItem() {
        switch (state) { /* 같은 switch 또 */ }
    }
    void dispense() {
        switch (state) { /* 또 또 */ }
    }
};
// 상태 추가 시 모든 switch 수정 (OCP 위배)
```

State 패턴은 **상태별 동작을 별도 클래스로**.

```cpp
machine.insertCoin();   // 현재 state 객체에 위임 → 상태가 동작 결정
```

새 상태 추가 = 새 State 클래스 + 전이 갱신. 기존 상태는 안 건드림.

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item20-state.svg" alt="State 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

각 상태가 자신의 동작을 알고, **다음 상태로 전이**도 결정.

## 언제 쓰면 좋은가

- 객체 동작이 자신의 상태에 의존하고, 런타임에 동작이 변경되어야 할 때
- 객체 상태에 따른 분기를 가진 **거대한 조건문**이 있을 때
- 상태 전이 규칙이 **명시적**이어야 할 때

## 언제 쓰면 안 되나

> ⚠️ **상태가 2~3개**라면 그냥 enum + switch가 단순.

> ⚠️ **상태별 클래스 폭증** — `std::variant`로 closed set 대안 검토.

> ⚠️ **상태 그래프가 빽빽하게 다 연결**이면 State 클래스가 서로 의존 — table 기반 FSM이 나을 수도.

## C++ 구현 — 자판기

### 1. State 인터페이스

```cpp
class VendingMachine;

class State {
public:
    virtual ~State() = default;
    virtual void insertCoin(VendingMachine&) = 0;
    virtual void selectItem(VendingMachine&) = 0;
    virtual void dispense(VendingMachine&)   = 0;
};
```

### 2. Context — 현재 state에 위임

```cpp
class VendingMachine {
    std::unique_ptr<State> state;
public:
    explicit VendingMachine(std::unique_ptr<State> s) : state(std::move(s)) {}

    void changeState(std::unique_ptr<State> s) { state = std::move(s); }

    void insertCoin() { state->insertCoin(*this); }    // ◄── state에 위임
    void selectItem() { state->selectItem(*this); }
    void dispense()   { state->dispense(*this);   }
};
```

### 3. ConcreteState들 — 자체 전이 결정

```cpp
class IdleState : public State {
public:
    void insertCoin(VendingMachine& m) override {
        std::cout << "coin accepted\n";
        m.changeState(std::make_unique<HasCoinState>());   // ◄── 다음 상태로
    }
    void selectItem(VendingMachine&) override { std::cout << "insert coin first\n"; }
    void dispense(VendingMachine&)   override { std::cout << "insert coin first\n"; }
};

class HasCoinState : public State {
public:
    void insertCoin(VendingMachine&) override { std::cout << "already has coin\n"; }
    void selectItem(VendingMachine& m) override {
        std::cout << "dispensing\n";
        m.changeState(std::make_unique<DispensingState>());
    }
    void dispense(VendingMachine&) override { std::cout << "select first\n"; }
};

class DispensingState : public State {
public:
    void insertCoin(VendingMachine&) override { std::cout << "wait\n"; }
    void selectItem(VendingMachine&) override { std::cout << "wait\n"; }
    void dispense(VendingMachine& m) override {
        std::cout << "item dispensed\n";
        m.changeState(std::make_unique<IdleState>());
    }
};
```

### 4. 사용

```cpp
VendingMachine vm(std::make_unique<IdleState>());
vm.insertCoin();   // → HasCoinState
vm.selectItem();   // → DispensingState
vm.dispense();     // → IdleState
```

자연스러운 FSM. **상태별 동작과 전이가 한 클래스에**.

## 자주 보는 안티패턴

### 1. State가 Context의 private에 접근 (friend 폭증)

```cpp
class VendingMachine {
    friend class IdleState;
    friend class HasCoinState;
    friend class DispensingState;
    // ... 새 상태마다 friend 추가
    int coinCount;
};
```

**문제**: 새 상태 추가 시 Context 수정 → OCP 위배.

**해결**: State가 필요한 만큼만 public 인터페이스로 노출. 또는 Context에 protected accessor.

### 2. 전이 도중 self 해제 (use-after-free)

```cpp
// Bad
void IdleState::insertCoin(VendingMachine& m) {
    m.changeState(std::make_unique<HasCoinState>());   // ◄── 자신 해제
    this->doSomething();   // ◄── use-after-free
}
```

**문제**: `changeState`가 현재 state를 unique_ptr로 교체 → this 무효.

**해결**: state 전환을 *메서드 끝*에서. 또는 deferred change (다음 tick에 적용).

### 3. State마다 Context 포인터 보유 (양방향 결합)

```cpp
// Bad
class State {
    VendingMachine* context;   // ◄── 양방향
public:
    State(VendingMachine* c) : context(c) {}
};
```

**문제**: state 객체가 context 없이 못 만들어짐. 재사용·테스트 어려움. lifetime 얽힘.

**해결**: 메서드 인자로 context 받기 (위 예제처럼). state는 stateless로.

### 4. 전이 규칙이 흩어짐 (어디서 어디로 가는지 모름)

```cpp
// Bad: 전이가 모든 State 안 흩어짐
// IdleState에서 HasCoin, HasCoin에서 Dispensing, ...
// 전체 그래프를 보려면 모든 클래스 읽어야
```

**문제**: FSM 그래프가 코드에 흩어져 그림으로 그릴 수 없음.

**해결**: 전이 테이블 + Context가 전이 일괄 관리. 또는 다이어그램을 코드 옆에 주석.

### 5. State에 mutable 상태 (공유 + race)

```cpp
// Bad: 같은 state 인스턴스를 Context들이 공유 + 카운터
class IdleState : public State {
    int callCount = 0;   // ◄── 인스턴스마다 다름
public:
    void insertCoin(...) override { ++callCount; /* ... */ }
};
```

**문제**: state를 stateless로 의도했는데 mutable이 있으면 race / 잘못된 카운트.

**해결**: state는 stateless 객체로. 진짜 카운트는 Context에. 또는 stateless면 Singleton.

### 6. 상태별 클래스 폭증 (1000개 상태)

```cpp
class State1 : public State { /* ... */ };
class State2 : public State { /* ... */ };
// ... State1000
```

**문제**: 상태가 도메인적으로 그렇게 많을 수가. 디자인 점검 필요.

**해결**:
- 상태를 *분할* (sub-state machine, hierarchical FSM)
- 또는 data-driven (transition table)
- 또는 *상태 합성* (orthogonal states)

## Modern C++ 변형

### 1. `std::variant` (closed state set)

가상 함수 없이 closed state set 표현.

```cpp
struct Idle {};
struct HasCoin {};
struct Dispensing {};

using State = std::variant<Idle, HasCoin, Dispensing>;

class VendingMachine {
    State state = Idle{};
public:
    void insertCoin() {
        std::visit([this](auto& s) {
            using T = std::decay_t<decltype(s)>;
            if constexpr (std::is_same_v<T, Idle>) {
                state = HasCoin{};
            }
            // 나머지는 무시 (또는 invalid 처리)
        }, state);
    }
};
```

컴파일 타임에 모든 상태 검사. 가상 호출 없음.

### 2. Transition table (data-driven FSM)

```cpp
enum class Event { Insert, Select, Dispense };
enum class State { Idle, HasCoin, Dispensing };

struct Transition { State from; Event ev; State to; };

constexpr Transition table[] = {
    {State::Idle,        Event::Insert,   State::HasCoin},
    {State::HasCoin,     Event::Select,   State::Dispensing},
    {State::Dispensing,  Event::Dispense, State::Idle},
};

State next(State cur, Event ev) {
    for (auto& t : table)
        if (t.from == cur && t.ev == ev) return t.to;
    return cur;   // 또는 throw
}
```

전이 그래프가 한눈에. State 코드 폭발 없음.

### 3. Hierarchical State Machine (HSM)

```cpp
// 음악 플레이어: Playing 안에 NormalPlay, ShufflePlay
// 모두 Playing의 동작 상속, 특수 동작만 override
template <typename Parent>
class StateBase {
    // Parent의 동작 위임 + override
};
```

UML statechart. Qt State Machine, Boost.SML이 지원.

### 4. Boost.SML — DSL FSM

```cpp
#include <boost/sml.hpp>

struct VendingFsm {
    auto operator()() const {
        using namespace boost::sml;
        return make_transition_table(
            *"idle"_s    + event<Insert>     = "has_coin"_s,
             "has_coin"_s + event<Select>    = "dispensing"_s,
             "dispensing"_s + event<Dispense> = "idle"_s
        );
    }
};

sml::sm<VendingFsm> machine;
machine.process_event(Insert{});
```

DSL로 전이 그래프 표현. 자동 검증, 시각화.

### 5. Coroutine 기반 FSM (linear flow)

```cpp
auto vendingFsm() -> std::generator<State> {
    while (true) {
        co_yield Idle{};       // wait for insertCoin
        co_yield HasCoin{};    // wait for selectItem
        co_yield Dispensing{}; // wait for dispense
    }
}
```

순차 흐름이 명확한 FSM에 자연스러움.

### 6. Concept-based static state

```cpp
template <typename S>
concept VendingState = requires(S s, VendingMachine& m) {
    s.insertCoin(m);
    s.selectItem(m);
    s.dispense(m);
};

template <VendingState... States>
class FSM {
    std::variant<States...> state;
public:
    void process(auto event) { /* visit */ }
};
```

가상 호출 없이 type-safe FSM.

## C 구현 — 함수 포인터 테이블

```c
typedef enum { S_IDLE, S_HAS_COIN, S_DISPENSING } StateId;

struct VendingMachine;

typedef struct {
    void (*insert_coin)(struct VendingMachine*);
    void (*select_item)(struct VendingMachine*);
    void (*dispense)(struct VendingMachine*);
} StateOps;

extern const StateOps idle_ops, has_coin_ops, dispensing_ops;

typedef struct VendingMachine {
    StateId         state;
    const StateOps* ops;
} VendingMachine;

void machine_change(VendingMachine* m, StateId s) {
    m->state = s;
    switch (s) {
        case S_IDLE:       m->ops = &idle_ops; break;
        case S_HAS_COIN:   m->ops = &has_coin_ops; break;
        case S_DISPENSING: m->ops = &dispensing_ops; break;
    }
}
```

## 성능 — State 구현 방식 비교

`insertCoin` 1억 번 호출 (전이 발생).

| 방식 | 시간 | 메모리 | 비고 |
| --- | --- | --- | --- |
| switch + enum | 0.3s | 0 | baseline, 분기 |
| Virtual State 클래스 | 1.5s | heap | 가상 + heap alloc per state |
| State Singleton (heap 없음) | 0.8s | static | 가상 호출만 |
| `std::variant` + visit | 0.5s | stack | branch table |
| Transition table | 0.4s | static | for 탐색 (N 작음) |
| Boost.SML | 0.5s | static | 컴파일 타임 dispatch |

매 전이마다 heap alloc은 비쌈. State Singleton 또는 variant 권장.

## State vs Strategy — 자주 혼동

같은 구조, **다른 의도**:

| | State | Strategy |
| --- | --- | --- |
| 결정 주체 | 객체 자체 (자체 전이) | 외부 클라이언트 |
| 객체 간 관계 | 전이 그래프 (state→state) | 평행 (서로 무관) |
| 변경 빈도 | 자주 (상태 흐름) | 가끔 (정책 변경) |

## 트레이드오프 — 한눈에

| 차원 | State |
| --- | --- |
| 상태별 동작 명확 분리 | ✅ |
| 새 상태 추가 (OCP) | ✅ |
| 거대한 조건문 회피 | ✅ |
| 상태 전이 명시적 | ✅ |
| 상태 클래스 증가 | ⚠️ 작은 FSM에 과도 |
| 상태 객체 인스턴스 비용 | ⚠️ Singleton/Flyweight으로 완화 |
| 전이 그래프 분산 | ⚠️ 시각화 어려움 — table FSM이 나음 |

## 실제 사례

- **TCP/IP 스택**의 connection state machine — `Listen`, `SynRcvd`, `Established`, `FinWait`...
- **게임 AI / 캐릭터** 상태 — Idle, Patrol, Chase, Attack, Flee
- **컴파일러의 lexer state** — token recognition FSM
- **UI 위젯** — Idle, Hover, Pressed, Disabled
- **워크플로우 엔진** — Pending, Approved, Rejected, Completed
- **HTTP request lifecycle** — Pending, Headers, Body, Done
- **결제 시스템** — Initial, Authorized, Captured, Refunded
- **Bluetooth/Wi-Fi connection** — 표준 FSM
- **Unity Animator State Machine** — 게임 애니메이션

## 관련 패턴

- **[Strategy (item 21)](/blog/programming/design/gof-design-patterns/item21-strategy)** — 구조 비슷, 의도 다름. Strategy는 외부 선택, State는 자체 전이
- **[Singleton (item 5)](/blog/programming/design/gof-design-patterns/item05-singleton)** — 무상태 state는 Singleton으로 공유
- **[Flyweight (item 11)](/blog/programming/design/gof-design-patterns/item11-flyweight)** — 같은 이유로 Flyweight
- **[Command (item 14)](/blog/programming/design/gof-design-patterns/item14-command)** — state machine의 입력이 command
- **[Observer (item 19)](/blog/programming/design/gof-design-patterns/item19-observer)** — 상태 변경을 외부에 통보
- **[Pattern Relationships (item 24)](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview)** — State와 Strategy의 형제 관계
