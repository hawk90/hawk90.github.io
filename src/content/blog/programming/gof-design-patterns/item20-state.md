---
title: "GoF 20: State"
date: 2026-02-03T17:00:00
description: "객체의 내부 상태에 따라 동작이 변하도록 — if/switch 대신 상태 객체."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 20
draft: true
---

## 의도

객체가 자신의 내부 상태에 따라 다른 동작을 보이도록 — 상태별 동작을 **별도 클래스로** 분리. 객체가 마치 자신의 클래스를 바꾸는 것처럼 보임.

## 동기

- TCP 연결 (Listen, Established, Closed, Wait)
- 자판기 (Idle, HasMoney, Dispensing, Maintenance)
- 게임 캐릭터 (Idle, Running, Attacking, Dead)
- 미디어 플레이어 (Stopped, Playing, Paused)

`switch (state)` 폭탄 회피, 새 상태 추가 시 OCP 만족.

## 적용 가능성

- 객체의 동작이 자신의 상태에 의존하고, 런타임에 그 동작이 변경되어야 할 때
- 객체 상태에 따른 동작 분기를 가진 거대한 조건문이 있을 때
- 상태 전이 규칙이 명시적이어야 할 때

## 구조

```
   Context ◇──► State (interface)
   - state          + handle()*
   + request()           △
        │                │
        │       ┌────────┴────────┐
        ▼   ConcStateA       ConcStateB
   state.handle() + handle()       + handle()
                  + ...             + ...
```

## 참여자

- **Context** — 클라이언트 인터페이스, 현재 State 보유
- **State** — 상태별 동작 인터페이스
- **ConcreteState** — 특정 상태의 동작, 다음 상태 결정·전이

## C++ 구현 — 자판기

```cpp
class VendingMachine;

class State {
public:
    virtual ~State() = default;
    virtual void insertCoin(VendingMachine&) = 0;
    virtual void selectItem(VendingMachine&) = 0;
    virtual void dispense(VendingMachine&)   = 0;
};

class IdleState;
class HasCoinState;
class DispensingState;

class VendingMachine {
    std::unique_ptr<State> state;
public:
    explicit VendingMachine(std::unique_ptr<State> s) : state(std::move(s)) {}

    void changeState(std::unique_ptr<State> s) { state = std::move(s); }

    void insertCoin() { state->insertCoin(*this); }
    void selectItem() { state->selectItem(*this); }
    void dispense()   { state->dispense(*this);   }
};

class IdleState : public State {
public:
    void insertCoin(VendingMachine& m) override {
        std::cout << "coin accepted\n";
        m.changeState(std::make_unique<HasCoinState>());
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

// 사용
VendingMachine vm(std::make_unique<IdleState>());
vm.insertCoin();   // → HasCoinState
vm.selectItem();   // → DispensingState
vm.dispense();     // → IdleState
```

각 상태가 어떻게 다음 상태로 전이할지 본인이 결정 — 자연스러운 FSM.

## C++ 구현 — `std::variant` (모던 대안)

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
            } else {
                /* invalid */
            }
        }, state);
    }
};
```

가상 함수 없이 closed state set 표현.

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

static void idle_insert(VendingMachine* m) {
    printf("coin accepted\n");
    machine_change(m, S_HAS_COIN);
}

const StateOps idle_ops = {
    .insert_coin = idle_insert,
    .select_item = idle_select,
    .dispense    = idle_dispense,
};
```

## Strategy와의 비교

구조는 비슷하지만 의도가 다름:

- **State**: 객체 자체가 상태에 따라 다음 상태를 결정 (자체 전이)
- **Strategy**: 외부에서 알고리즘을 선택 (외부 결정)

State는 상태 간 전이 그래프가 있고, Strategy는 보통 평행한 알고리즘들.

## 결과 (트레이드오프)

**장점**
- 상태별 동작이 명확하게 분리
- 새 상태 추가 시 OCP 만족
- 거대한 조건문 회피
- 상태 전이가 코드에 명시적

**단점**
- 상태 클래스 증가 (작은 FSM에 과도)
- 상태 객체 간 관계 (한 상태가 다른 상태를 참조)
- Context 인스턴스마다 state 객체가 새로 만들어지면 비용 → Singleton/Flyweight으로 공유 가능

## 변형

- **State 객체 공유** — 무상태면 Singleton/Flyweight
- **Table-driven FSM** — 상태×이벤트 테이블 (Boost.MSM, SCXML)
- **`std::variant`** — closed set, 컴파일 타임 검증
- **HSM (Hierarchical State Machine)** — 상태가 하위 상태를 가짐

## 알려진 사용 사례

- TCP/IP 스택의 connection state machine
- 게임 AI/캐릭터 상태
- 컴파일러의 lexer state
- UI 위젯 (Idle, Hover, Pressed, Disabled)
- 워크플로우 엔진

## 관련 패턴

- **[Strategy (item 21)](/blog/programming/gof-design-patterns/item21-strategy)** — 구조 비슷, 의도 다름. Strategy는 외부 선택, State는 자체 전이
- **[Singleton (item 5)](/blog/programming/gof-design-patterns/item05-singleton)** — 무상태 state 객체는 Singleton으로 공유
- **[Flyweight (item 11)](/blog/programming/gof-design-patterns/item11-flyweight)** — 같은 이유로 Flyweight 활용
