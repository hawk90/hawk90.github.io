---
title: "가이드라인 19: 어떻게 하는가의 격리에 Strategy를 사용하라"
date: 2026-05-14T15:00:00
description: "Strategy 패턴 — 알고리즘 교체 가능. 가상 함수, 함수 포인터, std::function, 템플릿 — 4가지 구현."
tags: [C++, Software Design, Strategy, Design Patterns]
series: "C++ Software Design"
seriesOrder: 19
---

## 왜 이 가이드라인이 중요한가?

```cpp
class Compressor {
public:
    std::vector<std::byte> compress(std::span<const std::byte> data) {
        // gzip으로 압축
        // ...
    }
};
```

이 코드 — gzip 알고리즘이 **하드코딩**됨. 새 알고리즘(Zstd, LZ4) 추가 → `Compressor` 수정. 가이드라인 5의 OCP 위반.

**Strategy 패턴** — 알고리즘을 **객체로 분리**. 알고리즘 교체 가능, 새 알고리즘 추가가 OCP.

```cpp
class CompressionStrategy {
public:
    virtual ~CompressionStrategy() = default;
    virtual std::vector<std::byte> compress(...) = 0;
};

class Compressor {
    std::unique_ptr<CompressionStrategy> strategy_;
public:
    Compressor(std::unique_ptr<CompressionStrategy> s) : strategy_(std::move(s)) {}
    std::vector<std::byte> compress(std::span<const std::byte> data) {
        return strategy_->compress(data);
    }
};
```

이 가이드라인 — Strategy의 GoF 정의 + C++ 4가지 구현 + 트레이드오프.

## 핵심 내용

- **Strategy 패턴** — 알고리즘을 캡슐화 + 교체 가능
- 본질 — **"어떻게"(how) 하는가**를 컨텍스트에서 분리
- C++ 구현 — 4가지 방식 (각자 트레이드오프):
  1. **가상 함수** (전통 GoF)
  2. **함수 포인터**
  3. **`std::function`** (type erasure)
  4. **템플릿** (컴파일 타임)
- 가이드라인 23 — **value-based Strategy** 추가

## 4가지 구현

### 1) 가상 함수 (GoF 전통)

```cpp
class SortStrategy {
public:
    virtual ~SortStrategy() = default;
    virtual void sort(std::vector<int>&) = 0;
};

class QuickSort : public SortStrategy {
public:
    void sort(std::vector<int>& v) override { std::sort(v.begin(), v.end()); }
};

class StableSort : public SortStrategy {
public:
    void sort(std::vector<int>& v) override { std::stable_sort(v.begin(), v.end()); }
};

class Sorter {
    std::unique_ptr<SortStrategy> strategy_;
public:
    explicit Sorter(std::unique_ptr<SortStrategy> s) : strategy_(std::move(s)) {}
    void sort(std::vector<int>& v) { strategy_->sort(v); }
};
```

장점:
- 명확한 인터페이스
- 런타임 교체

단점:
- vtable 비용
- heap 할당 (unique_ptr)
- 새 strategy = 새 클래스 (보일러플레이트)

### 2) 함수 포인터

```cpp
class Sorter {
    using SortFn = void(*)(std::vector<int>&);
    SortFn strategy_;
public:
    explicit Sorter(SortFn s) : strategy_(s) {}
    void sort(std::vector<int>& v) { strategy_(v); }
};

void quicksort(std::vector<int>& v) { std::sort(v.begin(), v.end()); }
void stablesort(std::vector<int>& v) { std::stable_sort(v.begin(), v.end()); }

Sorter s{quicksort};
s.sort(data);
```

장점:
- 가볍고 빠름
- C 호환

단점:
- 상태 없음 (캡처 불가)
- 람다 — 캡처 있으면 X
- 멤버 함수 — 어색

### 3) std::function (모던 권장)

```cpp
class Sorter {
    std::function<void(std::vector<int>&)> strategy_;
public:
    template<typename F>
    explicit Sorter(F f) : strategy_(std::move(f)) {}
    
    void sort(std::vector<int>& v) { strategy_(v); }
};

// 어떤 callable이든
Sorter s1{[](std::vector<int>& v) { std::sort(v.begin(), v.end()); }};

struct CustomSort {
    void operator()(std::vector<int>& v) const { /* ... */ }
};
Sorter s2{CustomSort{}};

Sorter s3{quicksort};     // 함수 포인터도 OK
```

