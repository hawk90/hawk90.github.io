---
title: "가이드라인 13: 디자인 패턴은 어디에나 있다"
date: 2026-05-13T23:00:00
description: "C++ 표준 라이브러리 곳곳에 패턴 — std::function (Type Erasure), std::visit (Visitor), iterator (Iterator). 일상에서 패턴 인식."
tags: [C++, Software Design, Design Patterns, Standard Library]
series: "C++ Software Design"
seriesOrder: 13
---

## 왜 이 가이드라인이 중요한가?

C++ 코드를 — 매일 작성하는데 알아채지 못하는 사실: **패턴은 어디에나 있다**.

```cpp
std::vector<int> v;                              // Iterator
std::sort(v.begin(), v.end(),                    // Strategy (비교 함수)
          [](int a, int b) { return a < b; });   // 람다는 Strategy의 구현
std::variant<int, std::string> x = 42;            // Sum Type
std::visit([](auto&& v) { /* ... */ }, x);        // Visitor
std::shared_ptr<Widget> p;                        // Reference Counting
auto factory = []() { return Widget{}; };          // Factory Method
```

표준 라이브러리 — **GoF 패턴의 모범 적용**. 인식하면:
- 자기 코드의 패턴도 보임
- 표준 도구 효율적 사용
- 새 패턴 발견의 토대

이 가이드라인은 — 어디에 어떤 패턴이 있는지의 카탈로그.

## 핵심 내용

- **C++ 표준 라이브러리**가 — 패턴의 모범
- `std::function`, `std::visit`, `std::any` 등은 — 직접 type erasure / visitor
- 패턴 인식은 — **이름 짓기**(naming) 능력의 핵심
- 일상 코드에 — 무의식적으로 적용된 패턴 多
- 패턴 식별 → **의도적 사용** + **팀과 공유 어휘**

## 표준 라이브러리의 패턴

### Iterator

```cpp
std::vector<int> v{1, 2, 3};
for (auto it = v.begin(); it != v.end(); ++it) {
    std::cout << *it;
}

// range-based for도 iterator 활용
for (int x : v) std::cout << x;
```

**Iterator pattern** — 컨테이너의 내부 구조 노출 없이 순회. GoF 그대로 + C++ 모던 적용.

### Strategy

```cpp
std::sort(v.begin(), v.end(),
          [](int a, int b) { return a > b; });   // 비교 전략을 람다로

std::sort(v.begin(), v.end(),
          std::greater<int>{});                    // 표준 functor

struct LengthCompare {
    bool operator()(const std::string& a, const std::string& b) const {
        return a.size() < b.size();
    }
};
std::sort(strs.begin(), strs.end(), LengthCompare{});
```

**Strategy pattern** — 비교 알고리즘을 매개변수로. 함수 객체 / 람다 / functor 모두 가능.

### Visitor

```cpp
using Shape = std::variant<Circle, Square, Triangle>;

double area(const Shape& s) {
    return std::visit([](const auto& specific) {
        return specific.area();
    }, s);
}
```

`std::visit` — 가이드라인 16-17의 모던 Visitor. 가상 함수 없이 type-safe.

### Type Erasure

```cpp
std::function<int(int)> f = [](int x) { return x * 2; };
std::function<int(int)> g = some_function;
std::function<int(int)> h = MyFunctor{};

// 다른 타입의 callable — 같은 std::function 인터페이스
```

`std::function` — type erasure의 표본. 가이드라인 32-34에서 깊이.

```cpp
std::any v = 42;
v = std::string{"hello"};
v = std::vector<int>{1, 2, 3};

// 어떤 타입이든 보관 — type erasure
```

`std::any` — type erasure의 일반화.

### Adapter

```cpp
// std::stack은 std::deque를 adapt해 스택 인터페이스 제공
std::stack<int> s;     // 내부적으로 std::deque, std::vector, std::list 가능

// stream iterator — iterator 인터페이스로 stream adapt
std::istream_iterator<int> in(std::cin);
std::ostream_iterator<int> out(std::cout, " ");
std::copy(in, std::istream_iterator<int>{}, out);
```

`std::stack`, `std::queue`, `std::priority_queue` — Adapter pattern.

### Observer

```cpp
// 표준 직접 지원 X — Boost.Signals2 사용
boost::signals2::signal<void(int)> sig;
auto conn = sig.connect([](int x) { std::cout << x; });
sig(42);     // 모든 subscriber에 알림
```

또는 사용자 정의:

```cpp
class EventBus {
    std::vector<std::function<void(Event)>> listeners_;
public:
    void subscribe(std::function<void(Event)> cb) {
        listeners_.push_back(std::move(cb));
    }
    void publish(Event e) {
        for (auto& l : listeners_) l(e);
    }
};
```

가이드라인 25에서 자세히.

