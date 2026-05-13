---
title: "가이드라인 23: Strategy와 Command는 값 기반 구현을 선호하라"
date: 2026-05-14T19:00:00
description: "Strategy와 Command를 값 의미론으로 풀어내는 두 도구 — std::function과 std::variant. 가상 함수 대신 값."
tags: [C++, Software Design, Strategy, Command, Value Semantics]
series: "C++ Software Design"
seriesOrder: 23
draft: true
---

## 왜 이 가이드라인이 중요한가?

가이드라인 19~21에서 Strategy와 Command를 다뤘다. 가이드라인 22에서는 값 의미론을 다뤘다.

이 둘을 결합한 것이 Iglberger의 핵심 권고다.

> "**Strategy와 Command는 값 기반으로 구현하라.**"

전통 GoF 스타일은 이렇다.

```cpp
class Strategy {
    virtual void execute() = 0;
};

class Context {
    std::unique_ptr<Strategy> strategy_;     // 포인터 — 참조 의미론
};
```

모던 스타일은 값 기반이다.

```cpp
class Context {
    std::function<void()> strategy_;     // value — type erasure
    // 또는
    std::variant<StrategyA, StrategyB> strategy_;     // value — variant
};
```

이점은 가이드라인 22의 모든 이점(복사 명확, 컨테이너, 멀티스레드 등)에 Strategy/Command의 유연성이 더해진다.

이 가이드라인이 **Strategy/Command의 모던 구현 패턴** 총정리다. Iglberger 책 Part II의 결론이기도 하다.

## 핵심 내용

- **Strategy / Command** — 값 기반 구현을 우선한다.
- 도구는 `std::function`(대다수 경우)과 `std::variant`(닫힌 집합)다.
- 가상 함수 + `unique_ptr` 패턴은 정말 필요할 때만 꺼낸다.
- `std::function` — 유연하고 값 의미론을 유지한다.
- `std::variant` — 닫힌 집합, 직렬화 가능, 보통 더 빠르다.

## 세 가지 구현 방식

### Reference Semantics (전통)

```cpp
class IStrategy {
public:
    virtual ~IStrategy() = default;
    virtual void execute() = 0;
};

class StrategyA : public IStrategy {
public:
    void execute() override { /* ... */ }
};

class StrategyB : public IStrategy {
public:
    void execute() override { /* ... */ }
};

class Context {
    std::unique_ptr<IStrategy> strategy_;
public:
    explicit Context(std::unique_ptr<IStrategy> s) : strategy_(std::move(s)) {}
    void use() { strategy_->execute(); }
};

Context c{std::make_unique<StrategyA>()};
```

문제는 다음과 같다.

- heap 할당이 따라온다.
- 포인터 의미라 복사가 어색해진다.
- `unique_ptr`이 복사 불가라 컨테이너와 복사에 제한이 생긴다.
- vtable 비용이 든다.

### Value Semantics — std::function

```cpp
class Context {
    std::function<void()> strategy_;
public:
    template<typename F>
    explicit Context(F f) : strategy_(std::move(f)) {}
    void use() { strategy_(); }
};

Context c{[](){ /* StrategyA 동작 */ }};
auto c2 = c;     // 값 복사 — OK
```

이점은 다음과 같다.

- 값 의미론이라 복사가 자연스럽다.
- 람다, functor, 함수 포인터 모두 받는다.
- 컨테이너에 친화적이다.
- DI가 자연스럽다.

비용도 있다.

- type erasure 비용(작지만 0은 아니다).
- 캡처가 크면 heap 할당이 일어난다.

### Value Semantics — std::variant

```cpp
struct StrategyA { void execute() const { /* ... */ } };
struct StrategyB { void execute() const { /* ... */ } };

using Strategy = std::variant<StrategyA, StrategyB>;

class Context {
    Strategy strategy_;
public:
    explicit Context(Strategy s) : strategy_(std::move(s)) {}
    void use() { std::visit([](const auto& s) { s.execute(); }, strategy_); }
};

Context c1{StrategyA{}};
Context c2{StrategyB{}};
auto c3 = c1;     // 값 복사
```

이점은 다음과 같다.

- 값 의미론.
- tag dispatch라 vtable이 없고 인라이닝이 가능하다.
- 직렬화가 가능하다(닫힌 집합).
- cache에 친화적이다.

한계는 다음과 같다.

- 닫힌 집합이라 사용자가 새 타입을 더할 수 없다.
- 모든 strategy를 미리 알려야 한다.

