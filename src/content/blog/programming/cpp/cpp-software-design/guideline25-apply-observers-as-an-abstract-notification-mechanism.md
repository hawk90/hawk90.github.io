---
title: "가이드라인 25: Observer를 추상 알림 메커니즘으로 적용하라"
date: 2026-05-14T21:00:00
description: "Observer 패턴 — pub/sub. 모던 C++ — std::function 기반, 라이프타임/순환/예외 함정 주의."
tags: [C++, Software Design, Observer, Pub-Sub]
series: "C++ Software Design"
seriesOrder: 25
---

## 왜 이 가이드라인이 중요한가?

이벤트 기반 시스템 — 흔한 패턴:

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

이게 — **Observer 패턴**의 모던 구현. 한 객체(Subject)가 — 여러 객체(Observers)에 이벤트 알림.

GoF Observer — 1994년 정의. 모던 C++:
- `std::function`으로 — 람다 / functor 등 자유
- Value semantics
- `shared_ptr` / `weak_ptr`로 라이프타임 관리

그러나 — Observer는 **함정 가득**한 패턴:
- Dangling reference
- 순환 참조
- 재진입 (update 중 attach/detach)
- 예외 전파
- 순서 의존

이 가이드라인 — Observer 패턴 + 흔한 함정 + 모던 구현.

## 핵심 내용

- **Observer 패턴** — 1:N 알림 메커니즘 (pub/sub)
- 모던 구현 — **`std::function`** 우선, `weak_ptr`로 라이프타임
- 함정 — dangling / 순환 / 재진입 / 예외 / 순서
- C++ 표준 — Boost.Signals2가 모범
- 비동기 알림 — Message Queue 패턴 검토

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
s.set_value(42);     // o1, o2 모두 알림
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
bus.publish(42);     // A, B 모두 호출
```

장점:
- 클래스 hierarchy 없음
- 람다로 즉시 등록
- Value semantics

## 함정 1 — Dangling reference

```cpp
class Widget {
    EventBus& bus_;
public:
    Widget(EventBus& b) : bus_(b) {
        bus_.subscribe([this](int v) {     // ⚠️ this 캡처
            this->handle(v);
        });
    }
    
    void handle(int v) { /* ... */ }
};

{
    Widget w{bus};
}     // w 소멸 — 하지만 bus의 listener엔 dangling this

bus.publish(42);     // ⚠️ dangling this 호출 — UB
```

Widget이 — bus보다 먼저 소멸. listener는 — 죽은 객체 호출.

해결 1: subscribe 시 — Widget 자기 자신을 unsubscribe 책임:

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

RAII로 — 자동 unsubscribe. 가이드라인 30 (Beautiful C++ — RAII).

해결 2: weak_ptr (다음 함정).

## 함정 2 — 라이프타임 관리

```cpp
auto w = std::make_shared<Widget>();
bus.subscribe([w](int v) { w->handle(v); });     // ⚠️ 강한 참조 — 순환?
```

`shared_ptr` 캡처 — w가 — bus의 listener에 의해 살아 있음. Widget이 — 영원히 안 죽음.

해결: `weak_ptr`:

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

`weak_ptr.lock()` — 객체 존재 시 shared_ptr 반환, 죽었으면 empty. 라이프타임 안전.

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

A ↔ B 순환. 또는 bus가 강한 참조 가지면 — bus까지 포함된 순환.

해결: `weak_ptr` + 명확한 ownership.

## 함정 4 — 재진입

```cpp
class EventBus {
    std::vector<std::function<void()>> listeners_;
public:
    void publish() {
        for (auto& l : listeners_) l();     // ⚠️ listener가 subscribe 호출하면?
    }
    
    void subscribe(std::function<void()> cb) {
        listeners_.push_back(std::move(cb));     // vector 변경 — iterator 무효
    }
};

bus.subscribe([&bus]() {
    bus.subscribe([](){ /* ... */ });     // ⚠️ publish 중 subscribe
});