### Singleton

```cpp
// Meyers' singleton — function-local static
class Logger {
public:
    static Logger& instance() {
        static Logger l;     // C++11 magic static — thread-safe
        return l;
    }
};
```

표준이 — Singleton 권장 안 함. 가이드라인 37-38 "안티패턴".

### Factory Method

```cpp
class Widget {
public:
    static std::unique_ptr<Widget> create(Config c) {
        // 검증, 의존성 주입, 등
        return std::make_unique<Widget>(c);
    }
};

auto w = Widget::create(cfg);
```

명명 생성자 — 단순 Factory.

```cpp
// std::make_unique, std::make_shared — Factory Functions
auto p = std::make_unique<Widget>(args);
auto sp = std::make_shared<Widget>(args);
```

### Bridge / Pimpl

```cpp
class Widget {
    class Impl;                          // 전방 선언
    std::unique_ptr<Impl> impl_;          // Bridge / Pimpl
public:
    Widget();
    ~Widget();
    void method();
};

// .cpp
class Widget::Impl {
    // 실제 구현
};
```

**Pimpl** = Bridge의 C++ 특화. 가이드라인 28-29.

### Composite

```cpp
struct Tree {
    int value;
    std::vector<Tree> children;     // 재귀 — Tree 자체가 Tree의 컬렉션
};

// 또는 variant
using Node = std::variant<Leaf, std::vector<Node>>;
```

GoF Composite — 모던 variant로 표현.

### Decorator

```cpp
auto base_log = [](const std::string& msg) { std::cout << msg; };

auto with_timestamp = [base_log](const std::string& msg) {
    base_log("[" + now_str() + "] " + msg);
};

auto with_level = [with_timestamp](const std::string& msg, int level) {
    with_timestamp("[" + level_str(level) + "] " + msg);
};
```

람다 chain — Decorator. 또는 클래스:

```cpp
class TimestampLogger : public ILogger {
    ILogger& inner_;
public:
    void log(const std::string& msg) override {
        inner_.log("[" + now_str() + "] " + msg);
    }
};
```

가이드라인 35.

### Command

```cpp
std::function<void()> undo_op = [&]() { /* undo logic */ };

class CommandQueue {
    std::vector<std::function<void()>> commands_;
public:
    void enqueue(std::function<void()> cmd) {
        commands_.push_back(std::move(cmd));
    }
    void execute_all() {
        for (auto& c : commands_) c();
    }
};
```

`std::function`이 — Command의 모던 구현. 가이드라인 21.

### Template Method

```cpp
class Algorithm {
public:
    void run() {     // 골격
        prepare();
        execute();
        cleanup();
    }
protected:
    virtual void execute() = 0;
private:
    void prepare();   // 공통
    void cleanup();
};
```

NVI(Non-Virtual Interface) idiom — Template Method 패턴의 C++ 모범.

### Flyweight

```cpp
// 같은 작은 객체 — 공유
class StringPool {
    std::unordered_map<std::string, std::shared_ptr<std::string>> pool_;
public:
    std::shared_ptr<std::string> intern(const std::string& s) {
        auto it = pool_.find(s);
        if (it != pool_.end()) return it->second;
        auto sp = std::make_shared<std::string>(s);
        pool_[s] = sp;
        return sp;
    }
};
```

같은 값 객체 — 한 번만 보관, 모두가 공유. 메모리 절약.

`std::shared_ptr` — refcount 기반 공유 자체가 Flyweight 비슷.

### Proxy

```cpp
// 지연 초기화 — Proxy
class LazyLoadedImage {
    std::optional<Image> image_;
    std::string path_;
public:
    const Image& get() {
        if (!image_) image_ = load_image(path_);     // lazy
        return *image_;
    }
};
```

`std::optional` — Lazy Proxy의 단순 형태.

```cpp
// shared_ptr — refcount proxy
std::shared_ptr<Widget> p = std::make_shared<Widget>();
// p가 실제 Widget을 proxy
```

### State Machine

```cpp
class Document {
    enum class State { Draft, Review, Published, Archived };
    State state_ = State::Draft;
public:
    void submit_for_review() {
        if (state_ != State::Draft) throw "invalid transition";
        state_ = State::Review;
    }
    
    void publish() {
        if (state_ != State::Review) throw "invalid transition";
        state_ = State::Published;
    }
};
```

또는 `std::variant`:

```cpp
struct Draft     { void submit(); };
struct Review    { void approve(); };
struct Published { void archive(); };

using DocState = std::variant<Draft, Review, Published>;

class Document {
    DocState state_;
public:
    void submit() {
        if (auto* d = std::get_if<Draft>(&state_)) {
            state_ = Review{};
        }
    }
};
```

## 라이브러리 / 프레임워크의 패턴

### Boost

