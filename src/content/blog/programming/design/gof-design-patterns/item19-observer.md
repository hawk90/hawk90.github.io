---
title: "GoF 19: Observer"
date: 2026-02-03T16:00:00
description: "객체 상태 변경을 관찰자들에게 자동 통보 — pub/sub의 토대."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 19
draft: true
---

## 한 줄 요약

> **"바뀌면 알려줄게요"** — Subject가 등록된 Observer들에게 자동 알림.

## 어떤 문제를 푸는가

한 객체의 상태가 변하면 의존하는 객체들에게 **자동으로 통보**되고 갱신되어야 합니다.

- **MVC** — 모델 변경 시 모든 뷰 갱신
- **이벤트 시스템** (UI, 게임)
- **스프레드시트** — 셀 변경이 의존 셀들 재계산
- **reactive programming**

직접 호출하면 결합도 폭발 — Subject가 모든 Observer를 알아야 함. Observer 패턴은 Subject가 **추상 인터페이스만** 알도록.

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item19-observer.svg" alt="Observer 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

상태 변경 → `notify()` → 모든 등록된 observer의 `update()` 호출.

## Push vs Pull 모델

| 측면 | Push | Pull |
| --- | --- | --- |
| 알림 | 변경값을 인자로 전달 | "바뀜" 신호만 |
| Observer 동작 | 받은 값으로 즉시 처리 | Subject에서 직접 조회 |
| 결합도 | ↑ (subject가 무엇을 보낼지 알아야) | ↓ |
| 효율 | ✅ 필요한 것만 | ⚠️ 불필요 조회 가능 |

## 언제 쓰면 좋은가

- 추상이 두 측면을 가지는데 한쪽이 다른 쪽에 의존 — 두 측면을 분리해 독립 변경
- 한 객체의 변경이 **알려지지 않은 수**의 다른 객체에 영향
- 객체가 다른 객체에 알리되 누군지 가정하면 안 될 때 (느슨한 결합)

## 언제 쓰면 안 되나

> ⚠️ **observer가 subject보다 먼저 사라지면 댕글링** — weak_ptr 또는 명시적 detach 필요.

> ⚠️ **순환 통보** — observer가 subject를 다시 변경하면 무한 루프 위험.

> ⚠️ **단일 observer 결정적** 통보면 그냥 직접 호출.

## C++ 구현 — 전통

### 1. Observer 인터페이스

```cpp
class Observer {
public:
    virtual ~Observer() = default;
    virtual void onUpdate(int newValue) = 0;
};
```

### 2. Subject — observer 관리

```cpp
class Subject {
    std::vector<Observer*> observers;
    int value = 0;
public:
    void attach(Observer* o) { observers.push_back(o); }
    void detach(Observer* o) { std::erase(observers, o); }    // C++20

    void setValue(int v) {
        value = v;
        notify();
    }

    int getValue() const { return value; }

private:
    void notify() {
        for (auto* o : observers) o->onUpdate(value);
    }
};
```

### 3. ConcreteObserver

```cpp
class Display : public Observer {
public:
    void onUpdate(int v) override { std::cout << "Display: " << v << '\n'; }
};
```

### 4. 사용

```cpp
Subject  sub;
Display  d1, d2;
sub.attach(&d1);
sub.attach(&d2);
sub.setValue(42);    // d1, d2 모두 자동 통보
```

## 모던 변형 — `std::function` signal/slot

Qt·Boost.Signals2 스타일.

```cpp
class Signal {
    std::vector<std::function<void(int)>> slots;
public:
    void connect(std::function<void(int)> f) { slots.push_back(std::move(f)); }
    void emit(int v) { for (auto& s : slots) s(v); }
};

// 사용 — 람다로 간편
Signal sig;
sig.connect([](int v) { std::cout << "Got: " << v << '\n'; });
sig.connect([](int v) { /* 다른 처리 */ });
sig.emit(42);
```

Observer 클래스 계층 없이 람다로 즉석 등록.

## C 구현

```c
#define MAX_OBS 16

typedef struct Observer {
    void (*on_update)(struct Observer*, int);
} Observer;

typedef struct {
    Observer* observers[MAX_OBS];
    size_t    count;
    int       value;
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

## 안전성 보강 패턴

| 위험 | 해결 |
| --- | --- |
| observer 댕글링 | `weak_ptr<Observer>` 사용 |
| 재진입 (notify 중 attach/detach) | 큐잉 후 처리 |
| 멀티스레드 race | mutex로 observer 리스트 보호 |
| 순환 통보 | 깊이 카운트, 또는 dirty flag 후 단일 dispatch |

## 트레이드오프 — 한눈에

| 차원 | Observer |
| --- | --- |
| Subject·Observer 결합도 | ✅ 매우 낮음 |
| 동적 구독·해제 | ✅ |
| 다수 observer | ✅ |
| 새 observer 종류 | ✅ OCP |
| 통보 비용 | ⚠️ observer 수 비례 |
| 통보 순서 결정성 | ⚠️ 보장 X |
| 디버깅 (알림 흐름) | ⚠️ 추적 어려움 |

## 실제 사례

- **Qt signal/slot**
- **DOM 이벤트 리스너**
- **Redux/MobX 등 reactive state 라이브러리**
- 모든 **GUI 프레임워크의 이벤트 시스템**
- **RxJava / RxJS** (reactive streams)

## 관련 패턴

- **[Mediator (item 17)](/blog/programming/design/gof-design-patterns/item17-mediator)** — Mediator가 Observer로 동료 변경 받음
- **[Singleton (item 5)](/blog/programming/design/gof-design-patterns/item05-singleton)** — Subject나 EventBus는 보통 Singleton
- **[Composite (item 8)](/blog/programming/design/gof-design-patterns/item08-composite)** — 이벤트 bubbling은 Composite + Observer 결합
