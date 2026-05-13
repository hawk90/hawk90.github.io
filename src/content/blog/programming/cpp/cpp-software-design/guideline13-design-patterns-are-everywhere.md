---
title: "가이드라인 13: 디자인 패턴은 어디에나 있다"
date: 2026-05-13T23:00:00
description: "C++ 표준 라이브러리 곳곳에 패턴이 있다. std::function의 Type Erasure, std::visit의 Visitor, iterator의 Iterator를 알아보는 일."
tags: [C++, Software Design, Design Patterns, Standard Library]
series: "C++ Software Design"
seriesOrder: 13
draft: true
---

## 왜 이 가이드라인이 중요한가?

매일 C++ 코드를 쓰면서도 알아채지 못하는 사실이 있다. **패턴은 어디에나 있다**.

```cpp
std::vector<int> v;                              // Iterator
std::sort(v.begin(), v.end(),                    // Strategy(비교 함수)
          [](int a, int b) { return a < b; });   // 람다는 Strategy의 구현이다
std::variant<int, std::string> x = 42;            // Sum Type
std::visit([](auto&& v) { /* ... */ }, x);        // Visitor
std::shared_ptr<Widget> p;                        // Reference Counting
auto factory = []() { return Widget{}; };          // Factory Method
```

표준 라이브러리는 GoF 패턴의 모범 사례 모음이다. 이걸 인식하기 시작하면 다음이 따라온다.

- 내 코드에 숨어 있던 패턴이 보인다.
- 표준 도구를 더 효율적으로 쓰게 된다.
- 새 패턴을 발견할 토대가 생긴다.

이 가이드라인은 어디에 어떤 패턴이 있는지를 정리한 카탈로그다.

## 핵심 내용

- C++ 표준 라이브러리가 패턴의 모범이다.
- `std::function`, `std::visit`, `std::any`가 곧 type erasure / visitor의 직접 구현이다.
- 패턴 인식 능력은 **이름 짓기**(naming) 능력의 핵심이다.
- 일상 코드에는 무의식적으로 적용된 패턴이 많다.
- 패턴을 식별하면 의도적 사용과 팀의 공유 어휘로 이어진다.

## 표준 라이브러리의 패턴

### Iterator

```cpp
std::vector<int> v{1, 2, 3};
for (auto it = v.begin(); it != v.end(); ++it) {
    std::cout << *it;
}

// range-based for도 iterator를 활용한다
for (int x : v) std::cout << x;
```

**Iterator 패턴** — 컨테이너 내부 구조를 노출하지 않고 순회한다. GoF 그대로의 C++ 모던 적용이다.

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

**Strategy 패턴** — 비교 알고리즘을 매개변수로 받는다. 함수 객체, 람다, functor 모두 가능하다.

### Visitor

```cpp
using Shape = std::variant<Circle, Square, Triangle>;

double area(const Shape& s) {
    return std::visit([](const auto& specific) {
        return specific.area();
    }, s);
}
```

`std::visit`이 가이드라인 16~17에서 다룰 모던 Visitor다. 가상 함수 없이 type-safe하게 처리한다.

### Type Erasure

```cpp
std::function<int(int)> f = [](int x) { return x * 2; };
std::function<int(int)> g = some_function;
std::function<int(int)> h = MyFunctor{};

// 서로 다른 타입의 callable이 같은 std::function 인터페이스에 들어간다
```

`std::function`은 type erasure의 표본이다(가이드라인 32~34에서 자세히).

```cpp
std::any v = 42;
v = std::string{"hello"};
v = std::vector<int>{1, 2, 3};

// 어떤 타입이든 보관한다 — type erasure
```

`std::any`는 type erasure를 일반화한 도구다.

### Adapter

```cpp
// std::stack은 std::deque를 adapt해 스택 인터페이스를 제공한다
std::stack<int> s;     // 내부 컨테이너로 std::deque, std::vector, std::list 가능

// stream iterator는 iterator 인터페이스로 stream을 adapt한다
std::istream_iterator<int> in(std::cin);
std::ostream_iterator<int> out(std::cout, " ");
std::copy(in, std::istream_iterator<int>{}, out);
```

