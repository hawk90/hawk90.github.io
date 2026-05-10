---
title: "GoF 21: Strategy"
date: 2026-02-04T10:00:00
description: "알고리즘을 객체로 캡슐화 — 런타임에 교체 가능."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 21
draft: true
---

## 의도

알고리즘 군을 정의하고 각각을 캡슐화해 **상호 교환 가능**하게 만듭니다. 알고리즘을 사용하는 클라이언트와 독립적으로 변경 가능.

## 동기

- 정렬 알고리즘 (data 크기/특성에 따라 quicksort, mergesort, insertion)
- 압축 (zip, gzip, lz4, zstd)
- 결제 (card, paypal, crypto)
- 라우팅 (shortest, fastest, scenic)
- 컴파일러 최적화 레벨 (-O0, -O1, -O2)

알고리즘별 클래스 폭발 회피, 런타임 교체.

## 적용 가능성

- 관련된 클래스가 동작만 다를 때 — 동작을 매개변수화
- 같은 알고리즘의 여러 변형이 필요할 때
- 알고리즘이 클라이언트가 알아선 안 되는 데이터를 사용할 때
- 클래스가 많은 동작을 가지고 그것이 조건문으로 표현될 때

## 구조

```
   Context ◇──► Strategy (interface)
   - strategy       + execute()*
   + setStrategy()       △
   + execute()           │
                  ┌──────┼──────┐
              ConcStrA  ConcStrB  ConcStrC
                + execute()
```

## 참여자

- **Strategy** — 알고리즘 인터페이스
- **ConcreteStrategy** — 구체 알고리즘 구현
- **Context** — Strategy 참조 보유, 클라이언트가 strategy 설정

## C++ 구현 — 전통

```cpp
class CompressionStrategy {
public:
    virtual ~CompressionStrategy() = default;
    virtual std::vector<char> compress(const std::vector<char>& data) = 0;
};

class ZipCompression  : public CompressionStrategy { /* ... */ };
class GzipCompression : public CompressionStrategy { /* ... */ };
class Lz4Compression  : public CompressionStrategy { /* ... */ };

class Compressor {
    std::unique_ptr<CompressionStrategy> strategy;
public:
    explicit Compressor(std::unique_ptr<CompressionStrategy> s) : strategy(std::move(s)) {}

    void setStrategy(std::unique_ptr<CompressionStrategy> s) { strategy = std::move(s); }

    std::vector<char> compress(const std::vector<char>& data) {
        return strategy->compress(data);
    }
};

// 사용
Compressor c(std::make_unique<ZipCompression>());
auto data = c.compress(input);

c.setStrategy(std::make_unique<Lz4Compression>());    // 런타임 교체
data = c.compress(input);
```

## C++ 구현 — `std::function` (모던)

```cpp
class Compressor {
    std::function<std::vector<char>(const std::vector<char>&)> strategy;
public:
    template<typename F>
    explicit Compressor(F f) : strategy(std::move(f)) {}

    void setStrategy(std::function<std::vector<char>(const std::vector<char>&)> s) {
        strategy = std::move(s);
    }

    auto compress(const std::vector<char>& data) { return strategy(data); }
};

// 사용 — 람다·함수·함수 객체 모두 OK
Compressor c([](const auto& data) { /* zip */ return ...; });
c.setStrategy([](const auto& data) { /* lz4 */ return ...; });
```

## C++ 구현 — 템플릿 (compile-time)

```cpp
template<typename Strategy>
class Compressor {
    Strategy strategy;
public:
    auto compress(const std::vector<char>& data) { return strategy(data); }
};

// 사용
struct ZipStrategy { auto operator()(const auto& d) { /* ... */ } };
Compressor<ZipStrategy> c;
```

런타임 비용 0, 인라인 가능. 단 같은 인스턴스가 다른 strategy로 동작 못 함 (타입이 다름).

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

## State와의 비교

다시 — 구조 비슷, 의도 다름:

- **Strategy**: 외부에서 알고리즘 선택, strategy끼리 무관
- **State**: 객체 자체가 상태 전이 결정, state끼리 전이 그래프 형성

## Template Method와의 비교

- **Template Method**: 상속, 알고리즘 골격 + 일부 단계만 override
- **Strategy**: composition, 알고리즘 전체를 교체

Strategy가 더 유연 (런타임 교체, 다중 상속 회피).

## 결과 (트레이드오프)

**장점**
- 알고리즘 교체 자유 (런타임)
- 단일 책임 (각 strategy가 한 알고리즘)
- 조건문 폭탄 회피
- 새 알고리즘 추가가 OCP 만족

**단점**
- 클라이언트가 어떤 strategy를 쓸지 알아야 함
- strategy 수만큼 클래스 (단순한 경우 람다로 해결)
- Context↔Strategy 통신 오버헤드 (인자 많이 넘기거나 Context 참조)

## 변형

- **무상태 strategy** — Singleton/Flyweight으로 공유
- **`std::function` strategy** — 람다 친화
- **템플릿 strategy** — 컴파일 타임 선택, 비용 0
- **policy-based design** — 템플릿 매개변수로 여러 정책 조합

## 알려진 사용 사례

- `std::sort`의 비교자 (custom Compare)
- 정렬·해시·해시맵의 사용자 정의 함수 객체
- Java `Comparator` 인터페이스
- 게임의 AI behavior strategy
- 라우팅 알고리즘 선택

## 관련 패턴

- **[State (item 20)](/blog/programming/gof-design-patterns/item20-state)** — 구조 동일, 의도 다름
- **[Bridge (item 7)](/blog/programming/gof-design-patterns/item07-bridge)** — 구조 비슷. Bridge는 추상-구현 분리, Strategy는 알고리즘 교체
- **[Template Method (item 22)](/blog/programming/gof-design-patterns/item22-template-method)** — 같은 문제(알고리즘 변형)에 대한 다른 해결 — 상속 vs composition
- **[Singleton (item 5)](/blog/programming/gof-design-patterns/item05-singleton)** / **[Flyweight (item 11)](/blog/programming/gof-design-patterns/item11-flyweight)** — 무상태 strategy는 공유 가능
- **[Decorator (item 9)](/blog/programming/gof-design-patterns/item09-decorator)** — Decorator도 동작 변경, 그러나 적층적
