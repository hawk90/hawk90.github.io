---
title: "GoF 21: Strategy"
date: 2026-02-01T21:00:00
description: "알고리즘을 객체로 캡슐화 — 런타임에 교체 가능."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 21
draft: true
---

## 한 줄 요약

> **"알고리즘을 끼워서 쓰는 슬롯"** — 같은 인터페이스의 알고리즘 군을 런타임에 교체.

## 어떤 문제를 푸는가

같은 일을 하는 여러 알고리즘이 있고, 상황에 따라 골라 써야 합니다.

- **정렬** — 데이터 크기·특성에 따라 quicksort / mergesort / insertion
- **압축** — zip / gzip / lz4 / zstd
- **결제** — card / paypal / crypto
- **라우팅** — shortest / fastest / scenic

조건문으로 분기하면 **switch 폭탄** + 새 알고리즘 추가 시 OCP 위반.

```cpp
// Bad: 알고리즘 추가마다 함수 수정
std::vector<char> compress(const std::vector<char>& data, Algo a) {
    switch (a) {
        case Algo::Zip:  return zipCompress(data);
        case Algo::Gzip: return gzipCompress(data);
        case Algo::Lz4:  return lz4Compress(data);
        // 새 알고리즘 추가 시 여기 수정 + 모든 호출처
    }
}
```

→ 각 알고리즘을 **객체로** 캡슐화 → Context에 끼워 씀.

```cpp
Compressor c(std::make_unique<ZipCompression>());
c.compress(data);
c.setStrategy(std::make_unique<Lz4Compression>());   // 런타임 교체
c.compress(data);
```

새 알고리즘 = 새 Strategy 클래스. 기존 코드 무수정.

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item21-strategy.svg" alt="Strategy 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

## 언제 쓰면 좋은가

- 관련된 클래스가 동작만 다를 때 — 동작을 매개변수화
- 같은 알고리즘의 **여러 변형** 필요
- 알고리즘이 클라이언트가 알아선 안 되는 데이터를 사용
- 거대한 조건문이 알고리즘 분기로 나뉨

## 언제 쓰면 안 되나

> ⚠️ **알고리즘이 영구적으로 1개**라면 Strategy 과도.

> ⚠️ **무상태 함수**라면 람다 + `std::function`로 충분 — 클래스 계층 불필요.

> ⚠️ **알고리즘끼리 인터페이스가 진짜로 다르면** 통합 강제하면 부자연 — 그냥 별도 함수.

## C++ 구현 — 전통

### 1. Strategy 인터페이스

```cpp
class CompressionStrategy {
public:
    virtual ~CompressionStrategy() = default;
    virtual std::vector<char> compress(const std::vector<char>& data) = 0;
};
```

### 2. ConcreteStrategy

```cpp
class ZipCompression  : public CompressionStrategy { /* ... */ };
class GzipCompression : public CompressionStrategy { /* ... */ };
class Lz4Compression  : public CompressionStrategy { /* ... */ };
```

### 3. Context

```cpp
class Compressor {
    std::unique_ptr<CompressionStrategy> strategy;
public:
    explicit Compressor(std::unique_ptr<CompressionStrategy> s)
        : strategy(std::move(s)) {}

    void setStrategy(std::unique_ptr<CompressionStrategy> s) {
        strategy = std::move(s);
    }

    std::vector<char> compress(const std::vector<char>& data) {
        return strategy->compress(data);
    }
};
```

### 4. 런타임 교체

```cpp
Compressor c(std::make_unique<ZipCompression>());
auto data = c.compress(input);

c.setStrategy(std::make_unique<Lz4Compression>());   // 교체
data = c.compress(input);
```

## 자주 보는 안티패턴

### 1. Strategy가 Context의 디테일을 알아야 함 (양방향 결합)

```cpp
// Bad
class Strategy {
public:
    virtual void run(Context& ctx) {
        auto& priv = ctx.privateField;   // ◄── Context 내부 노출
    }
};
```

**문제**: Strategy를 갈아끼우려면 Context 알아야 → 결합도 폭발.

**해결**: 메서드 인자로 *필요한 데이터만* 전달. `run(data, options)` 형태.

### 2. Strategy 인터페이스가 모든 알고리즘에 안 맞음

```cpp
// Bad
class SortStrategy {
public:
    virtual void sort(std::vector<int>&, Comparator, MemoryPool&, ThreadPool&) = 0;
    // ◄── InsertionSort는 ThreadPool 안 씀 — null 처리?
};
```

