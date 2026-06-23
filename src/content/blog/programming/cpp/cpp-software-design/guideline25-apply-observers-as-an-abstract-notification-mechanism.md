---
title: "가이드라인 25: Observer를 추상 알림 메커니즘으로 적용하라"
date: 2026-05-02T01:00:00
description: "Observer 패턴은 pub/sub이다. 모던 C++에서 std::function 기반이 표준이며, 라이프타임·순환·예외 같은 함정에 주의한다."
tags: [C++, Software Design, Observer, Pub-Sub]
series: "C++ Software Design"
seriesOrder: 25
draft: true
---

## 왜 이 가이드라인이 중요한가?

이벤트 기반 시스템에서 자주 보이는 패턴이다.

```cpp
class Button {
public:
    void on_click(std::function<void()> handler);     // 콜백 등록
    void click() { /* handler 호출 */ }
};

Button btn;
btn.on_click([]() { save_document(); });
btn.click();     // save_document 호출
```

이게 **Observer 패턴**의 모던 구현이다. 한 객체(Subject)가 여러 객체(Observers)에게 이벤트를 알린다.

GoF Observer는 1994년의 정의다. 모던 C++에서는 다음이 자리잡았다.

- `std::function`으로 람다와 functor를 자유롭게 받는다.
- 값 의미론을 유지한다.
- `shared_ptr`과 `weak_ptr`로 라이프타임을 관리한다.

다만 Observer는 함정이 많은 패턴이다.

- Dangling reference
- 순환 참조
- 재진입(update 도중 attach/detach)
- 예외 전파
- 순서 의존

이번 가이드라인은 Observer 패턴과 흔한 함정, 그리고 모던 구현을 다룬다.

## 핵심 내용

- **Observer 패턴** — 1:N 알림 메커니즘(pub/sub)이다.
- 모던 구현은 `std::function` 우선, `weak_ptr`로 라이프타임을 관리한다.
- 함정 — dangling, 순환, 재진입, 예외, 순서.
- C++ 표준에는 없고 Boost.Signals2가 모범이다.
- 비동기 알림은 Message Queue 패턴을 검토한다.

## GoF Observer 구조

```cpp
class IObserver {
public:
    virtual ~IObserver() = default;
    virtual void update(int new_value) = 0;
};

class Subject {
    std::vector<IObserver*> observers_;
    int value_ = 0;
public:
    void attach(IObserver* o) { observers_.push_back(o); }
    void detach(IObserver* o) {
        observers_.erase(std::remove(observers_.begin(), observers_.end(), o),
                          observers_.end());
    }

    void set_value(int v) {
        value_ = v;
        notify();
    }

    void notify() {
        for (auto* o : observers_) o->update(value_);
    }
};

class ConcreteObserver : public IObserver {
public:
    void update(int v) override { std::cout << "Value: " << v << '\n'; }
};

// 사용
Subject s;
ConcreteObserver o1, o2;
s.attach(&o1);
s.attach(&o2);
s.set_value(42);     // o1, o2 모두 알림을 받는다
```

## 모던 — std::function 기반

```cpp
class EventBus {
    std::vector<std::function<void(int)>> listeners_;
public:
    using Handle = size_t;

    Handle subscribe(std::function<void(int)> cb) {
        listeners_.push_back(std::move(cb));
        return listeners_.size() - 1;
    }

    void publish(int value) {
        for (auto& l : listeners_) l(value);
    }
};

EventBus bus;
bus.subscribe([](int v) { std::cout << "A: " << v << '\n'; });
bus.subscribe([](int v) { std::cout << "B: " << v << '\n'; });
bus.publish(42);     // A와 B가 모두 호출된다
```

장점은 다음과 같다.

- 클래스 hierarchy가 필요 없다.
- 람다로 즉시 등록한다.
- 값 의미론을 유지한다.

## 함정 1 — Dangling reference

