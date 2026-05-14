---
title: "가이드라인 19: 어떻게 하는가의 격리에 Strategy를 사용하라"
date: 2026-05-13T19:00:00
description: "Strategy 패턴은 알고리즘을 갈아 끼울 수 있게 만든다. 가상 함수, 함수 포인터, std::function, 템플릿의 네 가지 구현."
tags: [C++, Software Design, Strategy, Design Patterns]
series: "C++ Software Design"
seriesOrder: 19
draft: true
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

이 코드는 gzip 알고리즘이 그대로 박혀 있다. 새 알고리즘(Zstd, LZ4)을 더하려면 `Compressor`를 손대야 한다. 가이드라인 5의 OCP 위반이다.

**Strategy 패턴**은 알고리즘을 객체로 분리한다. 알고리즘을 갈아 끼울 수 있고, 새 알고리즘을 더할 때 OCP를 만족한다.

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

이번 가이드라인은 Strategy의 GoF 정의와 C++에서의 네 가지 구현, 그리고 각각의 트레이드오프를 다룬다.

## 핵심 내용

- **Strategy 패턴** — 알고리즘을 캡슐화하고 갈아 끼울 수 있게 만든다.
- 본질은 "어떻게(how)"를 컨텍스트에서 분리하는 일이다.
- C++ 구현은 네 가지가 있다.
  1. **가상 함수**(전통 GoF)
  2. **함수 포인터**
  3. **`std::function`**(type erasure)
  4. **템플릿**(컴파일 타임)
- 가이드라인 23에서 **값 기반 Strategy**를 더 다룬다.

## 네 가지 구현

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

장점은 다음과 같다.

- 인터페이스가 분명하다.
- 런타임에 교체할 수 있다.

단점은 다음과 같다.

- vtable 비용이 든다.
- `unique_ptr` 때문에 heap 할당이 따라온다.
- 새 strategy마다 새 클래스 — 보일러플레이트가 많다.

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

장점은 다음과 같다.

- 가볍고 빠르다.
- C와 호환된다.

단점은 다음과 같다.

- 상태를 가질 수 없다(캡처 불가).
- 캡처가 있는 람다는 들어가지 않는다.
- 멤버 함수가 어색하다.

### 3) std::function (모던 권장)

```cpp
class Sorter {
    std::function<void(std::vector<int>&)> strategy_;
public:
    template<typename F>
    explicit Sorter(F f) : strategy_(std::move(f)) {}

    void sort(std::vector<int>& v) { strategy_(v); }
};

// 어떤 callable이든 받는다
Sorter s1{[](std::vector<int>& v) { std::sort(v.begin(), v.end()); }};

struct CustomSort {
    void operator()(std::vector<int>& v) const { /* ... */ }
};
Sorter s2{CustomSort{}};

Sorter s3{quicksort};     // 함수 포인터도 받는다
```

장점은 다음과 같다.

- 매우 유연하다(람다, functor, 함수 포인터, 멤버 함수 모두).
- 런타임에 교체할 수 있다.
- 값 의미론을 유지한다.

단점은 다음과 같다.

- type erasure 비용이 따른다(작지만 0은 아니다).
- 컴파일 시간이 늘어난다.

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

장점은 다음과 같다.

- 런타임 비용이 0이다(인라이닝).
- 최적화가 강력하다.

단점은 다음과 같다.

- 런타임 교체는 불가능하다.
- 다른 strategy는 다른 타입이 된다.
- 정의를 헤더에 두어야 한다.

## 표준 라이브러리 — Strategy는 어디에나

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

표준 알고리즘 대부분이 Strategy를 매개변수로 받는다.

## 표준 functor

```cpp
std::less<>, std::greater<>, std::equal_to<>
std::plus<>, std::minus<>, std::multiplies<>, std::divides<>
std::logical_and<>, std::logical_or<>
std::bit_and<>, std::bit_or<>, std::bit_xor<>
```

자주 쓰는 strategy는 표준이 제공한다. 직접 만들 일이 줄어든다.

## 네 구현의 비교

| 구현 | 비용 | 유연성 | 상태 | 런타임 교체 |
| --- | --- | --- | --- | --- |
| 가상 함수 | vtable | 클래스 단위 | 멤버 변수 | ✅ |
| 함수 포인터 | 간접 호출 | callable만 | X | ✅ (포인터 교체) |
| `std::function` | type erasure | 모든 callable | 캡처/멤버 | ✅ |
| 템플릿 | 0 | 컴파일 타임 | 멤버 변수 | ❌ |

모던 코드 대부분이 `std::function` 또는 템플릿을 고른다.

## Strategy가 어울리는 신호

코드에서 Strategy가 어울리는 신호는 다음과 같다.

