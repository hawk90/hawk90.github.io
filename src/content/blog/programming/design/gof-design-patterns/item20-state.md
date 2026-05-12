---
title: "GoF 20: State"
date: 2026-02-03T17:00:00
description: "객체의 내부 상태에 따라 동작이 변하도록 — if/switch 대신 상태 객체."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 20
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

State 패턴은 **상태별 동작을 별도 클래스로**.

```cpp
machine.insertCoin();   // 현재 state 객체에 위임 → 상태가 동작 결정
```

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

## 모던 변형 — `std::variant` (C++17)

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

## 실제 사례

- **TCP/IP 스택**의 connection state machine
- **게임 AI / 캐릭터** 상태
- **컴파일러의 lexer state**
- **UI 위젯** (Idle, Hover, Pressed, Disabled)
- **워크플로우 엔진**

## 관련 패턴

- **[Strategy (item 21)](/blog/programming/design/gof-design-patterns/item21-strategy)** — 구조 비슷, 의도 다름. Strategy는 외부 선택, State는 자체 전이
- **[Singleton (item 5)](/blog/programming/design/gof-design-patterns/item05-singleton)** — 무상태 state는 Singleton으로 공유
- **[Flyweight (item 11)](/blog/programming/design/gof-design-patterns/item11-flyweight)** — 같은 이유로 Flyweight