`std::stack`, `std::queue`, `std::priority_queue`가 Adapter 패턴이다.

### Observer

```cpp
// 표준이 직접 지원하지는 않는다. Boost.Signals2를 자주 쓴다
boost::signals2::signal<void(int)> sig;
auto conn = sig.connect([](int x) { std::cout << x; });
sig(42);     // 모든 subscriber에 알린다
```

직접 만들 수도 있다.

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

자세한 내용은 가이드라인 25에서 다룬다.

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

표준은 Singleton을 권장하지 않는다. 가이드라인 37~38에서 "안티패턴"으로 다룬다.

### Factory Method

```cpp
class Widget {
public:
    static std::unique_ptr<Widget> create(Config c) {
        // 검증, 의존성 주입 등
        return std::make_unique<Widget>(c);
    }
};

auto w = Widget::create(cfg);
```

이름 있는 생성자는 가장 단순한 Factory다.

```cpp
// std::make_unique, std::make_shared 자체가 Factory 함수다
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

Pimpl은 Bridge의 C++ 특화 형태다. 가이드라인 28~29에서 다룬다.

### Composite

```cpp
struct Tree {
    int value;
    std::vector<Tree> children;     // 재귀 — Tree 자체가 Tree의 컬렉션이다
};

// 또는 variant
using Node = std::variant<Leaf, std::vector<Node>>;
```

GoF의 Composite를 모던 variant로 풀어낸 모양이다.

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

람다 체인이 곧 Decorator다. 클래스 기반으로도 가능하다.

```cpp
class TimestampLogger : public ILogger {
    ILogger& inner_;
public:
    void log(const std::string& msg) override {
        inner_.log("[" + now_str() + "] " + msg);
    }
};
```

가이드라인 35에서 자세히 다룬다.

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

`std::function`이 Command의 모던 구현이다(가이드라인 21).

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

NVI(Non-Virtual Interface) idiom이 Template Method 패턴의 C++ 모범 사례다.

### Flyweight

```cpp
// 같은 작은 객체를 공유한다
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

같은 값 객체를 한 번만 보관하고 모두가 공유한다. 메모리가 절약된다.

`std::shared_ptr`의 refcount 기반 공유도 Flyweight에 가까운 사고다.

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

`std::optional`이 Lazy Proxy의 단순 형태다.

```cpp
// shared_ptr 자체가 refcount proxy다
std::shared_ptr<Widget> p = std::make_shared<Widget>();
// p가 실제 Widget을 proxy한다
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

`std::variant`로도 표현할 수 있다.

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

## 라이브러리와 프레임워크의 패턴

### Boost

- **Boost.Signals2** — Observer
- **Boost.Variant** — Variant (`std::variant`의 원형)
- **Boost.Optional** — Maybe / Optional
- **Boost.Asio** — Reactor 패턴(event loop)
- **Boost.MSM** — Meta State Machine

### Qt

- **Signals & Slots** — Observer(커스텀 syntax)
- **Q_OBJECT** — moc로 reflection을 흉내
- **Model/View** — MVC

### Unreal Engine

- **Components** — composition
- **Blueprints** — visual scripting(Interpreter)
- **Garbage Collection** — Mark-and-sweep
- **Delegate System** — Observer + Command

### Game Engines

- **Entity-Component-System(ECS)** — composition + data-oriented
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

**RAII**는 GoF에 없는, C++의 가장 큰 발견이다. 자원을 객체 라이프타임에 묶는다. 모든 RAII 클래스가 곧 이 패턴이다.

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

**CRTP**는 C++ 특화 패턴이다. 컴파일 타임 다형성을 만든다. 가이드라인 26~27에서 자세히.

```cpp
// Builder — fluent API
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

**Builder** — fluent API. 가이드라인 22에서도 등장한다.