### 1) if / switch로 알고리즘을 분기한다

```cpp
double calculate(double x, std::string algorithm) {
    if (algorithm == "linear") return /* ... */;
    else if (algorithm == "quadratic") return /* ... */;
    // ...
}
```

→ Strategy로 빼낸다.

### 2) 동작을 매개변수화해야 한다

```cpp
template<typename Compare>
class SortedList { /* ... */ };

SortedList<std::less<int>> asc;
SortedList<std::greater<int>> desc;
```

알고리즘 자체가 매개변수가 된다.

### 3) 런타임에 알고리즘을 갈아 끼워야 한다

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

플레이어가 난이도를 바꾸는 순간 알고리즘이 교체된다.

## 값 의미론과 참조 의미론

```cpp
// 참조 의미론 — 포인터나 레퍼런스
class Sorter {
    SortStrategy& strategy_;     // 외부 객체를 참조한다
public:
    Sorter(SortStrategy& s) : strategy_(s) {}
};

// 값 의미론 — 복사
class Sorter {
    std::function<void(std::vector<int>&)> strategy_;     // 함수 객체를 복사해 보관한다
public:
    template<typename F>
    Sorter(F f) : strategy_(std::move(f)) {}
};
```

값 의미론을 우선하자(가이드라인 22).

## Strategy와 Template Method

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

가이드라인 20 — **composition over inheritance**. Strategy를 우선한다.

## Strategy의 한계 — 데이터 공유

```cpp
class Sorter {
    std::function<void(std::vector<int>&)> strategy_;
    int compare_count_ = 0;     // strategy가 접근할 수 없다
public:
    void sort(std::vector<int>& v) {
        strategy_(v);     // strategy가 compare_count_를 늘릴 길이 없다
    }
};
```

Strategy는 context의 내부 상태에 접근하기 어렵다. 필요하면 인터페이스에 콜백을 더하거나 멤버 함수 strategy로 가야 한다.

## 함수형 Strategy

```cpp
// 모던 스타일 — 함수 자체가 strategy다
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

함수가 곧 strategy다. 클래스 hierarchy가 필요 없다.

## 다중 Strategy

```cpp
class Game {
    std::function<void(Player&)> ai_strategy_;
    std::function<void(World&)> render_strategy_;
    std::function<bool(Entity&)> collision_strategy_;
};
```

여러 strategy를 동시에 쓴다. 각자 독립적이다.

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

의존성 주입은 Strategy의 일반화다. 의존성을 알고리즘처럼 주입한다.

## 함정 — Strategy 남용

```cpp
class Calculator {
    std::function<int(int, int)> add_strategy_;
    std::function<int(int, int)> sub_strategy_;
    std::function<int(int, int)> mul_strategy_;
};

Calculator c;
c.add_strategy_ = [](int a, int b) { return a + b; };
// ⚠️ 단순한 + 연산을 strategy로 뽑을 이유가 있는가?
```

기본 연산에는 strategy가 필요 없다. YAGNI다. **변화 압력이 있을 때만** 꺼낸다.

## 함정 — 너무 잘게 자른 Strategy

```cpp
class HttpClient {
    std::function<...> connect_strategy_;
    std::function<...> send_strategy_;
    std::function<...> receive_strategy_;
    std::function<...> close_strategy_;
    // 모든 단계를 strategy로 두는가?
};
```

너무 잘게 자르면 사용자가 부담을 진다. 적절한 단위를 찾는다.

## 함정 — 상태 없는 Strategy

```cpp
class StatelessSorter {
public:
    void sort(std::vector<int>& v) { std::sort(v.begin(), v.end()); }
    // 멤버 변수가 없다 — 사실상 함수다
};
```

상태가 없는 strategy는 그냥 자유 함수로 충분하다.

```cpp
void sort_asc(std::vector<int>& v) { std::sort(v.begin(), v.end()); }
```

람다도 좋다. 클래스가 필요하지 않다.

## 모던 변형 — std::variant 기반 Strategy

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

`std::variant` 기반은 값 의미론과 닫힌 집합을 함께 만족한다. 가이드라인 23에서 더 다룬다.

## Strategy로 단위 테스트

```cpp
class Service {
    std::unique_ptr<ILogger> logger_;
public:
    explicit Service(std::unique_ptr<ILogger> l) : logger_(std::move(l)) {}
};

// 테스트에서 mock logger를 주입한다
TEST(...) {
    auto mock = std::make_unique<MockLogger>();
    Service svc{std::move(mock)};
    // ...
}
```

Strategy가 의존성 주입으로, 그것이 테스트 친화성으로 이어진다. 가이드라인 4와 닿는다.

## 표준 라이브러리의 Strategy 사용 사례

```cpp
// std::sort — 비교 strategy
std::sort(v.begin(), v.end(), std::less<>{});

