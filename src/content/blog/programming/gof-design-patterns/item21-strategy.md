---
title: "GoF 21: Strategy"
date: 2026-02-04T10:00:00
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

→ 각 알고리즘을 **객체로** 캡슐화 → Context에 끼워 씀.

```cpp
Compressor c(std::make_unique<ZipCompression>());
c.compress(data);
c.setStrategy(std::make_unique<Lz4Compression>());   // 런타임 교체
c.compress(data);
```

## 한눈에 보는 구조

```
   Context ◇──► Strategy (interface)
   ─ strategy       ─ execute()*
   ─ setStrategy()       △
   ─ execute()           │
                  ┌──────┼──────┐
              ConcStrA  ConcStrB  ConcStrC
                ─ execute()
```

## 언제 쓰면 좋은가

- 관련된 클래스가 동작만 다를 때 — 동작을 매개변수화
- 같은 알고리즘의 **여러 변형** 필요
- 알고리즘이 클라이언트가 알아선 안 되는 데이터를 사용
- 거대한 조건문이 알고리즘 분기로 나뉨

## 언제 쓰면 안 되나

> ⚠️ **알고리즘이 영구적으로 1개**라면 Strategy 과도.

> ⚠️ **무상태 함수**라면 람다 + `std::function`로 충분 — 클래스 계층 불필요.

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

## 모던 C++ — `std::function`

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
Compressor c([](const auto& data) { /* zip */ return ...; });
```

## 모던 C++ — 템플릿 (compile-time)

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

## 실제 사례

- **`std::sort`의 비교자** (`Compare` 객체)
- 정렬·해시·해시맵의 사용자 정의 함수 객체
- **Java `Comparator`** 인터페이스
- **게임 AI** behavior strategy
- **라우팅 알고리즘 선택**

## 관련 패턴

- **[State (item 20)](/blog/programming/gof-design-patterns/item20-state)** — 구조 동일, 의도 다름
- **[Bridge (item 7)](/blog/programming/gof-design-patterns/item07-bridge)** — 구조 비슷. Bridge는 추상-구현 분리, Strategy는 알고리즘 교체
- **[Template Method (item 22)](/blog/programming/gof-design-patterns/item22-template-method)** — 같은 문제(알고리즘 변형)에 대한 다른 해결 — 상속 vs composition
- **[Singleton (item 5)](/blog/programming/gof-design-patterns/item05-singleton)** / **[Flyweight (item 11)](/blog/programming/gof-design-patterns/item11-flyweight)** — 무상태 strategy는 공유
- **[Decorator (item 9)](/blog/programming/gof-design-patterns/item09-decorator)** — Decorator도 동작 변경, 그러나 적층적
