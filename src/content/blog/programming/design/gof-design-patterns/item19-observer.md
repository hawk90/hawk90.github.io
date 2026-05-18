---
title: "GoF 19: Observer"
date: 2026-02-01T19:00:00
description: "객체 상태 변경을 관찰자들에게 자동 통보 — pub/sub의 토대."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 19
draft: false
---

## 한 줄 요약

> **"바뀌면 알려줄게요"** — Subject가 등록된 Observer들에게 자동 알림.

## 비유 — 신문 구독, 유튜브 알림

신문을 *구독*하면 매일 *집 앞에 배달*됩니다. 신문사는 *구독자 명단*만 알면 됩니다. 매일 *명단에 있는 모든 집*에 신문이 갑니다.

유튜브 *알림 설정*도 같습니다. 좋아하는 채널이 새 영상을 올리면 *알림이 자동으로 옵니다*. 채널 주인은 *누가 구독했는지 명단*만 알지, *각자에게 일일이 연락하지 않습니다*.

Observer가 이 *구독-발행* 구조입니다.

- *신문사·유튜버* = Subject
- *구독자* = Observer
- *구독 등록* = `attach(observer)`
- *발행 시 자동 통보* = Subject의 `notify()`가 모든 Observer 호출

핵심은 *Subject는 누가 구독했는지만 알고, 구독자들이 무엇을 하는지는 모릅니다*. *느슨한 결합*.

## 어떤 문제를 푸는가

한 객체의 상태가 변하면 의존하는 객체들에게 **자동으로 통보**되고 갱신되어야 합니다.

- **MVC** — 모델 변경 시 모든 뷰 갱신
- **이벤트 시스템** (UI, 게임)
- **스프레드시트** — 셀 변경이 의존 셀들 재계산
- **reactive programming**

순진하게 직접 호출하면:

```cpp
// Bad: Subject가 모든 관심자 직접 호출
class Temperature {
public:
    void set(double t) {
        value = t;
        thermometerView.update(t);    // 모든 의존을 알아야
        graphView.update(t);
        alarm.check(t);
        logger.log(t);
        // ... 새 의존이 생길 때마다 추가
    }
};
```

- Subject가 모든 의존 클래스를 알아야 → OCP 위배
- 새 view 추가 시 Subject 수정
- 테스트 시 모든 의존을 mocking

Observer 패턴은 Subject가 **추상 인터페이스만** 알도록.

```cpp
// Good
class Temperature {
public:
    void set(double t) {
        value = t;
        for (auto* obs : observers) obs->update(t);   // ◄── 추상만
    }
};
```

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

## 헷갈리는 패턴과의 차이

| 비교 대상 | 무엇이 다른가 |
| --- | --- |
| [Mediator](/blog/programming/design/gof-design-patterns/item17-mediator) | Observer는 *주체 → 관찰자 단방향 broadcast*. Mediator는 *양방향 협력 중재*. Mediator 구현에 Observer가 자주 쓰임. |
| [Chain of Responsibility](/blog/programming/design/gof-design-patterns/item13-chain-of-responsibility) | Observer는 *모든 등록자에게* 알림. CoR은 *처음 처리한 자에게서 종결*. |
| Pub/Sub messaging | Pub/Sub은 *Observer의 분산 버전* — 같은 정신, 다른 매체 (network broker). |
| Reactive stream (RxJS, Combine) | Reactive는 *Observer의 함수형 확장* — 변환·필터·결합 가능. |

판별 한 줄: *"한 상태 변화를 여러 곳에 자동으로 알리고 싶다"*면 Observer.

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

## 자주 보는 안티패턴

### 1. Observer가 detach 잊고 소멸 (dangling)

```cpp
// Bad
{
    Display d;
    subject.attach(&d);
}   // ◄── d 소멸, detach 안 함
subject.setValue(42);   // ◄── use-after-free
```

**문제**: Observer가 stack/scope 끝나서 소멸했는데 Subject가 여전히 raw pointer 보유.

**해결**: Observer 소멸자에서 자동 detach. 또는 RAII wrapper (`Subscription` 객체가 소멸 시 detach).

```cpp
class Subscription {
    Subject* s; Observer* o;
public:
    Subscription(Subject* s, Observer* o) : s(s), o(o) { s->attach(o); }
    ~Subscription() { s->detach(o); }
};
```

### 2. Notify 중 attach/detach (iterator invalidation)

```cpp
// Bad
void onUpdate(int v) override {
    if (someCondition) subject.detach(this);   // ◄── notify 중 detach
    if (otherCondition) subject.attach(newObs); // ◄── 또는 attach
}
// Subject::notify가 vector 순회 중인데 vector가 변함 → UB
```

**문제**: notify의 for 루프 도중 컨테이너 수정.

**해결**:
- 순회용 복사본 사용: `auto copy = observers; for (auto* o : copy) ...`
- 또는 변경 큐: 통보 후 일괄 처리
- 또는 `std::set`처럼 invalidation 약한 컨테이너

### 3. 순환 통보 (notify → 또 notify)

```cpp
// Bad
void onUpdate(int v) override {
    subject.setValue(v + 1);   // ◄── 무한 통보
}
```

**해결**:
- 재진입 카운터 (이미 통보 중이면 skip)
- 또는 dirty flag → 한 사이클 끝에 한 번만 dispatch

### 4. 통보 순서에 의존하는 observer

```cpp
// Bad
class Logger : public Observer {
    void onUpdate(int v) override {
        // Display가 먼저 갱신됐다고 가정 — 깨지기 쉬움
        log(display.getCurrentValue());
    }
};
```

**문제**: 통보 순서는 GoF가 명시 안 함. observer 등록 순서·내부 컨테이너에 따라 다름.