## 결정 — std::function과 std::variant 사이

| 측면 | `std::function` | `std::variant` |
| --- | --- | --- |
| 사용자 확장 | ✅ (어떤 callable이든) | ❌ (닫힌 집합) |
| 직렬화 | ❌ (람다 캡처를 직렬화하기 어렵다) | ✅ (구체 타입) |
| 성능 | type erasure 비용 | tag dispatch (보통 더 빠르다) |
| 컴파일 시간 | 보통 | 더 빠르다 |
| 코드 부피 | function template만 | variant 인스턴스화 (작다) |
| Default 구성 | ❌ (empty function) | ✅ (첫 alternative) |

선택 기준은 단순하다.

- 사용자 확장이나 다양한 람다가 필요하면 `std::function`.
- 닫힌 집합, 성능, 직렬화가 필요하면 `std::variant`.

## std::function 기반 Strategy

```cpp
class Sorter {
    std::function<void(std::vector<int>&)> sort_;
public:
    template<typename F>
    explicit Sorter(F f) : sort_(std::move(f)) {}

    void sort(std::vector<int>& v) { sort_(v); }
};

// 다양한 strategy
Sorter s1{[](auto& v) { std::sort(v.begin(), v.end()); }};
Sorter s2{[](auto& v) { std::sort(v.begin(), v.end(), std::greater<>{}); }};
Sorter s3{[](auto& v) { std::stable_sort(v.begin(), v.end()); }};

// 값 의미론 — 복사 / 컨테이너 / 멀티스레드 모두 자연스럽다
auto s4 = s1;
std::vector<Sorter> sorters;
sorters.push_back(s1);
```

람다로 끝난다. 클래스 정의가 필요 없다.

## std::variant 기반 Strategy

```cpp
struct AscendingSort  { void operator()(auto& v) const { std::sort(v.begin(), v.end()); } };
struct DescendingSort { void operator()(auto& v) const { std::sort(v.begin(), v.end(), std::greater<>{}); } };
struct StableSort     { void operator()(auto& v) const { std::stable_sort(v.begin(), v.end()); } };

using SortStrategy = std::variant<AscendingSort, DescendingSort, StableSort>;

class Sorter {
    SortStrategy strategy_;
public:
    explicit Sorter(SortStrategy s) : strategy_(std::move(s)) {}

    template<typename Container>
    void sort(Container& c) {
        std::visit([&c](const auto& strat) { strat(c); }, strategy_);
    }
};

Sorter s{AscendingSort{}};
```

장점은 다음과 같다.

- 직렬화가 가능하다 — `AscendingSort`, `DescendingSort`가 명시되어 있다.
- 컴파일 타임에 케이스 누락이 잡힌다.
- 보통 더 빠르다.

## std::function 기반 Command

```cpp
class CommandQueue {
    std::queue<std::function<void()>> commands_;
public:
    void enqueue(std::function<void()> cmd) {
        commands_.push(std::move(cmd));
    }

    void execute_all() {
        while (!commands_.empty()) {
            commands_.front()();
            commands_.pop();
        }
    }
};

CommandQueue q;
q.enqueue([&]() { save_doc(); });
q.enqueue([&]() { send_email(); });

q.execute_all();
```

가이드라인 21에서 본 Command의 모던 구현이다. 값 의미론과 람다가 함께 간다.

## std::variant 기반 Command

```cpp
struct SaveCommand   { Document* doc; };
struct DeleteCommand { Document* doc; std::string what; };
struct InsertCommand { Document* doc; int pos; std::string text; };

using Command = std::variant<SaveCommand, DeleteCommand, InsertCommand>;

void execute(const Command& cmd) {
    std::visit(std::overload{
        [](const SaveCommand& c)   { c.doc->save(); },
        [](const DeleteCommand& c) { c.doc->remove(c.what); },
        [](const InsertCommand& c) { c.doc->insert(c.pos, c.text); }
    }, cmd);
}

// Command queue — 값 의미론, 직렬화 가능
std::vector<Command> commands;
commands.push_back(SaveCommand{&doc});
commands.push_back(InsertCommand{&doc, 5, "hello"});

// 디스크 / 네트워크로 — 직렬화 (struct 멤버를 그대로 저장한다)
```

직렬화나 replay 시스템에는 variant가 자연스럽다.

## 함정 — std::function의 type erasure 비용

```cpp
std::function<void()> cmd = [](){ /* ... */ };
cmd();     // 간접 호출
```