장점:
- 매우 유연 (람다, functor, 함수 포인터, 멤버 함수 모두)
- 런타임 교체 가능
- value semantics

단점:
- Type erasure 비용 (작지만 0 아님)
- 컴파일 시간 ↑

### 4) 템플릿 (컴파일 타임)

```cpp
template<typename Strategy>
class Sorter {
    Strategy strategy_;
public:
    explicit Sorter(Strategy s = {}) : strategy_(std::move(s)) {}
    
    template<typename Container>
    void sort(Container& c) { strategy_(c); }
};

struct QuickSortFn {
    template<typename C>
    void operator()(C& c) const { std::sort(c.begin(), c.end()); }
};

Sorter<QuickSortFn> s;
s.sort(data);
```

장점:
- 런타임 비용 0 (인라이닝)
- 강한 최적화

단점:
- 런타임 교체 불가
- 다른 strategy = 다른 타입
- 헤더에 정의 필요

## 표준 라이브러리 — Strategy 만연

```cpp
std::sort(v.begin(), v.end(), [](int a, int b) { return a < b; });
//                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                            Strategy — 비교 알고리즘

std::accumulate(v.begin(), v.end(), 0, std::plus<>{});
//                                     ^^^^^^^^^^^^
//                                     Strategy — 연산 알고리즘

std::map<K, V, std::less<K>> m;
//             ^^^^^^^^^^^^^
//             Strategy — 정렬 알고리즘
```

표준 알고리즘 — 거의 모두 Strategy 매개변수.

## 표준 functor

```cpp
std::less<>, std::greater<>, std::equal_to<>
std::plus<>, std::minus<>, std::multiplies<>, std::divides<>
std::logical_and<>, std::logical_or<>
std::bit_and<>, std::bit_or<>, std::bit_xor<>
```

흔한 strategy — 표준 제공. 직접 작성 불필요.

## 비교 — 4 구현

| 구현 | 비용 | 유연성 | 상태 | 런타임 교체 |
| --- | --- | --- | --- | --- |
| 가상 함수 | vtable | 클래스 단위 | 멤버 변수 | ✅ |
| 함수 포인터 | 간접 호출 | callable만 | X | ✅ (포인터 교체) |
| `std::function` | type erasure | 모든 callable | 캡처/멤버 | ✅ |
| 템플릿 | 0 | 컴파일 타임 | 멤버 변수 | ❌ |

대부분의 모던 코드 — `std::function` 또는 템플릿.

## Strategy 적용 시그널

코드에 — Strategy 적합한 신호:

### 1) if/switch에 알고리즘 분기

```cpp
double calculate(double x, std::string algorithm) {
    if (algorithm == "linear") return /* ... */;
    else if (algorithm == "quadratic") return /* ... */;
    // ...
}
```

→ Strategy.

### 2) 동작 매개변수화 필요

```cpp
template<typename Compare>
class SortedList { /* ... */ };

SortedList<std::less<int>> asc;
SortedList<std::greater<int>> desc;
```

알고리즘 자체가 — 매개변수.

### 3) 런타임 알고리즘 교체

```cpp
class Game {
    std::unique_ptr<AIStrategy> ai_;
public:
    void set_difficulty(Difficulty d) {
        switch (d) {
            case Easy: ai_ = std::make_unique<EasyAI>(); break;
            case Hard: ai_ = std::make_unique<HardAI>(); break;
        }
    }
};
```

플레이어가 — 난이도 바꿀 때 알고리즘 교체.

## 값 vs 참조 의미론

```cpp
// 참조 의미 — pointer/reference
class Sorter {
    SortStrategy& strategy_;     // 외부 객체 참조
public:
    Sorter(SortStrategy& s) : strategy_(s) {}
};

// 값 의미 — 복사
class Sorter {
    std::function<void(std::vector<int>&)> strategy_;     // 함수 객체 복사
public:
    template<typename F>
    Sorter(F f) : strategy_(std::move(f)) {}
};
```

값 의미 — value semantics. Iglberger 권장 (가이드라인 22).

## Strategy vs Template Method

```cpp
// Template Method
class Algorithm {
public:
    void run() {
        prepare();
        execute();
        cleanup();
    }
protected:
    virtual void execute() = 0;     // hook
    void prepare();
    void cleanup();
};

class ConcreteAlgorithm : public Algorithm {
protected:
    void execute() override { /* ... */ }
};
```

```cpp
// Strategy
class Context {
    Strategy& strategy_;
public:
    void run() {
        prepare();
        strategy_.execute();
        cleanup();
    }
};
```