- **Boost.Signals2** — Observer
- **Boost.Variant** — Variant (std::variant 원형)
- **Boost.Optional** — Maybe / Optional
- **Boost.Asio** — Reactor pattern (event loop)
- **Boost.MSM** — Meta State Machine

### Qt

- **Signals & Slots** — Observer (커스텀 syntax)
- **Q_OBJECT** — moc로 reflection 흉내
- **Model/View** — MVC

### Unreal Engine

- **Components** — composition pattern
- **Blueprints** — visual scripting (Interpreter pattern)
- **Garbage Collection** — Mark-and-sweep
- **Delegate System** — Observer + Command

### Game Engines

- **Entity-Component-System (ECS)** — composition + data-oriented
- **State Machine** — 게임 캐릭터 AI
- **Object Pool** — 빈번한 생성/소멸 객체

## 일상 코드의 패턴

```cpp
// RAII — C++ 특화 패턴
{
    std::lock_guard lock(mu);
    // ...
}
```

**RAII** — GoF에 없는, C++의 가장 큰 발견. 자원 = 객체 라이프타임에 묶기. 모든 RAII 클래스가 패턴 적용.

```cpp
// CRTP — Curiously Recurring Template Pattern
template<typename Derived>
class Base {
public:
    void interface() { static_cast<Derived*>(this)->impl(); }
};

class Derived : public Base<Derived> {
public:
    void impl();
};
```

**CRTP** — C++ 특화. 컴파일 타임 다형성. 가이드라인 26-27.

```cpp
// Builder
class HttpRequest {
public:
    HttpRequest& method(const std::string&);
    HttpRequest& url(const std::string&);
    HttpRequest& header(const std::string&, const std::string&);
    HttpRequest& body(const std::string&);
    HttpResponse send();
};

auto resp = HttpRequest{}
    .method("POST")
    .url("/api/users")
    .header("Content-Type", "application/json")
    .body(R"({"name":"Alice"})")
    .send();
```

**Builder** — fluent API. 가이드라인 22에서도.

```cpp
// Null Object
class NullLogger : public ILogger {
public:
    void log(const std::string&) override {}     // do nothing
};

// 사용
auto logger = use_logging ? std::make_unique<FileLogger>("log.txt")
                          : std::make_unique<NullLogger>();
logger->log("...");     // null 검사 X — 항상 안전
```

**Null Object** — GoF 후속 패턴. nullable 회피.

## 함정 — 패턴 발견의 함정

```cpp
class UserManager {
public:
    User getUser(int id);
    void saveUser(User);
    std::vector<User> findUsers();
};

// 이건 Repository 패턴 — "발견"
```

발견 자체 — 좋음. 그러나 — **이름을 의식적으로**:

```cpp
class UserRepository {     // ← Repository 의도 명시
public:
    User get(int id);
    void persist(User);
    std::vector<User> find_all();
};
```

이름이 — 패턴 + 의도 전달. 가이드라인 14.

## 도메인 특화 패턴

각 도메인 — 자체 패턴:

### Web

- **MVC / MVVM** — Model-View-Controller
- **Middleware** — Chain of Responsibility
- **REST** — Resource-oriented
- **Repository** — Data Access

### Game

- **ECS** — Entity-Component-System
- **State Machine** — AI behavior
- **Object Pool** — 메모리 최적화
- **Component-based architecture**

### Embedded

- **RTOS Task** — Thread pool 변형
- **Interrupt Service Routine (ISR)** — Observer 비슷
- **Ring Buffer** — 자료구조 패턴

### Concurrency

- **Producer-Consumer** — 큐 기반
- **Reader-Writer Lock** — 동기화
- **Future / Promise** — Async 결과
- **Actor Model** — 메시지 기반

## 패턴 모음 책

GoF 외 — 도메인 특화 패턴 책:

- **Pattern-Oriented Software Architecture** (POSA) — 5권 시리즈
- **Patterns of Enterprise Application Architecture** (Fowler) — 웹 / 엔터프라이즈
- **Game Programming Patterns** (Nystrom, 무료) — 게임
- **Concurrency Patterns** (POSA 2권)
- **Implementation Patterns** (Beck) — 코드 수준 패턴

각 도메인 — 자체 어휘.

## 패턴 인식의 가치

```cpp
class A {
    std::vector<B*> bs_;
public:
    void register_b(B* b) { bs_.push_back(b); }
    void notify_all() { for (auto* b : bs_) b->update(); }
};
```

**"이건 Observer다"** 라고 인식하면:
- 코드 의도 즉시 이해
- 흔한 함정 (dangling, 순환, 예외) 인지
- 표준 해결책 활용 (`std::function`, `weak_ptr`)
- 팀과 같은 어휘로 소통

인식 못 하면 — 매번 처음부터 디자인.