`std::function`의 특성은 다음과 같다.

- SBO(Small Buffer Optimization) — 작은 람다는 내장된다.
- 캡처가 크면 heap 할당이 일어난다.
- 호출이 간접 호출이다(vtable과 비슷한 형태).

핫 패스에서는 측정해 봐야 한다. 보통 5~30 ns다. variant는 1~3 ns 정도다.

## 함정 — std::function 캐싱

```cpp
class Service {
    std::function<void()> cb_;
public:
    Service(std::function<void()> cb) : cb_(std::move(cb)) {}

    void trigger() { cb_(); }     // 매 호출마다 간접 호출이다
};
```

같은 `cb_`를 백만 번 부르면 type erasure 비용이 누적된다.

대안은 템플릿이다.

```cpp
template<typename F>
class Service {
    F cb_;
public:
    explicit Service(F cb) : cb_(std::move(cb)) {}

    void trigger() { cb_(); }     // 인라이닝 — 0 비용
};

auto s = Service{[](){ /* ... */ }};
```

`F`가 단일 람다 타입이라 컴파일러가 인라이닝한다.

단, 런타임 교체는 불가능하다. 트레이드오프다.

## 함정 — std::function의 nullability

```cpp
std::function<void()> cb;
cb();     // ⚠️ empty function 호출 — std::bad_function_call이 던져진다
```

`std::function`의 default가 empty다. 호출 전에 확인하자.

```cpp
if (cb) cb();
```

variant에는 empty가 없다(첫 alternative가 기본이다). 그래서 더 안전하다.

## 모던 변형 — std::move_only_function (C++23)

```cpp
std::move_only_function<void()> cmd = [p = std::make_unique<int>(42)]() {
    use(*p);
};

// std::function은 copyable을 요구해서 unique_ptr 캡처가 막힌다
// std::move_only_function은 move-only라 OK
```

C++23에 들어온 move-only callable이다. 더 유연하다.

## 모던 변형 — std::function_ref (C++26 제안)

```cpp
void process(std::function_ref<void()> cb) {
    cb();
}

process([](){ /* ... */ });     // 람다를 비-소유 참조로 받는다
```

`function_ref`는 비-소유 lightweight 함수 참조다. 호출자가 라이프타임을 관리한다. 핫 패스에 잘 맞는다.

## 컨테이너에 담기 — 값 의미론의 핵심 이점

```cpp
// std::function 기반 — value
std::vector<std::function<void()>> handlers;
handlers.push_back([](){ doA(); });
handlers.push_back([](){ doB(); });

for (auto& h : handlers) h();
```

값 의미론이라 vector에 그대로 담긴다. heap 포인터 vector도 가능하지만 값이 더 단순하다.

## DI + 값 의미론

```cpp
class Service {
    std::function<void(const std::string&)> logger_;
public:
    explicit Service(std::function<void(const std::string&)> log)
        : logger_(std::move(log)) {}
};

// 다양한 logger를 주입한다
Service s{[](const std::string& msg) { std::cout << msg; }};

// 테스트
std::vector<std::string> captured;
Service s_test{[&](const std::string& msg) { captured.push_back(msg); }};
```

테스트에서 람다로 mock을 만든다. 클래스 hierarchy를 만들 필요가 없다.

## 값 의미론 + 멀티스레드

```cpp
std::function<int()> compute_task = [data]() {
    // data를 값 캡처 — 스레드 안전
    return data.size();
};

std::thread t1(compute_task);
std::thread t2(compute_task);     // 같은 task를 복사해서 보낸다
```

각 스레드가 자기 task 복사본을 갖는다. race가 사라진다.

## 함정 — 값 의미론의 보일러플레이트

```cpp
class Context {
    std::function<void()> strategy_;
public:
    template<typename F>
    explicit Context(F f) : strategy_(std::move(f)) {}
};

// vs
class Context {
    std::unique_ptr<IStrategy> strategy_;
public:
    explicit Context(std::unique_ptr<IStrategy> s) : strategy_(std::move(s)) {}
};

// 두 패턴의 코드 분량은 비슷하다
```

코드 분량은 비슷하다. 그러나 값 의미론은 **사용 시점**에 람다나 짧은 functor로 훨씬 짧게 풀어진다.

## 함정 — 가상 함수가 정말 필요할 때

```cpp
class Plugin {
public:
    virtual ~Plugin() = default;
    virtual void initialize() = 0;
    virtual void execute() = 0;
    virtual void shutdown() = 0;
    virtual std::string name() const = 0;
};
```