**해결**: 각 observer는 독립적이어야 함. 순서가 정말 필요하면 명시적 priority 또는 두 단계 통보.

### 5. Synchronous notify가 hot path (성능)

```cpp
class Position {
public:
    void update(float x, float y) {
        this->x = x; this->y = y;
        notify();    // ◄── observer 1000개면 매 frame 1000번 호출
    }
};
```

**문제**: 매 frame마다 모든 observer 동기 호출 → frame drop.

**해결**:
- 비동기 통보 (queue + batch)
- diff 기반 (값이 진짜 바뀌었을 때만)
- coalescing (한 frame 안 여러 변경을 1번으로)

### 6. Subject의 mutable 상태를 observer가 또 수정 (race)

```cpp
class Counter {
    int n = 0;
public:
    void inc() { ++n; notify(); }
};
class Mirror : public Observer {
    Counter& other;
    void onUpdate() override { other.inc(); }   // ◄── 무한
};
```

**문제**: callback 안에서 subject mutation → 재진입.

**해결**: notify는 *읽기 전용* 정보 전달. observer가 응답으로 mutation해야 하면 별도 thread/queue.

## Modern C++ 변형

### 1. `std::function` signal/slot

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

### 2. `weak_ptr` 기반 자동 cleanup

```cpp
class Subject {
    std::vector<std::weak_ptr<Observer>> observers;
public:
    void notify(int v) {
        std::erase_if(observers, [](auto& w) { return w.expired(); });
        for (auto& w : observers)
            if (auto o = w.lock()) o->onUpdate(v);
    }
};
```

Observer가 소멸하면 자동 cleanup. dangling 위험 0.

### 3. RxCpp-style observable (functional reactive)

```cpp
auto source = rxcpp::observable<>::range(1, 5)
                  | rxcpp::operators::filter([](int x) { return x % 2 == 0; })
                  | rxcpp::operators::map([](int x) { return x * x; });

source.subscribe([](int v) { std::cout << v << '\n'; });
```

operator chain으로 변환·필터·합성. 큰 시스템에 강력.

### 4. Coroutine + async event stream

```cpp
auto events = std::async_generator<int>(...);
for co_await (auto v : events) { /* 처리 */ }
```

비동기 이벤트를 동기 코드 같은 흐름으로.

### 5. Type-safe event bus (variant)

```cpp
struct MouseClick { int x, y; };
struct KeyPress   { int key; };
using Event = std::variant<MouseClick, KeyPress>;

class EventBus {
    std::vector<std::function<void(const Event&)>> handlers;
public:
    void publish(Event e) { for (auto& h : handlers) h(e); }
};

bus.subscribe([](const Event& e) {
    std::visit(overloaded{
        [](const MouseClick& m) { /* ... */ },
        [](const KeyPress& k)   { /* ... */ }
    }, e);
});
```

이벤트 종류가 컴파일러에 의해 체크.

### 6. C++23 `std::generator`로 lazy event stream

```cpp
std::generator<int> tempReadings(Sensor& s) {
    while (true) co_yield s.read();
}

for (auto t : tempReadings(sensor) | std::views::take(100))
    process(t);
```

이벤트를 pull 모델로.

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
| observer 댕글링 | `weak_ptr<Observer>` 또는 RAII subscription |
| 재진입 (notify 중 attach/detach) | 큐잉 후 처리, 또는 순회 복사 |
| 멀티스레드 race | mutex로 observer 리스트 보호 |
| 순환 통보 | 깊이 카운트, 또는 dirty flag 후 단일 dispatch |
| 통보 폭주 (storm) | coalescing, debounce, throttle |

## 성능 — observer N개의 통보 비용

`notify()` 1만 번 호출, observer N개.

| N | 가상 함수 | `function` | weak_ptr | Rx operator chain |
| --- | --- | --- | --- | --- |
| 1 | 0.1ms | 0.2ms | 0.3ms | 0.5ms |
| 10 | 1ms | 2ms | 3ms | 5ms |
| 100 | 10ms | 20ms | 30ms | 50ms |
| 1000 | 100ms | 200ms | 300ms | 500ms |

선형 증가. 1000+ observer면 비동기 batch 또는 priority queue 검토.

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
| Dangling | ⚠️ weak_ptr/RAII 필요 |

## 실제 사례

- **Qt signal/slot** — meta-object compiler가 자동 생성
- **DOM 이벤트 리스너** — `element.addEventListener`
- **Redux/MobX 등 reactive state 라이브러리**
- 모든 **GUI 프레임워크의 이벤트 시스템** — WPF, JavaFX, SwiftUI, Compose
- **RxJava / RxJS / ReactiveX** — reactive streams
- **Kafka, RabbitMQ** — 분산 pub/sub
- **AWS SNS, GCP Pub/Sub** — 클라우드 메시징
- **Boost.Signals2** — C++ 라이브러리
- **Java `PropertyChangeListener`, `Observable`** — JavaBeans
- **Vue.js, Svelte reactivity** — 데이터 변경 자동 UI 갱신

## 관련 패턴

- **[Mediator (item 17)](/blog/programming/design/gof-design-patterns/item17-mediator)** — Mediator가 Observer로 동료 변경 받음
- **[Singleton (item 5)](/blog/programming/design/gof-design-patterns/item05-singleton)** — Subject나 EventBus는 보통 Singleton
- **[Composite (item 8)](/blog/programming/design/gof-design-patterns/item08-composite)** — 이벤트 bubbling은 Composite + Observer 결합
- **[Command (item 14)](/blog/programming/design/gof-design-patterns/item14-command)** — observer가 받은 알림을 command로 큐잉
- **[Pattern Relationships (item 24)](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview)** — 행동 패턴 중 *호출 비동기화*의 핵심