// std::transform — 변환 strategy
std::transform(in.begin(), in.end(), out.begin(),
               [](int x) { return x * 2; });

// std::accumulate — reduce strategy
auto sum = std::accumulate(v.begin(), v.end(), 0, std::plus<>{});

// std::find_if — predicate strategy
auto it = std::find_if(v.begin(), v.end(),
                       [](int x) { return x > 0; });

// std::map / std::set — Compare strategy를 템플릿 인자로 받는다
std::map<K, V, std::less<K>> m;
```

STL이 Strategy 사용의 모범 사례다.

## C++20 ranges — Strategy가 자연스럽다

```cpp
auto evens = v | std::views::filter([](int x) { return x % 2 == 0; })
               | std::views::transform([](int x) { return x * x; });
```

filter와 transform이 strategy를 매개변수로 받는다. 람다로 자연스럽게 흐른다.

## 함정 — Strategy 인터페이스의 진화

```cpp
class SortStrategy {
public:
    virtual void sort(std::vector<int>&) = 0;

    // 추가
    virtual void set_comparator(...) = 0;     // ⚠️ 모든 strategy를 손봐야 한다
    virtual void enable_parallelism(bool) = 0;
};
```

Strategy 인터페이스가 커지면 모든 구현이 영향을 받는다. ISP를 적용한다(가이드라인 3).

```cpp
class SortStrategy { virtual void sort(...) = 0; };
class Configurable { virtual void configure(...) = 0; };

class AdvancedSort : public SortStrategy, public Configurable { /* ... */ };
```

작은 인터페이스로 가른다.

## Strategy + 옵션 객체

```cpp
struct SortOptions {
    bool stable = false;
    bool parallel = false;
    int threshold = 1000;
};

using SortStrategy = std::function<void(std::vector<int>&, const SortOptions&)>;
```

옵션을 별도 매개변수로 둔다. 옵션이 추가돼도 strategy의 시그니처는 변하지 않는다.

## 실무 가이드 — Strategy 적용

```
"어떻게(how)"를 격리하고 싶다 — Strategy?
├── 단순 함수 → 자유 함수 또는 람다 (Strategy 클래스를 따로 만들지 않는다)
├── 상태가 있는 알고리즘 → 함수 객체 + std::function
├── 런타임 교체가 필요하다 → std::function 또는 가상 함수
├── 컴파일 타임에 결정한다 → 템플릿
├── 닫힌 집합 + 값 의미론 → std::variant
└── open hierarchy가 필요하다 → 가상 함수
```

## 실무 가이드 — 체크리스트

- [ ] 정말 알고리즘 교체가 필요한가? (YAGNI)
- [ ] 단순 함수라면 strategy 클래스를 만들지 않았는가?
- [ ] 런타임 교체가 필요한가? → `std::function` 또는 가상 함수.
- [ ] 컴파일 타임으로 충분한가? → 템플릿.
- [ ] 값 의미론을 원하는가? → `std::function`, `std::variant`.
- [ ] Strategy 인터페이스가 작게 유지되는가? (ISP)

## 정리

**Strategy 패턴**은 알고리즘을 캡슐화하고 갈아 끼울 수 있게 한다.

C++의 네 가지 구현은 다음과 같다.

1. **가상 함수** — 전통, vtable 비용
2. **함수 포인터** — 가볍지만 상태 없음
3. **`std::function`** — 모던 권장, 유연
4. **템플릿** — 컴파일 타임, 0 비용

도구 선택 가이드는 이렇게 정리한다.

- 단순 함수면 람다.
- 런타임 교체가 필요하면 `std::function`.
- 컴파일 타임이면 템플릿.
- 닫힌 집합 + 값 의미론이면 `std::variant`.

표준 라이브러리에는 Strategy가 곳곳에 있다(`std::sort`, `<algorithm>` 등).

## 관련 항목

- [가이드라인 5: 확장을 위한 디자인](/blog/programming/cpp/cpp-software-design/guideline05-design-for-extension) — Strategy로 OCP
- [가이드라인 20: composition over inheritance](/blog/programming/cpp/cpp-software-design/guideline20-favor-composition-over-inheritance) — Strategy의 큰 원칙
- [가이드라인 22: 값 의미론](/blog/programming/cpp/cpp-software-design/guideline22-prefer-value-semantics-over-reference-semantics) — Strategy의 가치
- [가이드라인 23: 값 기반 Strategy](/blog/programming/cpp/cpp-software-design/guideline23-prefer-a-value-based-implementation-of-strategy-and-command) — std::variant 구현
- [GoF Strategy](/blog/programming/design/gof-design-patterns/item19-strategy) — 원본