| 측면 | Template Method | Strategy |
| --- | --- | --- |
| 메커니즘 | 상속 | composition |
| 변경 단위 | 클래스 | 객체 |
| 런타임 교체 | ❌ | ✅ |

가이드라인 20 — **composition over inheritance**. Strategy 우선.

## Strategy의 한계 — 데이터 공유

```cpp
class Sorter {
    std::function<void(std::vector<int>&)> strategy_;
    int compare_count_ = 0;     // strategy가 접근 못 함
public:
    void sort(std::vector<int>& v) {
        strategy_(v);     // strategy가 compare_count_ 증가 불가
    }
};
```

Strategy — context의 내부 상태 접근 어려움. 필요하면 — 인터페이스에 callback 추가 또는 멤버 함수 strategy.

## 함수형 Strategy

```cpp
// 모던 — 함수 자체가 strategy
auto sort_asc = [](auto& v) { std::sort(v.begin(), v.end()); };
auto sort_desc = [](auto& v) { std::sort(v.begin(), v.end(), std::greater<>{}); };

template<typename SortFn>
class Sorter {
    SortFn sort_;
public:
    explicit Sorter(SortFn s) : sort_(s) {}
    template<typename C> void sort(C& c) { sort_(c); }
};

Sorter s1{sort_asc};
Sorter s2{sort_desc};
```

함수 = strategy. 클래스 hierarchy 불필요.

## 다중 Strategy

```cpp
class Game {
    std::function<void(Player&)> ai_strategy_;
    std::function<void(World&)> render_strategy_;
    std::function<bool(Entity&)> collision_strategy_;
};
```

여러 strategy 동시 사용. 각자 독립.

## Strategy와 의존성 주입

```cpp
class Service {
    std::unique_ptr<ILogger> logger_;
    std::unique_ptr<IDatabase> db_;
public:
    Service(std::unique_ptr<ILogger> l, std::unique_ptr<IDatabase> d)
        : logger_(std::move(l)), db_(std::move(d)) {}
};
```

DI는 — Strategy의 일반화. 의존성을 — 알고리즘처럼 주입.

## 함정 — Strategy 남용

```cpp
class Calculator {
    std::function<int(int, int)> add_strategy_;
    std::function<int(int, int)> sub_strategy_;
    std::function<int(int, int)> mul_strategy_;
};

Calculator c;
c.add_strategy_ = [](int a, int b) { return a + b; };
// ⚠️ 단순한 + 연산을 strategy로?
```

기본 연산 — strategy 안 필요. YAGNI. **변화 압력이 있을 때만**.

## 함정 — 너무 미세한 Strategy

```cpp
class HttpClient {
    std::function<...> connect_strategy_;
    std::function<...> send_strategy_;
    std::function<...> receive_strategy_;
    std::function<...> close_strategy_;
    // 모든 단계를 strategy로?
};
```

너무 잘게 — 사용자 부담. 적절한 단위.

## 함정 — Stateless strategy

```cpp
class StatelessSorter {
public:
    void sort(std::vector<int>& v) { std::sort(v.begin(), v.end()); }
    // 멤버 변수 없음 — 그냥 함수
};
```

상태 없는 strategy — 그냥 자유 함수로:

```cpp
void sort_asc(std::vector<int>& v) { std::sort(v.begin(), v.end()); }
```

또는 람다. 클래스 — 불필요.

## 모던 변형 — std::variant Strategy

```cpp
struct QuickSort { void operator()(std::vector<int>& v) const { /* ... */ } };
struct StableSort { void operator()(std::vector<int>& v) const { /* ... */ } };
struct HeapSort { void operator()(std::vector<int>& v) const { /* ... */ } };

using SortStrategy = std::variant<QuickSort, StableSort, HeapSort>;

class Sorter {
    SortStrategy strategy_;
public:
    explicit Sorter(SortStrategy s) : strategy_(std::move(s)) {}
    void sort(std::vector<int>& v) {
        std::visit([&v](auto& strat) { strat(v); }, strategy_);
    }
};
```

`std::variant` 기반 — value semantics + closed set. 가이드라인 23.

## Strategy로 단위 테스트

```cpp
class Service {
    std::unique_ptr<ILogger> logger_;
public:
    explicit Service(std::unique_ptr<ILogger> l) : logger_(std::move(l)) {}
};

// 테스트에서 mock logger 주입
TEST(...) {
    auto mock = std::make_unique<MockLogger>();
    Service svc{std::move(mock)};
    // ...
}
```

