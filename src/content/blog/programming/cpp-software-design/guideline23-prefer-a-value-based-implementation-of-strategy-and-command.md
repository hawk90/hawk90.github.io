---
title: "가이드라인 23: Strategy와 Command는 값 기반 구현을 선호하라"
date: 2026-05-14T19:00:00
description: "Strategy + Command를 value semantics로 — std::function 우선, 또는 std::variant. 가상 함수 대신 값."
tags: [C++, Software Design, Strategy, Command, Value Semantics]
series: "C++ Software Design"
seriesOrder: 23
---

## 왜 이 가이드라인이 중요한가?

가이드라인 19-21 — Strategy와 Command 패턴. 가이드라인 22 — value semantics.

이 둘을 결합 — Iglberger의 핵심 권고:

> "**Strategy와 Command는 값 기반으로 구현하라.**"

전통 GoF:

```cpp
class Strategy {
    virtual void execute() = 0;
};

class Context {
    std::unique_ptr<Strategy> strategy_;     // pointer — 참조 의미
};
```

모던 — 값 기반:

```cpp
class Context {
    std::function<void()> strategy_;     // value — type erasure
    // 또는
    std::variant<StrategyA, StrategyB> strategy_;     // value — variant
};
```

이점 — 가이드라인 22의 모든 이점 (복사 명확, 컨테이너, 멀티스레드, 등) + Strategy/Command의 유연성.

이 가이드라인 — **Strategy/Command의 모던 구현 패턴** 총정리. Iglberger 책 Part II의 결론.

## 핵심 내용

- **Strategy/Command — value-based** 구현 우선
- 도구: **`std::function`** (대다수), **`std::variant`** (closed set)
- 가상 함수 + `unique_ptr` 패턴 — 정말 필요할 때만
- **`std::function`**: 유연 + value semantics
- **`std::variant`**: closed set + 직렬화 가능 + 더 빠름

## 비교 — 3 구현 방식

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

문제:
- heap 할당
- pointer 의미 — 복사 어색
- `unique_ptr` 복사 X — 컨테이너 / 복사 제한
- vtable 비용

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

이점:
- Value semantics — 복사 자연
- 람다 + functor + 함수 포인터 모두
- 컨테이너 친화
- DI 자연

비용:
- Type erasure (작지만 0 아님)
- 캡처가 크면 heap 할당

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

이점:
- Value semantics
- Tag dispatch — vtable 없음, 인라이닝 가능
- 직렬화 가능 (closed set)
- Cache friendly

한계:
- Closed set (사용자 확장 X)
- 모든 strategy 미리 알려져야

## 결정 — std::function vs std::variant

| 측면 | `std::function` | `std::variant` |
| --- | --- | --- |
| 사용자 확장 | ✅ (어떤 callable이든) | ❌ (closed set) |
| 직렬화 | ❌ (람다 캡처 직렬화 X) | ✅ (구체 타입) |
| 성능 | type erasure 비용 | tag dispatch (보통 더 빠름) |
| 컴파일 시간 | 보통 | 더 빠름 |
| 코드 부피 | function template만 | variant 인스턴스화 (작음) |
| Default 구성 | ❌ (empty function) | ✅ (첫 alternative) |

선택:
- **사용자 확장 / 람다 풍부** → `std::function`
- **Closed set / 성능 / 직렬화** → `std::variant`

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

// 값 의미 — 복사 / 컨테이너 / 멀티스레드
auto s4 = s1;
std::vector<Sorter> sorters;
sorters.push_back(s1);
```

람다로 — 클래스 정의 없이.

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

장점:
- 직렬화 가능 — `AscendingSort`, `DescendingSort` 명시
- 컴파일 타임 case 검출
- 종종 더 빠름

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

가이드라인 21에서 본 — Command의 모던 구현. value semantics + 람다.

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

// Command queue — value semantics, 직렬화 가능
std::vector<Command> commands;
commands.push_back(SaveCommand{&doc});
commands.push_back(InsertCommand{&doc, 5, "hello"});

// 디스크 / 네트워크 — 직렬화 (struct 멤버 직접 저장)
```

직렬화 / replay 시스템 — variant가 자연.

## 함정 — std::function의 type erasure 비용

```cpp
std::function<void()> cmd = [](){ /* ... */ };
cmd();     // 간접 호출
```

`std::function`:
- SBO (Small Buffer Optimization) — 작은 람다는 내장
- 큰 람다 / 캡처 — heap 할당
- 호출 — 간접 (vtable 비슷)

핫 패스에서 — 측정 권장. 종종 5-30 ns. variant — 1-3 ns.

## 함정 — std::function의 caching