bus.publish();     // 미정의 동작
```

publish 중 listener가 — subscribe / unsubscribe / 같은 publish 호출. iterator / vector 손상.

해결책들:

```cpp
// 옵션 1: 복사본 순회
void publish() {
    auto copy = listeners_;     // 복사
    for (auto& l : copy) l();
}

// 옵션 2: 변경을 지연 — pending queue
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
        
        // 지연된 subscribe 적용
        for (auto& s : pending_subs_) listeners_.push_back(std::move(s));
        pending_subs_.clear();
        
        publishing_ = false;
    }
};
```

복잡. Boost.Signals2 — 이미 처리.

## 함정 5 — 예외 처리

```cpp
void publish() {
    for (auto& l : listeners_) {
        l();     // ⚠️ throw하면? 나머지 listener는?
    }
}
```

한 listener가 — throw. 나머지 listener — 알림 받지 못함. publish 메서드 자체가 — 예외 전파.

해결:

```cpp
void publish() {
    for (auto& l : listeners_) {
        try {
            l();
        } catch (...) {
            log_error("Listener threw");
            // 나머지 계속 처리
        }
    }
}
```

각 listener — 격리. 한 실패가 — 다른 listener 영향 X.

## 함정 6 — 순서 의존

```cpp
bus.subscribe(listener_A);
bus.subscribe(listener_B);

// publish 시 A 먼저 호출 또는 B 먼저?
// 표준 vector 순회 — 등록 순서
// 사용자가 이 순서를 의존하면? — 디자인 결정
```

순서 보장 — 명시. `std::vector` 사용 시 — FIFO. `std::set` / `std::map` — 다른 순서.

문서화:

```cpp
/// Listeners are called in registration order.
/// Do not rely on any specific order for correctness.
class EventBus { /* ... */ };
```

## 함정 7 — 멀티스레드

```cpp
class EventBus {
    std::vector<std::function<void()>> listeners_;
    // 다른 스레드가 — subscribe 호출하면?
};
```

멀티스레드 — mutex 또는 lock-free.

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
            snapshot = listeners_;     // 락 안에서 복사
        }
        // 락 밖 — listener 호출 (다른 publish 안 블록)
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
}     // sub 소멸 — 자동 unsubscribe
```

Boost.Signals2 — `boost::signals2::connection` 같은 패턴.

## Push vs Pull Model

```cpp
// Push — 알림에 데이터 포함
class EventBus {
    void publish(const Event& e) {
        for (auto& l : listeners_) l(e);     // 데이터 전달
    }
};

// Pull — 알림만, 데이터는 listener가 fetch
class EventBus {
    void notify() {
        for (auto& l : listeners_) l();     // 알림만
    }
};

bus.subscribe([&subject]() {
    auto data = subject.current_data();     // listener가 fetch
});
```

Push — 단순, 빠름. Pull — listener가 자기 필요한 데이터만.

대다수 — push (간단).

## Signal-Slot — Qt 스타일

```cpp
class Widget : public QObject {
    Q_OBJECT
signals:
    void clicked();     // signal — Qt가 처리

public slots:
    void on_click() { /* ... */ }     // slot
};

connect(button, &Button::clicked, widget, &Widget::on_click);
```

Qt — moc(meta-object compiler)로 자동. 컴파일 타임 타입 검사.

C++ 표준 X — Qt 또는 Boost.Signals2.

## Boost.Signals2

```cpp
#include <boost/signals2/signal.hpp>

boost::signals2::signal<void(int)> on_value_changed;

auto conn = on_value_changed.connect([](int v) {
    std::cout << "Value: " << v << '\n';
});

on_value_changed(42);     // 모든 slot 호출

conn.disconnect();     // 명시적 해제
```

기능:
- Multi-slot (1:N)
- Connection RAII (`scoped_connection`)
- Thread-safe
- Slot priority / grouping
- Combiner (return values)

C++ 표준이 흡수 안 한 — 강력한 라이브러리.

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