Strategy → 의존성 주입 → 테스트 친화. 가이드라인 4.

## 표준 라이브러리에서 — Strategy 사용 사례

```cpp
// std::sort — compare strategy
std::sort(v.begin(), v.end(), std::less<>{});

// std::transform — transform strategy
std::transform(in.begin(), in.end(), out.begin(), 
               [](int x) { return x * 2; });

// std::accumulate — reduce strategy
auto sum = std::accumulate(v.begin(), v.end(), 0, std::plus<>{});

// std::find_if — predicate strategy
auto it = std::find_if(v.begin(), v.end(),
                       [](int x) { return x > 0; });

// std::map / std::set — Compare strategy as template arg
std::map<K, V, std::less<K>> m;
```

STL — Strategy 사용의 모범.

## C++20 ranges — Strategy 자연

```cpp
auto evens = v | std::views::filter([](int x) { return x % 2 == 0; })
               | std::views::transform([](int x) { return x * x; });
```

filter, transform — strategy 매개변수. 람다로 자연스럽게.

## 함정 — Strategy 클래스의 인터페이스 변경

```cpp
class SortStrategy {
public:
    virtual void sort(std::vector<int>&) = 0;
    
    // 추가
    virtual void set_comparator(...) = 0;     // ⚠️ 모든 strategy 수정
    virtual void enable_parallelism(bool) = 0;
};
```

Strategy 인터페이스 진화 — 모든 구현 수정. ISP (가이드라인 3) 적용:

```cpp
class SortStrategy { virtual void sort(...) = 0; };
class Configurable { virtual void configure(...) = 0; };

class AdvancedSort : public SortStrategy, public Configurable { /* ... */ };
```

작은 인터페이스로 분리.

## Strategy + 옵션 객체

```cpp
struct SortOptions {
    bool stable = false;
    bool parallel = false;
    int threshold = 1000;
};

using SortStrategy = std::function<void(std::vector<int>&, const SortOptions&)>;
```

옵션을 — 별도 매개변수. 추가 시 — strategy 시그니처 무변경.

## 실무 가이드 — Strategy 적용

```
"어떻게"(how)를 격리하고 싶다 — Strategy?
├── 단순 함수 — 자유 함수 또는 람다 (Strategy 클래스 안 만들기)
├── 상태 있는 알고리즘 — 함수 객체 + std::function
├── 런타임 교체 — std::function 또는 가상 함수
├── 컴파일 타임 결정 — 템플릿
├── closed set + value semantics — std::variant
└── open hierarchy → 가상 함수
```

## 실무 가이드 — 체크리스트

- [ ] 정말 알고리즘 교체 필요? (YAGNI)
- [ ] 단순 함수면 — strategy 클래스 안 만들기
- [ ] 런타임 교체 필요? → `std::function` 또는 가상 함수
- [ ] 컴파일 타임 OK? → 템플릿
- [ ] Value semantics? → `std::function`, `std::variant`
- [ ] Strategy 인터페이스 — 작게 (ISP)?

## 정리

**Strategy 패턴** — 알고리즘을 캡슐화 + 교체 가능.

C++ 4가지 구현:
1. **가상 함수** — 전통, vtable 비용
2. **함수 포인터** — 가볍지만 상태 X
3. **`std::function`** — 모던 권장, 유연
4. **템플릿** — 컴파일 타임, 0 비용

도구 선택:
- 단순 함수 → 람다
- 런타임 교체 → `std::function`
- 컴파일 타임 → 템플릿
- Closed set + value → `std::variant`

표준 라이브러리 — Strategy 만연 (`std::sort`, `<algorithm>` 등).

## 관련 항목

- [가이드라인 5: 확장을 위한 디자인](/blog/programming/cpp/cpp-software-design/guideline05-design-for-extension) — Strategy로 OCP
- [가이드라인 20: composition > inheritance](/blog/programming/cpp/cpp-software-design/guideline20-favor-composition-over-inheritance) — Strategy의 큰 원칙
- [가이드라인 22: value semantics](/blog/programming/cpp/cpp-software-design/guideline22-prefer-value-semantics-over-reference-semantics) — Strategy 가치
- [가이드라인 23: value-based Strategy](/blog/programming/cpp/cpp-software-design/guideline23-prefer-a-value-based-implementation-of-strategy-and-command) — std::variant 구현
- [GoF Strategy](/blog/programming/design/gof-design-patterns/item19-strategy) — 원본