**Open hierarchy**(사용자가 새 plugin을 추가)와 다중 메서드 인터페이스가 함께 있으면 가상 함수가 자연스럽다. variant는 닫힌 집합이고, `std::function`은 단일 callable 인터페이스라 메서드가 여럿이면 어색해진다.

→ **여러 메서드 인터페이스 + open hierarchy** = 가상 함수.

## 결합 — 값 의미론 + 가상 함수

```cpp
// 가상 함수 base
class IPlugin {
public:
    virtual ~IPlugin() = default;
    virtual std::unique_ptr<IPlugin> clone() const = 0;     // 값 의미론을 위해
    virtual void execute() = 0;
};

// 값 의미 wrapper
class Plugin {
    std::unique_ptr<IPlugin> impl_;
public:
    template<typename T>
    explicit Plugin(T t) : impl_(std::make_unique<T>(std::move(t))) {}

    Plugin(const Plugin& other) : impl_(other.impl_->clone()) {}
    Plugin(Plugin&&) = default;

    Plugin& operator=(const Plugin& other) { impl_ = other.impl_->clone(); return *this; }
    Plugin& operator=(Plugin&&) = default;

    void execute() { impl_->execute(); }
};

// 사용 — value semantic
std::vector<Plugin> plugins;
plugins.push_back(Plugin{ConcretePluginA{}});
plugins.push_back(Plugin{ConcretePluginB{}});

auto copy = plugins;     // 깊은 복사 (clone)
```

이 패턴이 **Type Erasure**다. 가이드라인 32~34에서 다룬다. 값 의미론 + 다형성 + open hierarchy를 동시에 갖춘다.

## 표준 라이브러리 모범

```cpp
std::function<int(int)> f;          // value, type erasure
std::variant<int, string> v;         // value, closed
std::optional<int> o;                // value, nullable
std::any a;                          // value, type erasure (any type)
```

모두 값 의미론과 다형성을 함께 갖는다. Strategy / Command 도구의 표본이다.

## 함정 — 너무 일찍 type erasure

```cpp
class Foo {
    std::function<void()> cb_;     // ⚠️ 정말 필요한가?
public:
    template<typename F>
    Foo(F cb) : cb_(std::move(cb)) {}
};
```

단일 callable이고 컴파일 타임 결정이면 템플릿이 낫다.

```cpp
template<typename CB>
class Foo {
    CB cb_;
public:
    explicit Foo(CB cb) : cb_(std::move(cb)) {}
};
```

런타임 교체나 컨테이너가 필요하면 `std::function`. 그 외에는 템플릿이다.

## std::variant Command + Undo

```cpp
struct InsertCmd { Document* doc; int pos; std::string text; };
struct DeleteCmd { Document* doc; int pos; std::string text; };

using Command = std::variant<InsertCmd, DeleteCmd>;

void execute(const Command& cmd) {
    std::visit(std::overload{
        [](const InsertCmd& c) { c.doc->insert(c.pos, c.text); },
        [](const DeleteCmd& c) { c.doc->remove(c.pos, c.text.size()); }
    }, cmd);
}

void undo(const Command& cmd) {
    std::visit(std::overload{
        [](const InsertCmd& c) { c.doc->remove(c.pos, c.text.size()); },
        [](const DeleteCmd& c) { c.doc->insert(c.pos, c.text); }
    }, cmd);
}

// Undo stack — value 컨테이너
std::stack<Command> undo_stack;
undo_stack.push(InsertCmd{&doc, 5, "hello"});
```

각 Command가 값이라 직렬화도 가능하다(replay, save state).

## 모던 함수형 — pipeline

```cpp
auto pipeline = compose(
    [](int x) { return x * 2; },
    [](int x) { return x + 1; },
    [](int x) { return x * x; }
);

// 함수 합성 — 값 의미론
int result = pipeline(5);
```

람다 chain이 곧 값이다. 함수형 프로그래밍과 친화적이다.

## 함정 — std::function 안의 std::function

```cpp
std::function<std::function<int()>(int)> currying;
currying = [](int a) { return [a](int b) { return a + b; }; };
// 중첩이 깊어지면 type erasure 비용이 누적된다
```

깊은 중첩은 성능과 가독성을 모두 해친다. 단순화한다.

## 함정 — std::variant의 한계

```cpp
using Command = std::variant<CmdA, CmdB, CmdC, ..., CmdZ>;     // ⚠️ alternative가 스물여섯 개?
```