**문제**: 인터페이스가 *최대 공약수*가 아닌 *최대 공배수* → 일부 strategy에 의미 없는 인자.

**해결**: 인터페이스를 *최소*로. 추가 옵션은 strategy별 생성자 인자로.

### 3. Strategy 무상태인데 매번 새 인스턴스

```cpp
// Bad
for (int i = 0; i < 1000000; ++i) {
    c.setStrategy(std::make_unique<ZipCompression>());   // ◄── 매번 heap alloc
    c.compress(data);
}
```

**문제**: 무상태 strategy를 매번 새로 — heap 부담.

**해결**: Singleton 또는 Flyweight으로 공유. Strategy 객체는 사실상 함수.

### 4. Context가 Strategy 종류를 안 (downcast)

```cpp
// Bad
auto& s = c.getStrategy();
if (auto* zip = dynamic_cast<ZipCompression*>(&s))
    zip->setLevel(9);   // ◄── 구체 타입 노출
```

**문제**: Strategy 패턴의 목적(추상화) 무산.

**해결**: 필요한 옵션은 Strategy 생성 시점에 전달. 또는 Strategy 인터페이스에 추가.

### 5. Strategy 교체가 race (멀티스레드)

```cpp
// Bad
class Compressor {
    std::unique_ptr<Strategy> strategy;
public:
    void compress(...) { strategy->compress(...); }    // 스레드 1
    void setStrategy(...) { strategy = ...; }          // 스레드 2 — race
};
```

**문제**: 한 스레드가 compress 중 다른 스레드가 setStrategy → use-after-free.

**해결**: `std::shared_ptr<Strategy>` + atomic load/store. 또는 immutable Context (Compressor를 새로 만듦).

### 6. Strategy 누락된 채 호출

```cpp
Compressor c;   // strategy = nullptr
c.compress(data);   // ◄── crash
```

**문제**: strategy 없는 상태 허용.

**해결**: 생성자에서 *필수* 인자로 강제. 또는 null object pattern (NoOpStrategy 기본).

## Modern C++ 변형

### 1. `std::function` (lambda strategy)

람다 친화. 클래스 계층 불필요.

```cpp
class Compressor {
    std::function<std::vector<char>(const std::vector<char>&)> strategy;
public:
    template<typename F>
    explicit Compressor(F f) : strategy(std::move(f)) {}

    auto compress(const std::vector<char>& data) { return strategy(data); }
};

// 사용 — 람다·함수·함수 객체 모두 OK
Compressor c([](const auto& data) { /* zip */ return /* ... */; });
```

### 2. Template (compile-time strategy)

런타임 비용 0, 인라인.

```cpp
template<typename Strategy>
class Compressor {
    Strategy strategy;
public:
    auto compress(const std::vector<char>& data) { return strategy(data); }
};

struct ZipStrategy { auto operator()(const auto& d) { /* ... */ } };
Compressor<ZipStrategy> c;
```

단, 같은 인스턴스가 다른 strategy로 동작 못 함 (타입 다름).

### 3. `std::variant` + visit (closed set)

```cpp
struct Zip {}; struct Gzip {}; struct Lz4 {};
using Strategy = std::variant<Zip, Gzip, Lz4>;

class Compressor {
    Strategy strategy;
public:
    auto compress(const auto& data) {
        return std::visit([&](auto& s) { return s.compress(data); }, strategy);
    }
};
```

가상 호출 없이 런타임 교체.

### 4. Concept-based strategy

```cpp
template <typename T>
concept Compression = requires(T t, const std::vector<char>& d) {
    { t.compress(d) } -> std::convertible_to<std::vector<char>>;
};

template <Compression S>
class Compressor {
    S strategy;
public:
    auto compress(const auto& d) { return strategy.compress(d); }
};
```

가상 함수 없이 인터페이스 강제.

### 5. Policy-based design (Alexandrescu)

```cpp
template <typename CompressionPolicy, typename LoggingPolicy>
class Compressor : public CompressionPolicy, public LoggingPolicy {
public:
    auto compress(const auto& data) {
        LoggingPolicy::log("compressing");
        return CompressionPolicy::compress(data);
    }
};

Compressor<ZipCompression, ConsoleLogging> c;
```

여러 strategy 축을 type으로 조합. STL의 Allocator가 대표적.

