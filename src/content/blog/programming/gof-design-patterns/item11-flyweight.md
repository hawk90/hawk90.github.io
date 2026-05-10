---
title: "GoF 11: Flyweight"
date: 2026-02-02T15:00:00
description: "공유 가능한 부분(intrinsic)을 분리해 메모리 절약 — 객체 수가 많을 때."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 11
draft: true
---

## 의도

공유를 통해 다수의 작은 객체를 효율적으로 지원합니다. 객체 수가 너무 많아 보통 방식으로는 메모리·성능에 부담이 될 때.

## 동기

문서 편집기에서 **수십만 개의 글자 객체** — 각 글자가 폰트·색·크기 정보를 모두 들고 있으면 메모리 폭발. 같은 폰트의 'a'가 10만 개라면 같은 객체 하나만 두고 위치(extrinsic)만 각각 따로.

## intrinsic vs extrinsic 상태

- **intrinsic**: 공유 가능, 객체 안에 저장 (글자 모양, 폰트)
- **extrinsic**: 외부에서 매번 전달, 컨텍스트별로 다름 (위치, 강조 여부)

intrinsic만 객체에 두고, extrinsic은 메서드 인자로.

## 적용 가능성

- 어플리케이션이 다수의 객체를 사용
- 객체 저장 비용이 높음
- 대부분의 객체 상태를 외부 상태로 만들 수 있음
- 객체를 제거하면 비교적 적은 수의 공유 객체로 대체 가능

## 구조

```
   FlyweightFactory
   - pool: Map<key, Flyweight>
   + getFlyweight(key): Flyweight

   Flyweight (interface)
   + operation(extrinsicState)*
        △
        │
   ┌────┴────┐
ConcFly  UnsharedConcFly
```

## 참여자

- **Flyweight** — extrinsic을 받아 동작하는 인터페이스
- **ConcreteFlyweight** — Flyweight 구현, intrinsic 보유
- **FlyweightFactory** — 풀 관리, 공유 보장
- **Client** — flyweight 보유, extrinsic 계산해 메서드에 전달

## C++ 구현

```cpp
// Flyweight (intrinsic만 보유)
class Glyph {
    char character;
    Font font;
public:
    Glyph(char c, Font f) : character(c), font(std::move(f)) {}
    void draw(int x, int y) const {    // extrinsic은 인자로
        // character와 font로 (x, y) 위치에 렌더링
    }
};

// Factory — 공유 보장
class GlyphFactory {
    std::map<std::pair<char, Font>, std::unique_ptr<Glyph>> pool;
public:
    const Glyph& get(char c, Font f) {
        auto key = std::make_pair(c, f);
        auto it = pool.find(key);
        if (it == pool.end()) {
            auto [iter, _] = pool.emplace(key, std::make_unique<Glyph>(c, f));
            return *iter->second;
        }
        return *it->second;
    }

    std::size_t cacheSize() const { return pool.size(); }
};

// 사용
GlyphFactory factory;

const Glyph& a = factory.get('a', myFont);
a.draw(10, 20);    // 위치 extrinsic
a.draw(30, 20);    // 같은 글자 다른 위치 — 같은 객체 재사용
a.draw(50, 20);

// 'a'가 백 번 나와도 객체는 하나
```

## C 구현

```c
typedef struct {
    char character;
    int  font_id;
} Glyph;

#define POOL_SIZE 256
static Glyph pool[POOL_SIZE];
static int   pool_count = 0;

const Glyph* glyph_get(char c, int font_id) {
    for (int i = 0; i < pool_count; ++i) {
        if (pool[i].character == c && pool[i].font_id == font_id)
            return &pool[i];
    }
    if (pool_count < POOL_SIZE) {
        pool[pool_count] = (Glyph){c, font_id};
        return &pool[pool_count++];
    }
    return NULL;     // pool 가득
}

void glyph_draw(const Glyph* g, int x, int y) { /* ... */ }
```

## 결과 (트레이드오프)

**장점**
- 메모리 사용량 대폭 감소 (객체 수 ↓ × intrinsic 크기)
- CPU 캐시 친화 (같은 객체 반복 접근)
- 내부 표현 일관성

**단점**
- extrinsic 상태 관리·계산 비용 (각 호출마다 전달)
- 공유 객체의 thread-safety 주의 (보통 immutable)
- factory 동기화 필요 (멀티스레드)
- 코드 복잡도 ↑

## 변형

- **Static flyweight** — 컴파일 타임에 결정되는 작은 집합 (enum/constexpr 객체)
- **String interning** — 문자열 자체가 일종의 flyweight (Java, Python의 small string cache)
- **Boxed primitives** — Java의 `Integer.valueOf(int)`가 작은 정수를 캐싱

## 알려진 사용 사례

- 문서 편집기 (글자, 폰트)
- `std::string` 구현 일부 (SSO/COW)
- 게임 엔진 (지형 타일, 풀 종류)
- Java의 `String.intern()`, `Integer` 캐시
- C++의 string_view (자체는 flyweight 아니지만 공유 의도)

## 관련 패턴

- **[Composite (item 8)](/blog/programming/gof-design-patterns/item08-composite)** — Composite의 leaf가 많을 때 Flyweight로 공유 가능
- **[State (item 20)](/blog/programming/gof-design-patterns/item20-state)** — 무상태 state 객체는 Flyweight으로 공유 가능
- **[Strategy (item 21)](/blog/programming/gof-design-patterns/item21-strategy)** — 무상태 strategy 객체도 같은 이유로 공유
- **[Singleton (item 5)](/blog/programming/gof-design-patterns/item05-singleton)** — FlyweightFactory는 보통 Singleton