alternative가 너무 많으면 다음 문제가 생긴다.

- 컴파일 시간이 늘어난다.
- variant 크기가 커진다(가장 큰 alternative + tag).
- 사용 부담이 커진다.

10개 미만이 적절하다. 그 이상이면 type erasure나 가상 함수로 간다.

## 빠른 결정 — Strategy / Command 구현

```
Strategy / Command 패턴을 적용한다 — 어떤 구현?
├── 단일 callable + 컴파일 타임 → 템플릿
├── 단일 callable + 런타임 교체 → std::function
├── 닫힌 집합 + 직렬화 → std::variant
├── 닫힌 집합 + 성능 → std::variant
├── open hierarchy + 다중 메서드 → 가상 함수
└── open hierarchy + 값 의미론 → Type Erasure (가이드라인 32)
```

모던 코드 대부분은 `std::function` 또는 `std::variant`로 간다.

## 마이그레이션 — 가상 함수에서 값 의미론으로

```cpp
// 옛 코드
class Strategy { virtual void execute() = 0; };
class ConcreteA : public Strategy { void execute() override; };

class Context {
    std::unique_ptr<Strategy> strategy_;
};

// 마이그레이션
// 1. ConcreteA를 단순 클래스나 functor로 옮긴다
struct ConcreteA {
    void operator()() const { /* ... */ }
};

// 2. Context를 std::function 기반으로 바꾼다
class Context {
    std::function<void()> strategy_;
public:
    template<typename F>
    Context(F f) : strategy_(std::move(f)) {}
};

// 또는 variant
using Strategy = std::variant<ConcreteA, ConcreteB>;
```

점진적 마이그레이션이 가능하다. 일부만 먼저 옮겨도 된다.

## Iglberger의 결론 (Chapter 5)

> "**값 의미론 + std::function / std::variant — Strategy와 Command의 모던 답.**"

기존의 가상 함수 + `unique_ptr` 패턴 대부분이 값 기반으로 대체된다. 더 단순하고 효율적이며 안전하다.

## 실무 가이드 — 결정

```
새 Strategy / Command를 디자인한다 — 어떻게?
├── 단순 + 컴파일 타임 → 템플릿
├── 람다 풍부 + 다양한 callable → std::function
├── 닫힌 집합 + 직렬화 → std::variant
├── open + 값 → Type Erasure
└── open + 다중 인터페이스 → 가상 함수
```

## 실무 가이드 — 체크리스트

- [ ] 정말 가상 함수와 `unique_ptr` 패턴이 필요한가?
- [ ] `std::function`으로 단순화할 수 있는가?
- [ ] 닫힌 집합이라면 `std::variant`로 가는가?
- [ ] 직렬화가 필요하면 `std::variant`인가?
- [ ] 성능이 critical하면 `std::variant`나 템플릿인가?
- [ ] 컨테이너나 멀티스레드에서 값 의미론을 의도하는가?

## 정리

**Strategy와 Command는 값 기반 구현을 우선한다.**

도구는 다음과 같다.

- **`std::function`** — 대다수 경우(callable + value)
- **`std::variant`** — 닫힌 집합, 성능, 직렬화
- **템플릿** — 컴파일 타임, 0 비용
- **가상 함수** — open hierarchy + 다중 인터페이스(특수 케이스)

이점은 가이드라인 22에서 본 그대로다. 값 의미론, 컨테이너 친화, 멀티스레드 안전, 간결한 코드.

Iglberger 책 Part II의 큰 메시지는 분명하다. **값 기반 디자인**이 모던 C++의 정설이다.

## 관련 항목

- [가이드라인 19: Strategy](/blog/programming/cpp/cpp-software-design/guideline19-use-strategy-to-isolate-how-things-are-done) — 기본 Strategy
- [가이드라인 20: composition over inheritance](/blog/programming/cpp/cpp-software-design/guideline20-favor-composition-over-inheritance) — 큰 원칙
- [가이드라인 21: Command](/blog/programming/cpp/cpp-software-design/guideline21-use-command-to-isolate-what-things-are-done) — 기본 Command
- [가이드라인 22: 값 의미론](/blog/programming/cpp/cpp-software-design/guideline22-prefer-value-semantics-over-reference-semantics) — value의 본질
- [가이드라인 32: Type Erasure](/blog/programming/cpp/cpp-software-design/guideline32-consider-replacing-inheritance-hierarchies-with-type-erasure) — 값 + 다형성 + open