```cpp
class Widget {
    EventBus& bus_;
public:
    Widget(EventBus& b) : bus_(b) {
        bus_.subscribe([this](int v) {     // ⚠️ this를 캡처한다
            this->handle(v);
        });
    }

    void handle(int v) { /* ... */ }
};

{
    Widget w{bus};
}     // w가 소멸 — 그러나 bus의 listener에는 dangling this가 남는다

bus.publish(42);     // ⚠️ 죽은 객체를 호출한다 — UB
```

Widget이 bus보다 먼저 소멸한다. listener가 죽은 객체를 부른다.

해법 1 — subscribe할 때 받은 핸들로 RAII unsubscribe.

```cpp
class Widget {
    EventBus& bus_;
    EventBus::Handle handle_;
public:
    Widget(EventBus& b) : bus_(b) {
        handle_ = bus_.subscribe([this](int v) { this->handle(v); });
    }

    ~Widget() {
        bus_.unsubscribe(handle_);     // RAII
    }
};
```

RAII로 자동 unsubscribe다(Beautiful C++ 항목 30).

해법 2 — `weak_ptr`(다음 함정에서 다룬다).

## 함정 2 — 라이프타임 관리

```cpp
auto w = std::make_shared<Widget>();
bus.subscribe([w](int v) { w->handle(v); });     // ⚠️ 강한 참조 — 순환?
```

`shared_ptr`를 캡처하면 w가 bus의 listener에 의해 계속 살아남는다. Widget이 영원히 죽지 않는다.

해법은 `weak_ptr`다.

```cpp
auto w = std::make_shared<Widget>();
std::weak_ptr<Widget> weak_w = w;

bus.subscribe([weak_w](int v) {
    if (auto w = weak_w.lock()) {     // 살아 있으면
        w->handle(v);
    }
    // 죽었으면 — silent skip (또는 unsubscribe)
});
```

`weak_ptr.lock()`이 객체가 살아 있으면 shared_ptr을 반환하고, 죽었으면 empty다. 라이프타임이 안전해진다.

## 함정 3 — 순환 참조

```cpp
class A {
    std::shared_ptr<B> b_;
public:
    void use_b() { b_->method(); }
};

class B {
    std::shared_ptr<A> a_;
    EventBus& bus_;
public:
    B(EventBus& bus, std::shared_ptr<A> a) : bus_(bus), a_(a) {
        bus_.subscribe([this](int v) { a_->use_b(); });
    }
};
```

A와 B가 순환한다. 혹은 bus까지 강한 참조를 가지면 bus를 포함하는 순환이 된다.

해법은 `weak_ptr`와 명확한 소유 모델이다.

## 함정 4 — 재진입

```cpp
class EventBus {
    std::vector<std::function<void()>> listeners_;
public:
    void publish() {
        for (auto& l : listeners_) l();     // ⚠️ listener가 subscribe를 호출하면?
    }

    void subscribe(std::function<void()> cb) {
        listeners_.push_back(std::move(cb));     // vector 변경 — iterator 무효
    }
};

bus.subscribe([&bus]() {
    bus.subscribe([](){ /* ... */ });     // ⚠️ publish 도중 subscribe
});

bus.publish();     // 미정의 동작
```

publish 도중 listener가 subscribe / unsubscribe / 또 다른 publish를 호출하면 iterator나 vector가 망가진다.

해법은 다음과 같다.

```cpp
// 옵션 1 — 복사본을 순회한다
void publish() {
    auto copy = listeners_;     // 복사
    for (auto& l : copy) l();
}

// 옵션 2 — 변경을 지연시킨다(pending queue)
class EventBus {
    std::vector<std::function<void()>> listeners_;
    std::vector<std::function<void()>> pending_subs_;
    bool publishing_ = false;
public:
    void subscribe(std::function<void()> cb) {
        if (publishing_) {
            pending_subs_.push_back(std::move(cb));
        } else {
            listeners_.push_back(std::move(cb));
        }
    }

    void publish() {
        publishing_ = true;
        for (auto& l : listeners_) l();

        // 지연된 subscribe를 반영한다
        for (auto& s : pending_subs_) listeners_.push_back(std::move(s));
        pending_subs_.clear();

        publishing_ = false;
    }
};
```