### 6. Function ref (`std::function_ref`, C++26)

```cpp
auto compress(std::function_ref<std::vector<char>(const std::vector<char>&)> s,
              const std::vector<char>& data) {
    return s(data);
}
```

`std::function`의 heap alloc 없음. 일시 callable 전달에 효율.

## C 구현

```c
typedef struct {
    char* (*compress)(const char* data, size_t in_size, size_t* out_size);
} CompressionStrategy;

extern const CompressionStrategy zip_strategy, gzip_strategy, lz4_strategy;

typedef struct {
    const CompressionStrategy* strategy;
} Compressor;

void compressor_set(Compressor* c, const CompressionStrategy* s) { c->strategy = s; }

char* compressor_compress(Compressor* c, const char* data, size_t in_size, size_t* out_size) {
    return c->strategy->compress(data, in_size, out_size);
}
```

## 성능 — Strategy 구현 방식

1MB 데이터 compress 1만 번 (실제 압축 비용 제외, dispatch overhead만).

| 방식 | dispatch 오버헤드 | 비고 |
| --- | --- | --- |
| 직접 호출 | 0 | baseline |
| Virtual strategy | 5ns/call | 가상 호출 |
| `std::function` | 8ns/call | type erasure |
| `std::variant + visit` | 2ns/call | branch table |
| Template (compile-time) | 0 | inline 가능 |
| Concept + template | 0 | inline 가능 |
| Policy-based | 0 | inline 가능 |

압축 자체가 ms 단위라 dispatch는 noise. 그러나 dispatch가 hot인 경우 (예: 정렬 비교자) template 또는 variant.

## Strategy vs State vs Template Method — 한 줄 정리

| 패턴 | 차이 |
| --- | --- |
| **Strategy** | 외부에서 알고리즘 선택, 평행 |
| **State** | 객체 자체가 상태 전이, 그래프 형성 |
| **Template Method** | 상속, 알고리즘 골격 + 일부 단계 override |

State와 구조 거의 동일, Template Method와 같은 문제 다른 해결.

## 트레이드오프 — 한눈에

| 차원 | Strategy |
| --- | --- |
| 알고리즘 교체 자유 | ✅ 런타임 |
| 단일 책임 (각 strategy) | ✅ |
| 조건문 폭탄 회피 | ✅ |
| 새 알고리즘 (OCP) | ✅ |
| 클라이언트가 strategy 선택 | ⚠️ 어느 게 적합한지 알아야 함 |
| 클래스 수 증가 | ⚠️ 람다로 완화 |
| Strategy↔Context 결합 | ⚠️ 인터페이스 신중히 |

## 실제 사례

- **`std::sort`의 비교자** — `Compare` 함수 객체
- **정렬·해시·해시맵의 사용자 정의 함수 객체** — `std::hash<T>`, `std::less<T>`
- **Java `Comparator`** 인터페이스
- **게임 AI** behavior strategy — Aggressive, Defensive, Flee
- **라우팅 알고리즘 선택** — Dijkstra, A*, BFS
- **STL Allocator** — 메모리 할당 정책
- **Policy-based smart pointer** — Loki, Modern C++ Design
- **TLS cipher suite** — 클라이언트·서버 협상
- **gRPC interceptor** — request handling 정책
- **Spring `@Conditional` + Bean** — 환경별 구현 선택
- **React state management** — Redux, Zustand, Recoil

## 관련 패턴

- **[State (item 20)](/blog/programming/design/gof-design-patterns/item20-state)** — 구조 동일, 의도 다름
- **[Bridge (item 7)](/blog/programming/design/gof-design-patterns/item07-bridge)** — 구조 비슷. Bridge는 추상-구현 분리, Strategy는 알고리즘 교체
- **[Template Method (item 22)](/blog/programming/design/gof-design-patterns/item22-template-method)** — 같은 문제(알고리즘 변형)에 대한 다른 해결 — 상속 vs composition
- **[Singleton (item 5)](/blog/programming/design/gof-design-patterns/item05-singleton)** / **[Flyweight (item 11)](/blog/programming/design/gof-design-patterns/item11-flyweight)** — 무상태 strategy는 공유
- **[Decorator (item 9)](/blog/programming/design/gof-design-patterns/item09-decorator)** — Decorator도 동작 변경, 그러나 적층적
- **[Pattern Relationships (item 24)](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview)** — State·Strategy·Template Method 삼각형