```cpp
class Service {
    std::function<void()> cb_;
public:
    Service(std::function<void()> cb) : cb_(std::move(cb)) {}
    
    void trigger() { cb_(); }     // 매 호출 — 간접
};
```

같은 `cb_`를 — 백만 번 호출하면 type erasure 비용 누적.

대안 — 템플릿:

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

`F`가 — 단일 람다 타입. 컴파일러 인라이닝.

단, 런타임 교체 X. 트레이드오프.

## 함정 — std::function의 nullability

```cpp
std::function<void()> cb;
cb();     // ⚠️ empty function 호출 — std::bad_function_call throw
```

`std::function`의 default — empty. 호출 전 검사:

```cpp
if (cb) cb();
```

variant — empty 없음 (첫 alternative). 안전.

## 모던 변형 — std::move_only_function (C++23)

```cpp
std::move_only_function<void()> cmd = [p = std::make_unique<int>(42)]() {
    use(*p);
};

// std::function — 복사 가능 요구 → unique_ptr 캡처 X
// std::move_only_function — move-only OK
```

C++23 — move-only callable. 더 유연.

## 모던 변형 — std::function_ref (C++26 제안)

```cpp
void process(std::function_ref<void()> cb) {
    cb();
}

process([](){ /* ... */ });     // 람다를 — non-owning 참조
```

function_ref — 비-소유 (lightweight). 호출자가 라이프타임 관리. 핫 패스에 적합.

## 컨테이너에 담기 — value semantics 핵심 이점

```cpp
// std::function 기반 — value
std::vector<std::function<void()>> handlers;
handlers.push_back([](){ doA(); });
handlers.push_back([](){ doB(); });

for (auto& h : handlers) h();
```

값 의미 → vector에 — 자연. heap 포인터 vector도 가능하지만 — 값이 단순.

## DI + value semantics

```cpp
class Service {
    std::function<void(const std::string&)> logger_;
public:
    explicit Service(std::function<void(const std::string&)> log)
        : logger_(std::move(log)) {}
};

// 다양한 logger 주입
Service s{[](const std::string& msg) { std::cout << msg; }};

// 테스트
std::vector<std::string> captured;
Service s_test{[&](const std::string& msg) { captured.push_back(msg); }};
```

테스트에서 — 람다로 mock. 클래스 hierarchy 안 만들고.

## 값 의미 + 멀티스레드

```cpp
std::function<int()> compute_task = [data]() {
    // data — 값 캡처, 스레드 안전
    return data.size();
};

std::thread t1(compute_task);
std::thread t2(compute_task);     // 같은 task 복사
```

각 스레드 — 자기 task 복사. race X.

## 함정 — value semantics의 보일러플레이트

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