복잡하다. Boost.Signals2가 이미 이 문제를 다 처리해 둔다.

## 함정 5 — 예외 처리

```cpp
void publish() {
    for (auto& l : listeners_) {
        l();     // ⚠️ throw하면? 나머지 listener는?
    }
}
```

한 listener가 throw하면 나머지 listener는 알림을 받지 못한다. publish 메서드 자체도 예외를 전파한다.

해법은 listener별로 격리하는 것이다.

```cpp
void publish() {
    for (auto& l : listeners_) {
        try {
            l();
        } catch (...) {
            log_error("Listener threw");
            // 나머지를 계속 처리한다
        }
    }
}
```

## 함정 6 — 순서 의존

```cpp
bus.subscribe(listener_A);
bus.subscribe(listener_B);

// publish 시 A가 먼저인가, B가 먼저인가?
// vector를 순회하면 등록 순서대로다
// 사용자가 이 순서에 의존한다면? — 디자인 결정이다
```

순서 보장을 명시한다. `std::vector` 기반이면 FIFO다. `std::set`이나 `std::map`이면 다른 순서가 된다.

```cpp
/// Listeners are called in registration order.
/// Do not rely on any specific order for correctness.
class EventBus { /* ... */ };
```

## 함정 7 — 멀티스레드

```cpp
class EventBus {
    std::vector<std::function<void()>> listeners_;
    // 다른 스레드가 subscribe를 호출하면?
};
```

멀티스레드 환경에서는 mutex 또는 lock-free 자료구조가 필요하다.

```cpp
class EventBus {
    std::vector<std::function<void()>> listeners_;
    mutable std::mutex mu_;
public:
    void subscribe(std::function<void()> cb) {
        std::lock_guard lock(mu_);
        listeners_.push_back(std::move(cb));
    }

    void publish() {
        std::vector<std::function<void()>> snapshot;
        {
            std::lock_guard lock(mu_);
            snapshot = listeners_;     // 락 안에서 복사한다
        }
        // 락 밖에서 listener를 호출한다 (다른 publish를 블록하지 않는다)
        for (auto& l : snapshot) l();
    }
};
```

## 모던 — RAII Subscription

```cpp
class Subscription {
    std::function<void()> unsub_;
public:
    explicit Subscription(std::function<void()> u) : unsub_(std::move(u)) {}
    ~Subscription() { if (unsub_) unsub_(); }

    Subscription(Subscription&& other) noexcept = default;
    Subscription& operator=(Subscription&& other) noexcept = default;
    Subscription(const Subscription&) = delete;
};

class EventBus {
public:
    [[nodiscard]]
    Subscription subscribe(std::function<void()> cb) {
        // ...
        return Subscription{[this, handle = ...]() {
            this->unsubscribe(handle);
        }};
    }
};

{
    auto sub = bus.subscribe([]() { /* ... */ });
    // ... 사용 ...
}     // sub가 소멸하면서 자동으로 unsubscribe
```

Boost.Signals2의 `boost::signals2::connection`과 같은 패턴이다.

## Push와 Pull 모델

```cpp
// Push — 알림에 데이터를 함께 전달한다
class EventBus {
    void publish(const Event& e) {
        for (auto& l : listeners_) l(e);     // 데이터 전달
    }
};

// Pull — 알림만 주고, 데이터는 listener가 fetch한다
class EventBus {
    void notify() {
        for (auto& l : listeners_) l();     // 알림만 보낸다
    }
};

bus.subscribe([&subject]() {
    auto data = subject.current_data();     // listener가 직접 가져온다
});
```