## 패턴 → 이름 → 의도

```cpp
class XYZ_Handler { ... };     // 의미 없는 이름
class XYZ_Observer { ... };    // 패턴 이름 — 의도 전달
class XYZ_Validator { ... };   // 도메인 이름 + 패턴 의도
```

이름이 — 패턴 + 도메인 모두 전달이 이상적.

## 함정 — 패턴 식별 후 강제 적용

```cpp
// 단순 if-else를 Observer로 변환?
if (event == "click") doClick();
else if (event == "key") doKey();

// → Observer로 "변환"
class EventBus { /* ... */ };
EventBus bus;
bus.subscribe("click", doClick);
bus.subscribe("key", doKey);
// ⚠️ 단순한 코드를 더 복잡하게?
```

패턴 적용은 — **변화 압력 + 결합도 문제**가 있을 때. 단순 코드에 강제 X. 가이드라인 11, 12.

## 모던 변형 — 패턴이 라이브러리로

```cpp
// GoF 시대 — Observer 직접 구현
class Subject { /* ... */ };

// 모던 — Boost.Signals2 사용
boost::signals2::signal<void(int)> sig;
```

라이브러리가 — 검증된 구현 제공. 직접 구현 대신 활용.

## 깊은 메시지 — 패턴은 발견되는 것

> "**Patterns are discovered, not invented.**"

좋은 패턴 — 한 명이 "만든" 것 X. 수많은 프로젝트가 — 비슷한 문제를 비슷한 방식으로 해결. **반복적으로 효과적인 해결책**이 — 패턴.

자신의 코드를 — **반복** 검토. 같은 구조가 자주 나오면? — 패턴 후보. 명명하고 공유.

## 새 패턴 발견의 단계

1. **인식** — 같은 구조가 여러 번
2. **추상화** — 핵심 의도 추출
3. **명명** — 표준화된 이름
4. **문서화** — 의도, 적용 컨텍스트, 트레이드오프
5. **공유** — 팀 / 커뮤니티

C++ 커뮤니티가 — 지난 30년간 발견한 패턴들 (Type Erasure, CRTP, NVI, External Polymorphism) — 모두 이 과정.

## 실무 가이드 — 패턴 발견

코드 작성 / 리뷰 시:

- [ ] 비슷한 구조가 **여러 곳**에 보이는가? — 패턴 가능
- [ ] **이름을 붙일 수 있는가**? — 추상화 충분
- [ ] **표준 패턴 이름**이 있는가? — 사용
- [ ] **트레이드오프**를 인지하는가?
- [ ] 표준 라이브러리 도구가 — 같은 패턴?

## 실무 가이드 — 표준 도구 활용

문제 / 의도 → 표준 도구:

| 문제 | 표준 도구 |
| --- | --- |
| 다양한 callable | `std::function`, 람다 |
| sum type | `std::variant` |
| optional | `std::optional` |
| any type | `std::any` |
| 컨테이너 + 알고리즘 분리 | `<iterator>`, `<algorithm>` |
| 자원 관리 | `std::unique_ptr`, `std::shared_ptr` |
| 비교 / 정렬 | `std::sort`, `std::less` 등 |
| 비동기 | `std::async`, `std::future` |
| 동기화 | `std::mutex`, `std::lock_guard` |

직접 구현 전 — 표준 검토.

## 정리

디자인 패턴은 — **어디에나 있다**.

- C++ 표준 라이브러리가 — 패턴의 모범
- 도메인마다 자체 패턴
- 일상 코드에 무의식적 패턴

**가치**:
1. 패턴 인식 → 코드 의도 즉시 이해
2. 표준 도구 활용 → 직접 구현 회피
3. 공유 어휘 → 팀 소통
4. 새 패턴 발견 → 디자인 능력의 정점

도구:
- `std::function`, `std::variant`, `std::any` — type erasure / visitor / variant
- `std::visit` — Visitor
- `std::shared_ptr`, `std::unique_ptr` — Ownership
- 컨테이너 + iterator — Iterator
- RAII — 자원 관리
- CRTP — 컴파일 타임 다형성

## 관련 항목

- [가이드라인 11: 패턴의 목적](/blog/programming/cpp-software-design/guideline11-understand-the-purpose-of-design-patterns) — 패턴 정의
- [가이드라인 12: 패턴 오해](/blog/programming/cpp-software-design/guideline12-beware-of-design-pattern-misconceptions) — 식별 함정
- [가이드라인 14: 패턴 이름으로 의도](/blog/programming/cpp-software-design/guideline14-use-a-design-patterns-name-to-communicate-intent) — 이름과 소통
- [Effective Modern C++ 항목 18: unique_ptr](/blog/programming/effective-modern-cpp/item18-use-unique-ptr-for-exclusive-ownership) — Ownership 패턴