// 두 패턴 — 비슷한 분량
```

코드 분량은 — 비슷. value semantics — 사용 시점에 람다 / 짧은 functor로 훨씬 짧음.

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

**Open hierarchy** (사용자가 새 plugin 추가) — 가상 함수가 자연. variant는 — closed set.

`std::function`은 — 단일 callable 인터페이스. 메서드 여러 개면 — 어색.

→ **여러 메서드 인터페이스 + open hierarchy** = 가상 함수.

## 결합 — value semantics + 가상 함수

```cpp
// 가상 함수 base
class IPlugin {
public:
    virtual ~IPlugin() = default;
    virtual std::unique_ptr<IPlugin> clone() const = 0;     // 값 의미 위해
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

이게 — **Type Erasure**. 가이드라인 32-34. value semantics + 다형성 + open hierarchy.

## 표준 라이브러리 — 모범

```cpp
std::function<int(int)> f;          // value, type erasure
std::variant<int, string> v;         // value, closed
std::optional<int> o;                // value, nullable
std::any a;                          // value, type erasure (any type)
```

모두 — value semantics + 다형성. Strategy/Command 도구의 표본.

## 함정 — 너무 일찍 type erasure

```cpp
class Foo {
    std::function<void()> cb_;     // ⚠️ 정말 필요?
public:
    template<typename F>
    Foo(F cb) : cb_(std::move(cb)) {}
};
```

단일 callable + 컴파일 타임 결정이면 — 템플릿:

```cpp
template<typename CB>
class Foo {
    CB cb_;
public:
    explicit Foo(CB cb) : cb_(std::move(cb)) {}
};
```

런타임 교체 / 컨테이너 — `std::function`. 그 외엔 — 템플릿.

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

각 Command — 값. 직렬화 가능 (replay, save state).

## 모던 함수형 — pipelines

```cpp
auto pipeline = compose(
    [](int x) { return x * 2; },
    [](int x) { return x + 1; },
    [](int x) { return x * x; }
);

// 함수 합성 — value semantics
int result = pipeline(5);
```

람다 chain — value. 함수형 프로그래밍 친화.

## 함정 — std::function 안의 std::function

```cpp
std::function<std::function<int()>(int)> currying;
currying = [](int a) { return [a](int b) { return a + b; }; };
// 중첩 — type erasure 비용 누적
```

깊은 중첩 — 성능 / 가독성 모두 X. 단순화.

## 함정 — std::variant의 한계

```cpp
using Command = std::variant<CmdA, CmdB, CmdC, ..., CmdZ>;     // ⚠️ 26개?
```

너무 많은 alternative:
- 컴파일 시간 ↑
- variant 크기 ↑ (가장 큰 alternative + tag)
- 사용 부담

10개 미만이 — 적절. 그 이상이면 — type erasure 또는 가상 함수.

## 빠른 결정 — Strategy/Command 구현

```
Strategy/Command 패턴 적용 — 어떤 구현?
├── 단일 callable + 컴파일 타임 → 템플릿
├── 단일 callable + 런타임 교체 → std::function
├── Closed set + 직렬화 → std::variant
├── Closed set + 성능 → std::variant
├── Open hierarchy + 다중 메서드 → 가상 함수
└── Open hierarchy + value semantics → Type Erasure (가이드라인 32)
```

대부분 모던 코드 — `std::function` 또는 `std::variant`.

## 마이그레이션 — 가상 함수 → value semantics

```cpp
// 옛 코드
class Strategy { virtual void execute() = 0; };
class ConcreteA : public Strategy { void execute() override; };

class Context {
    std::unique_ptr<Strategy> strategy_;
};

// 마이그레이션
// 1. ConcreteA를 단순 클래스 / functor로
struct ConcreteA {
    void operator()() const { /* ... */ }
};

// 2. Context — std::function
class Context {
    std::function<void()> strategy_;
public:
    template<typename F>
    Context(F f) : strategy_(std::move(f)) {}
};

// 또는 variant
using Strategy = std::variant<ConcreteA, ConcreteB>;
```

점진적 마이그레이션 — 일부만 먼저.

## Iglberger의 결론 (Chapter 5)

> "**Value semantics + std::function / std::variant — Strategy와 Command의 모던 답.**"

기존 가상 함수 + `unique_ptr` 패턴 — 대부분 — value-based로 대체 가능. 더 간단 + 효율적 + 안전.

## 실무 가이드 — 결정

```
새 Strategy/Command 디자인 — 어떻게?
├── 단순 + 컴파일 타임 → 템플릿
├── 람다 풍부 + 다양한 callable → std::function
├── Closed set + 직렬화 → std::variant
├── Open + value → Type Erasure
└── Open + 다중 인터페이스 → 가상 함수
```

## 실무 가이드 — 체크리스트

- [ ] 정말 가상 함수 / `unique_ptr` 패턴 필요?
- [ ] `std::function`으로 — 단순화 가능?
- [ ] Closed set이면 — `std::variant`?
- [ ] 직렬화 필요? → `std::variant`
- [ ] 성능 critical? → `std::variant` 또는 템플릿
- [ ] 컨테이너 / 멀티스레드 — value semantics 의도?

## 정리

**Strategy와 Command — value-based 구현 우선**.

도구:
- **`std::function`** — 대다수 케이스 (callable + value)
- **`std::variant`** — closed set + 성능 + 직렬화
- **템플릿** — 컴파일 타임 + 0 비용
- **가상 함수** — open hierarchy + 다중 인터페이스 (특수 케이스)

이점 (가이드라인 22):
- Value semantics
- 컨테이너 친화
- 멀티스레드 안전
- 간결한 코드

Iglberger 책 Part II의 큰 메시지 — **value-based design**이 모던 C++의 정설.

## 관련 항목

- [가이드라인 19: Strategy](/blog/programming/cpp-software-design/guideline19-use-strategy-to-isolate-how-things-are-done) — 기본 Strategy
- [가이드라인 20: composition > inheritance](/blog/programming/cpp-software-design/guideline20-favor-composition-over-inheritance) — 큰 원칙
- [가이드라인 21: Command](/blog/programming/cpp-software-design/guideline21-use-command-to-isolate-what-things-are-done) — 기본 Command
- [가이드라인 22: value semantics](/blog/programming/cpp-software-design/guideline22-prefer-value-semantics-over-reference-semantics) — value의 본질
- [가이드라인 32: Type Erasure](/blog/programming/cpp-software-design/guideline32-consider-replacing-inheritance-hierarchies-with-type-erasure) — 값 + 다형성 + open