```cpp
// Null Object
class NullLogger : public ILogger {
public:
    void log(const std::string&) override {}     // 아무것도 하지 않는다
};

// 사용
auto logger = use_logging ? std::make_unique<FileLogger>("log.txt")
                          : std::make_unique<NullLogger>();
logger->log("...");     // null 검사 없이 늘 안전하다
```

**Null Object** — GoF의 후속 패턴. nullable을 피한다.

## 함정 — 패턴 발견의 함정

```cpp
class UserManager {
public:
    User getUser(int id);
    void saveUser(User);
    std::vector<User> findUsers();
};

// 이건 Repository 패턴이라는 "발견"
```

발견 자체는 좋다. 하지만 의도를 이름으로 드러내자.

```cpp
class UserRepository {     // ← Repository라는 의도를 이름에 둔다
public:
    User get(int id);
    void persist(User);
    std::vector<User> find_all();
};
```

이름이 패턴과 의도를 함께 전달한다. 가이드라인 14의 이야기다.

## 도메인 특화 패턴

도메인마다 자체 패턴이 있다.

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
- **Interrupt Service Routine(ISR)** — Observer에 가까운 패턴
- **Ring Buffer** — 자료구조 패턴

### Concurrency

- **Producer-Consumer** — 큐 기반
- **Reader-Writer Lock** — 동기화
- **Future / Promise** — 비동기 결과
- **Actor Model** — 메시지 기반

## 패턴 책

GoF 외에도 도메인 특화 패턴 책이 많다.

- **Pattern-Oriented Software Architecture(POSA)** — 5권 시리즈
- **Patterns of Enterprise Application Architecture**(Fowler) — 웹 / 엔터프라이즈
- **Game Programming Patterns**(Nystrom, 무료) — 게임
- **Concurrency Patterns**(POSA 2권)
- **Implementation Patterns**(Beck) — 코드 수준 패턴

각 도메인이 자기 어휘를 갖춰 두었다.

## 패턴 인식의 가치

```cpp
class A {
    std::vector<B*> bs_;
public:
    void register_b(B* b) { bs_.push_back(b); }
    void notify_all() { for (auto* b : bs_) b->update(); }
};
```

*"이건 Observer다"* 라고 인식하는 순간 다음이 따라온다.

- 코드의 의도를 즉시 이해한다.
- 흔한 함정(dangling, 순환, 예외 등)을 미리 인지한다.
- 표준 해결책(`std::function`, `weak_ptr`)을 활용한다.
- 팀과 같은 어휘로 소통한다.

인식하지 못하면 매번 처음부터 디자인하게 된다.

## 패턴 → 이름 → 의도

```cpp
class XYZ_Handler { ... };     // 의미가 비어 있는 이름
class XYZ_Observer { ... };    // 패턴 이름이 의도를 전달한다
class XYZ_Validator { ... };   // 도메인 이름이 패턴 의도와 함께 드러난다
```

이름이 패턴과 도메인을 모두 전달하는 것이 이상적이다.

## 함정 — 패턴을 식별한 뒤 강제로 적용한다

```cpp
// 단순 if-else를 Observer로 변환?
if (event == "click") doClick();
else if (event == "key") doKey();

// → Observer로 "변환"
class EventBus { /* ... */ };
EventBus bus;
bus.subscribe("click", doClick);
bus.subscribe("key", doKey);
// ⚠️ 단순한 코드를 더 복잡하게 만들었다
```

패턴은 변화 압력이나 결합도 문제가 있을 때 꺼낸다. 단순한 코드에 강제할 일이 아니다(가이드라인 11~12).

## 모던 변형 — 패턴이 라이브러리로 들어왔다

```cpp
// GoF 시대 — Observer를 직접 구현
class Subject { /* ... */ };

// 모던 — Boost.Signals2를 그대로 쓴다
boost::signals2::signal<void(int)> sig;
```

라이브러리가 검증된 구현을 제공한다. 직접 구현하기 전에 라이브러리부터 본다.

## 깊은 메시지 — 패턴은 발견된다

