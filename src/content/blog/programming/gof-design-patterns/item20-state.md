---
title: "GoF 20: State"
date: 2026-02-03T17:00:00
description: "객체의 내부 상태에 따라 동작이 변하도록 — if/switch 대신 상태 객체."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 20
draft: true
---

> **초안** — 정리 진행 중

## 의도

객체의 내부 상태에 따라 동작이 변할 때, 상태별 동작을 **별도 클래스로** 분리. `if`/`switch` 폭탄 회피.

## 동기

- TCP 연결 (Listen, Established, Closed, ...)
- 자판기 (Idle, HasMoney, Dispensing, ...)
- 게임 캐릭터 (Idle, Running, Attacking, ...)

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

class HasCoinState : public State { /* ... */ };
class DispensingState : public State { /* ... */ };
```

각 상태가 어떻게 다음 상태로 전이할지 본인이 결정 — 자연스러운 FSM.

## Strategy와의 비교

구조는 비슷하지만 의도가 다름:

- **Strategy**: 알고리즘 교체 (외부에서 결정)
- **State**: 상태에 따른 자동 전이 (객체 자체가 결정)

## C 구현 — 함수 포인터 테이블

```c
typedef enum { S_IDLE, S_HAS_COIN, S_DISPENSING } StateId;

typedef struct {
    void (*insert_coin)(struct VendingMachine*);
    void (*select_item)(struct VendingMachine*);
    void (*dispense)(struct VendingMachine*);
} StateOps;

extern const StateOps idle_ops, has_coin_ops, dispensing_ops;

typedef struct VendingMachine {
    StateId state;
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

## 트레이드오프

- **장점**: 상태별 동작 명확, 새 상태 추가 시 OCP 만족
- **단점**: 상태 클래스 폭증, 단순 FSM에 과도