Publisher와 listener — 분리된 스레드. 비동기.

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

이벤트 — variant. 타입 안전 + 직렬화 가능.

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

DI + Observer — 테스트 친화.

## 함정 — Observer 양방향 통신

```cpp
class EventBus {
    void publish(int v) {
        for (auto& l : listeners_) {
            l(v);     // listener가 publish 다시 호출?
        }
    }
};

bus.subscribe([&bus](int v) {
    if (v < 100) bus.publish(v + 1);     // 재귀 — stack overflow
});

bus.publish(0);     // 무한 재귀
```

발행자 ↔ 구독자 양방향 — 무한 루프 위험. 방어:

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

또는 — 이벤트 큐 (async).

## 라이프타임 패턴 정리

```cpp
// 1) Subscription RAII
auto sub = bus.subscribe(...);     // sub 소멸 시 자동 unsubscribe

// 2) weak_ptr 캡처
bus.subscribe([w = std::weak_ptr<X>{x}](int v) {
    if (auto sp = w.lock()) sp->handle(v);
});

// 3) Manual unsubscribe
auto handle = bus.subscribe(...);
// ...
bus.unsubscribe(handle);     // 명시
```

가장 안전 — Subscription RAII.

## 모던 C++ 라이브러리 — Observer

```cpp
// Boost.Signals2
boost::signals2::signal<void(int)> sig;

// libsigc++
sigc::signal<void(int)> sig;

// 자체 EventBus
class EventBus { /* ... */ };
```

표준 X — 라이브러리 선택. 또는 자체 구현.

## C++26 — std::observer_ptr (제안)

```cpp
std::observer_ptr<Widget> obs = widget;     // non-owning, nullable
```

`observer_ptr` — semantic clarity. 표준 채택 진행 중.

## Observer 적용 시 결정

```
1:N 알림 메커니즘 필요 — Observer?
├── 동기 알림 → std::function 기반 EventBus
├── 비동기 → Message Queue + thread
├── Qt 환경 → Signal-Slot
├── Boost OK → Boost.Signals2
└── 단순 callback (1:1) → std::function 멤버
```

## 실무 가이드 — 체크리스트

Observer 적용 시:

- [ ] **라이프타임 명확**? (subscription RAII / weak_ptr)
- [ ] **순환 참조** 없는가? (weak_ptr)
- [ ] **재진입** 처리? (snapshot, pending queue)
- [ ] **예외** 격리? (try/catch in publish)
- [ ] **순서 의존** 명시?
- [ ] **멀티스레드** — mutex 또는 lock-free?
- [ ] 단순 callback (1:1)이면 — `std::function` 멤버 충분?

## 정리

**Observer 패턴** — 1:N 알림 메커니즘.

모던 구현:
- **`std::function`** — 람다 / functor 자유
- **`weak_ptr`** — 라이프타임 안전
- **Subscription RAII** — 자동 unsubscribe
- **`std::variant`** — 타입 안전 이벤트

함정 (7개):
1. Dangling reference
2. 순환 참조
3. 재진입
4. 예외 전파
5. 순서 의존
6. 멀티스레드
7. 양방향 통신 무한 루프

라이브러리:
- **Boost.Signals2** — 검증된 표준
- **Qt Signal-Slot** — Qt 환경
- **자체 EventBus** — 단순 도메인

## 관련 항목

- [가이드라인 11: 명시적 공유 최소화](/blog/programming/cpp/beautiful-cpp/item11-minimize-explicit-data-sharing) — 라이프타임
- [가이드라인 21: Command](/blog/programming/cpp/cpp-software-design/guideline21-use-command-to-isolate-what-things-are-done) — 함수 객체
- [GoF Observer](/blog/programming/design/gof-design-patterns/item18-observer) — 원본
- [Beautiful C++ 항목 30: RAII](/blog/programming/cpp/beautiful-cpp/item30-use-raii-to-prevent-leaks) — Subscription RAII