Push가 단순하고 빠르다. Pull은 listener가 자기에게 필요한 데이터만 가져온다. 대부분의 경우 Push로 충분하다.

## Signal-Slot — Qt 스타일

```cpp
class Widget : public QObject {
    Q_OBJECT
signals:
    void clicked();     // signal — Qt가 처리한다

public slots:
    void on_click() { /* ... */ }     // slot
};

connect(button, &Button::clicked, widget, &Widget::on_click);
```

Qt는 moc(meta-object compiler)로 자동화한다. 컴파일 타임 타입 검사를 받는다.

C++ 표준에는 없다. Qt나 Boost.Signals2를 쓴다.

## Boost.Signals2

```cpp
#include <boost/signals2/signal.hpp>

boost::signals2::signal<void(int)> on_value_changed;

auto conn = on_value_changed.connect([](int v) {
    std::cout << "Value: " << v << '\n';
});

on_value_changed(42);     // 모든 slot이 호출된다

conn.disconnect();     // 명시적 해제
```

기능은 다음과 같다.

- 다중 slot(1:N).
- Connection RAII(`scoped_connection`).
- Thread-safe.
- Slot priority / grouping.
- Combiner(반환값 결합).

C++ 표준이 흡수하지 않은 강력한 라이브러리다.

## 비동기 — Message Queue

```cpp
class AsyncEventBus {
    std::queue<std::function<void()>> queue_;
    std::mutex mu_;
    std::thread worker_;

public:
    AsyncEventBus() {
        worker_ = std::thread([this]() {
            while (running_) {
                std::function<void()> task;
                {
                    std::lock_guard lock(mu_);
                    if (queue_.empty()) continue;
                    task = std::move(queue_.front());
                    queue_.pop();
                }
                try { task(); } catch (...) { /* log */ }
            }
        });
    }

    void publish_async(std::function<void()> task) {
        std::lock_guard lock(mu_);
        queue_.push(std::move(task));
    }
};
```

Publisher와 listener가 다른 스레드에서 실행된다. 비동기다.

## std::variant 기반 Event

```cpp
struct Click  { int x, y; };
struct Key    { char ch; };
struct Resize { int w, h; };

using Event = std::variant<Click, Key, Resize>;

class EventBus {
    std::vector<std::function<void(const Event&)>> listeners_;
public:
    void publish(Event e) {
        for (auto& l : listeners_) l(e);
    }
};

bus.publish(Click{10, 20});
bus.publish(Key{'a'});

bus.subscribe([](const Event& e) {
    std::visit(std::overload{
        [](const Click& c) { std::cout << "Click: " << c.x << "," << c.y; },
        [](const Key& k)   { std::cout << "Key: " << k.ch; },
        [](const Resize& r) { std::cout << "Resize: " << r.w << "x" << r.h; }
    }, e);
});
```

이벤트가 variant로 표현된다. 타입 안전성과 직렬화 가능성을 함께 갖춘다.

## Observer + DI

```cpp
class IEventListener {
public:
    virtual void on_event(const Event&) = 0;
};

class Service {
    IEventListener& listener_;     // DI
public:
    explicit Service(IEventListener& l) : listener_(l) {}
};

// 테스트 — fake listener
class TestListener : public IEventListener {
    std::vector<Event> received_;
public:
    void on_event(const Event& e) override { received_.push_back(e); }
};
```

DI와 Observer가 만나면 테스트 친화성이 올라간다.

## 함정 — Observer의 양방향 통신

```cpp
class EventBus {
    void publish(int v) {
        for (auto& l : listeners_) {
            l(v);     // listener가 publish를 다시 호출하면?
        }
    }
};

bus.subscribe([&bus](int v) {
    if (v < 100) bus.publish(v + 1);     // 재귀 — stack overflow
});

bus.publish(0);     // 무한 재귀
```

발행자와 구독자가 양방향으로 호출하면 무한 루프가 생긴다. 방어 장치를 둔다.

