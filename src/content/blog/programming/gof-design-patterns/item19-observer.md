---
title: "GoF 19: Observer"
date: 2026-02-03T16:00:00
description: "객체 상태 변경을 관찰자들에게 자동 통보 — pub/sub의 토대."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 19
draft: true
---

## 의도

한 객체의 상태가 변하면 의존하는 객체들에게 **자동으로 통보**되고 갱신되도록 합니다. publish-subscribe.

## 동기

- 모델 ↔ 뷰 (MVC) — 모델 변경 시 모든 뷰 갱신
- 이벤트 시스템 (UI, 게임)
- 스프레드시트 — 셀 변경이 의존 셀들 재계산
- reactive programming

## 적용 가능성

- 추상이 두 측면을 가지는데 한쪽이 다른쪽에 의존할 때 — 두 측면을 분리해 독립 변경
- 한 객체의 변경이 알려지지 않은 수의 다른 객체에 영향
- 객체가 다른 객체에 알리되 누군지 가정하면 안 될 때 (느슨한 결합)

## 구조

```
   Subject ◇──────► Observer (interface)
   + attach(O)*       + update()*
   + detach(O)*           △
   + notify()             │
        △            ┌────┴────┐
        │         ConcObsA  ConcObsB
   ConcSubject       + update()
   - state
   + getState()
   + setState()
```

## 참여자

- **Subject** — observer 등록·해제·통보
- **Observer** — `update()` 인터페이스
- **ConcreteSubject** — 실제 상태 보유, 변경 시 notify
- **ConcreteObserver** — Subject 참조 + 자체 상태 갱신

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

class Display : public Observer {
public:
    void onUpdate(int v) override { std::cout << "Display: " << v << '\n'; }
};

// 사용
Subject  sub;
Display  d1, d2;
sub.attach(&d1);
sub.attach(&d2);
sub.setValue(42);    // d1, d2 모두 통보 받음
```

## 모던 변형 — `std::function` signal/slot

```cpp
class Signal {
    std::vector<std::function<void(int)>> slots;
public:
    using Handle = std::size_t;

    Handle connect(std::function<void(int)> f) {
        slots.push_back(std::move(f));
        return slots.size() - 1;
    }

    void emit(int v) {
        for (auto& s : slots) s(v);
    }
};

// 사용
Signal sig;
sig.connect([](int v) { std::cout << "Got: " << v << '\n'; });
sig.connect([](int v) { /* 다른 처리 */ });
sig.emit(42);
```

Qt signal/slot, Boost.Signals2가 같은 패턴.

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

## Push vs Pull

- **Push 모델**: subject가 observer에게 변경 정보를 인자로 (위 예제 — `update(value)`)
- **Pull 모델**: subject가 변경 사실만 알리고, observer가 원하는 정보를 직접 조회

```cpp
// Pull
class Observer {
public:
    virtual void onUpdate(Subject* s) = 0;    // observer가 s에서 데이터 조회
};
```

Push는 결합도 ↑, 효율 ↑. Pull은 결합도 ↓, observer가 매번 조회.

## 결과 (트레이드오프)

**장점**
- Subject·Observer 결합도 ↓
- 동적 구독·해제
- 다수 observer 지원
- 새 observer 종류 추가 쉬움

**단점**
- 통보 비용 (observer 수에 비례)
- 통보 순서가 결정적이지 않을 수 있음 (스레드)
- **observer 수명** — subject보다 먼저 사라지면 댕글링 (weak_ptr 또는 명시적 detach)
- **순환 통보** — observer가 subject를 다시 변경하면 무한 루프
- 디버깅 어려움 — 알림 흐름 추적

## 안전성 보강

- **weak_ptr observer** — observer가 사라지면 자동 무효화
- **재진입 보호** — notify 중에는 attach/detach 큐잉
- **스레드 안전** — mutex로 observer 리스트 보호

## 변형

- **Mediator + Observer** — Mediator가 Observer 구독으로 동료 변경 받음
- **Reactive streams** — Observer를 시간/이벤트 스트림으로 일반화 (RxJava, RxJS)
- **Event aggregator / event bus** — 중앙 집중 pub-sub

## 알려진 사용 사례

- Java `java.util.Observable` (deprecated, 그러나 패턴 자체는 어디든)
- Qt signal/slot
- DOM 이벤트 리스너
- Redux/MobX 등 reactive state 라이브러리
- 거의 모든 GUI 프레임워크의 이벤트 시스템

## 관련 패턴

- **[Mediator (item 17)](/blog/programming/gof-design-patterns/item17-mediator)** — Mediator가 Observer로 동료 상태 변경 받음 (자주 결합)
- **[Singleton (item 5)](/blog/programming/gof-design-patterns/item05-singleton)** — Subject나 EventBus는 보통 Singleton
- **[Composite (item 8)](/blog/programming/gof-design-patterns/item08-composite)** — 이벤트 bubbling은 Composite + Observer 결합