> "**Patterns are discovered, not invented.**"

좋은 패턴은 한 사람이 "만든" 게 아니다. 수많은 프로젝트가 비슷한 문제를 비슷한 방식으로 해결해 왔다. 그 **반복적으로 효과적인 해결책**이 곧 패턴이다.

자신의 코드를 반복해서 살피자. 같은 구조가 자주 보인다면 패턴 후보다. 이름을 붙이고 공유한다.

## 새 패턴 발견의 단계

1. **인식** — 같은 구조가 여러 번 등장한다.
2. **추상화** — 핵심 의도를 추출한다.
3. **명명** — 표준화된 이름을 붙인다.
4. **문서화** — 의도, 적용 컨텍스트, 트레이드오프를 정리한다.
5. **공유** — 팀과 커뮤니티에 알린다.

C++ 커뮤니티가 지난 30년간 발견한 패턴(Type Erasure, CRTP, NVI, External Polymorphism)이 모두 이 과정을 거쳤다.

## 실무 가이드 — 패턴 발견

코드를 작성하거나 리뷰할 때 다음을 점검하자.

- [ ] 비슷한 구조가 여러 곳에 보이는가? → 패턴 후보일 수 있다.
- [ ] 이름을 붙일 수 있는가? → 추상화가 충분하다.
- [ ] 표준 패턴 이름이 이미 있는가? → 그것을 쓴다.
- [ ] 트레이드오프를 인지하고 있는가?
- [ ] 표준 라이브러리 도구가 같은 패턴을 제공하지 않는가?

## 실무 가이드 — 표준 도구 활용

문제와 의도에서 표준 도구로 매핑하면 다음과 같다.

| 문제 | 표준 도구 |
| --- | --- |
| 다양한 callable | `std::function`, 람다 |
| sum type | `std::variant` |
| optional | `std::optional` |
| any type | `std::any` |
| 컨테이너 + 알고리즘 분리 | `<iterator>`, `<algorithm>` |
| 자원 관리 | `std::unique_ptr`, `std::shared_ptr` |
| 비교와 정렬 | `std::sort`, `std::less` 등 |
| 비동기 | `std::async`, `std::future` |
| 동기화 | `std::mutex`, `std::lock_guard` |

직접 구현하기 전에 표준 도구를 먼저 본다.

## 정리

디자인 패턴은 어디에나 있다.

- C++ 표준 라이브러리가 패턴의 모범이다.
- 도메인마다 자체 패턴을 갖고 있다.
- 일상 코드에 패턴이 무의식적으로 들어가 있다.

가치는 이렇게 정리된다.

1. 패턴을 인식하면 코드의 의도가 즉시 이해된다.
2. 표준 도구를 활용해 직접 구현을 피한다.
3. 공유 어휘로 팀의 소통이 빨라진다.
4. 새 패턴을 발견하면 디자인 능력의 정점에 가닿는다.

도구는 다음과 같이 묶어 둔다.

- `std::function`, `std::variant`, `std::any` — type erasure / visitor / variant
- `std::visit` — Visitor
- `std::shared_ptr`, `std::unique_ptr` — Ownership
- 컨테이너와 iterator — Iterator
- RAII — 자원 관리
- CRTP — 컴파일 타임 다형성

## 관련 항목

- [가이드라인 11: 패턴의 목적](/blog/programming/cpp/cpp-software-design/guideline11-understand-the-purpose-of-design-patterns) — 패턴 정의
- [가이드라인 12: 패턴에 대한 오해](/blog/programming/cpp/cpp-software-design/guideline12-beware-of-design-pattern-misconceptions) — 식별의 함정
- [가이드라인 14: 패턴 이름으로 의도 전달](/blog/programming/cpp/cpp-software-design/guideline14-use-a-design-patterns-name-to-communicate-intent) — 이름과 소통
- [Effective Modern C++ 항목 18: unique_ptr](/blog/programming/cpp/effective-modern-cpp/item18-use-unique-ptr-for-exclusive-ownership) — Ownership 패턴