```cpp
class EventBus {
    std::set<std::thread::id> publishing_threads_;
public:
    void publish(int v) {
        auto tid = std::this_thread::get_id();
        if (publishing_threads_.contains(tid)) {
            log_warning("Re-entrant publish — ignoring");
            return;
        }
        publishing_threads_.insert(tid);
        // ...
        publishing_threads_.erase(tid);
    }
};
```

또는 이벤트 큐(async)로 분리한다.

## 라이프타임 패턴 정리

```cpp
// 1) Subscription RAII
auto sub = bus.subscribe(...);     // sub가 소멸하면 자동 unsubscribe

// 2) weak_ptr 캡처
bus.subscribe([w = std::weak_ptr<X>{x}](int v) {
    if (auto sp = w.lock()) sp->handle(v);
});

// 3) Manual unsubscribe
auto handle = bus.subscribe(...);
// ...
bus.unsubscribe(handle);     // 명시
```

가장 안전한 것은 Subscription RAII다.

## 모던 C++의 Observer 라이브러리

```cpp
// Boost.Signals2
boost::signals2::signal<void(int)> sig;

// libsigc++
sigc::signal<void(int)> sig;

// 자체 EventBus
class EventBus { /* ... */ };
```

표준에는 없다. 라이브러리를 고르거나 직접 만든다.

## C++26 — std::observer_ptr (제안)

```cpp
std::observer_ptr<Widget> obs = widget;     // 비-소유, nullable
```

`observer_ptr`는 의미적 명확성을 노린다. 표준 채택 논의가 진행 중이다.

## Observer 적용 시 결정

```
1:N 알림 메커니즘이 필요하다 — Observer?
├── 동기 알림 → std::function 기반 EventBus
├── 비동기 → Message Queue + thread
├── Qt 환경 → Signal-Slot
├── Boost를 쓸 수 있다 → Boost.Signals2
└── 단순 callback(1:1) → std::function 멤버
```

## 실무 가이드 — 체크리스트

Observer를 적용할 때 다음을 점검한다.

- [ ] 라이프타임이 분명한가? (subscription RAII / weak_ptr)
- [ ] 순환 참조가 없는가? (weak_ptr)
- [ ] 재진입을 다루는가? (snapshot, pending queue)
- [ ] 예외를 격리하는가? (publish 안에서 try/catch)
- [ ] 순서 의존을 명시했는가?
- [ ] 멀티스레드를 다루는가? (mutex 또는 lock-free)
- [ ] 단순 callback(1:1)이면 `std::function` 멤버로 충분하지 않은가?

## 정리

**Observer 패턴**은 1:N 알림 메커니즘이다.

모던 구현은 다음과 같다.

- **`std::function`** — 람다와 functor 자유.
- **`weak_ptr`** — 라이프타임 안전.
- **Subscription RAII** — 자동 unsubscribe.
- **`std::variant`** — 타입 안전 이벤트.

함정은 일곱 가지다.

1. Dangling reference
2. 순환 참조
3. 재진입
4. 예외 전파
5. 순서 의존
6. 멀티스레드
7. 양방향 통신의 무한 루프

라이브러리는 다음을 고른다.

- **Boost.Signals2** — 검증된 표준급
- **Qt Signal-Slot** — Qt 환경
- **자체 EventBus** — 단순 도메인

## 관련 항목

- [가이드라인 11: 명시적 공유 최소화](/blog/programming/cpp/beautiful-cpp/item11-minimize-explicit-data-sharing) — 라이프타임
- [가이드라인 21: Command](/blog/programming/cpp/cpp-software-design/guideline21-use-command-to-isolate-what-things-are-done) — 함수 객체
- [GoF Observer](/blog/programming/design/gof-design-patterns/item18-memento) — 원본
- [Beautiful C++ 항목 30: RAII](/blog/programming/cpp/beautiful-cpp/item30-use-raii-to-prevent-leaks) — Subscription RAII
