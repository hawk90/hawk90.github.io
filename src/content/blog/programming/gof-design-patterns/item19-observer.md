---
title: "GoF 19: Observer"
date: 2026-02-03T16:00:00
description: "객체 상태 변경을 관찰자들에게 자동 통보 — pub/sub의 토대."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 19
draft: true
---

> **초안** — 정리 진행 중

## 의도

한 객체의 상태가 변하면 의존하는 객체들에게 **자동 통보**되도록. publish/subscribe.

## 동기

- 모델 ↔ 뷰 (MVC)
- 이벤트 시스템 (UI, 게임)
- reactive programming

## C++ 구현

```cpp
class Observer {
public:
    virtual ~Observer() = default;
    virtual void onUpdate(int newValue) = 0;
};

class Subject {
    std::vector<Observer*> observers;
    int value = 0;
public:
    void attach(Observer* o)   { observers.push_back(o); }
    void detach(Observer* o)   { std::erase(observers, o); }
    void setValue(int v) {
        value = v;
        notify();
    }
private:
    void notify() {
        for (auto* o : observers) o->onUpdate(value);
    }
};

class Display : public Observer {
public:
    void onUpdate(int v) override { std::cout << "Display: " << v << '\n'; }
};
```

## 모던 변형 — `std::function` signal/slot

```cpp
class Signal {
    std::vector<std::function<void(int)>> slots;
public:
    void connect(std::function<void(int)> f) { slots.push_back(std::move(f)); }
    void emit(int v) { for (auto& s : slots) s(v); }
};

// 사용
Signal sig;
sig.connect([](int v) { std::cout << "Got: " << v << '\n'; });
sig.emit(42);
```

Qt signal/slot, Boost.Signals2 같은 라이브러리가 같은 패턴.

## 함정

- **observer 수명** — subject보다 먼저 사라지면 댕글링. weak_ptr이나 명시적 detach 필요
- **순환 통보** — observer가 subject를 다시 변경하면 무한 루프 위험
- **순서 의존** — 알림 순서가 결정적인지 명확히

## C 구현

```c
#define MAX_OBS 16
typedef struct Observer {
    void (*on_update)(struct Observer*, int);
} Observer;

typedef struct {
    Observer* observers[MAX_OBS];
    size_t count;
    int value;
} Subject;

void subject_attach(Subject* s, Observer* o) {
    if (s->count < MAX_OBS) s->observers[s->count++] = o;
}

void subject_set(Subject* s, int v) {
    s->value = v;
    for (size_t i = 0; i < s->count; ++i)
        s->observers[i]->on_update(s->observers[i], v);
}
```

## 트레이드오프

- **장점**: 결합도 ↓, 동적 구독, 다수 observer
- **단점**: 통보 비용·순서·생명주기 관리
