---
title: "GoF 21: Strategy"
date: 2026-02-04T10:00:00
description: "알고리즘을 객체로 캡슐화 — 런타임에 교체 가능."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 21
draft: true
---

> **초안** — 정리 진행 중

## 의도

알고리즘 군을 정의하고 각각을 캡슐화해 **상호 교환 가능**하게. 알고리즘을 사용하는 클라이언트와 독립적으로 변경 가능.

## 동기

- 정렬 알고리즘 선택 (data 크기에 따라)
- 압축 방식 (zip, gzip, lz4)
- 결제 방식 (card, paypal, crypto)

## C++ 구현

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
c.setStrategy(std::make_unique<Lz4Compression>());   // 런타임 교체
data = c.compress(input);
```

## 모던 변형 — `std::function`

```cpp
class Compressor {
    std::function<std::vector<char>(const std::vector<char>&)> strategy;
public:
    template<typename F>
    explicit Compressor(F f) : strategy(std::move(f)) {}

    auto compress(const std::vector<char>& data) { return strategy(data); }
};

// 사용
Compressor c([](const auto& data) { /* zip 로직 */ return ...; });
```

람다·함수 포인터·함수 객체 무엇이든 받음.

## 템플릿 변형 (compile-time)

```cpp
template<typename Strategy>
class Compressor {
    Strategy strategy;
public:
    auto compress(const std::vector<char>& data) { return strategy(data); }
};
```

런타임 비용 0, 인라인 가능. 다만 타입별 인스턴스 생성.

## C 구현

```c
typedef struct {
    char* (*compress)(const char* data, size_t* out_size);
} CompressionStrategy;

typedef struct {
    const CompressionStrategy* strategy;
} Compressor;

void compressor_set(Compressor* c, const CompressionStrategy* s) {
    c->strategy = s;
}

char* compressor_compress(Compressor* c, const char* data, size_t* out_size) {
    return c->strategy->compress(data, out_size);
}
```

## State와의 차이

다시 — 구조 비슷, 의도 다름:
- **Strategy**: 외부에서 알고리즘 선택
- **State**: 객체 자체가 상태 전이 결정

## 트레이드오프

- **장점**: 알고리즘 교체 자유, 단일 책임
- **단점**: 클라이언트가 어떤 strategy를 쓸지 알아야 함
