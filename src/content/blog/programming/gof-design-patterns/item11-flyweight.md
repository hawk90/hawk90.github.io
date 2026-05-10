---
title: "GoF 11: Flyweight"
date: 2026-02-02T15:00:00
description: "공유 가능한 부분을 분리해 메모리 절약 — 객체가 너무 많을 때."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 11
---

## 한 줄 요약

> **"같은 건 하나만 두고 위치만 따로"** — 글자 'a'가 10만 번 등장해도 객체는 1개.

## 어떤 문제를 푸는가

문서 편집기에 **수십만 개의 글자 객체**가 있다고 해봅시다. 각 글자가 폰트·색·크기·위치·강조 정보를 모두 들고 있으면 메모리 폭발.

같은 폰트의 'a'가 10만 개라면 — 글자 모양·폰트는 **한 객체**만 두고, **위치만** 각자 따로.

## 핵심 개념: intrinsic vs extrinsic

| | intrinsic (공유 가능) | extrinsic (외부 전달) |
| --- | --- | --- |
| 위치 | 객체 안 | 호출 인자 |
| 예 (글자) | 글자 모양, 폰트 | 위치, 강조 여부 |
| 공유 | ✅ 공유 객체 | ❌ 컨텍스트별 |

intrinsic만 객체에 두고, extrinsic은 메서드 인자로 전달.

## 한눈에 보는 구조

```
   FlyweightFactory
   ─ pool: Map<key, Flyweight>
   ─ getFlyweight(key)

   Flyweight (interface)
   ─ operation(extrinsicState)*
        △
        │
   ┌────┴────┐
ConcFly  UnsharedConcFly
```

Factory가 풀을 관리 — 같은 key 요청 시 캐시된 객체 반환.

## 언제 쓰면 좋은가

- 어플리케이션이 **다수의 객체**를 사용 (수만~수백만)
- 객체 저장 비용이 높음
- 대부분의 상태를 **외부 상태로 추출** 가능
- 객체 동일성보다 **상태 동등성**으로 충분 (id 비교 X)

## 언제 쓰면 안 되나

> ⚠️ **객체가 적으면 과도** — 공유 인프라 구축 비용 > 메모리 절약.

> ⚠️ **상태 분리가 부자연스럽면** — extrinsic 추출이 도메인 어색하면 코드 더 복잡.

## C++ 구현

### 1. Flyweight — intrinsic만 보유

```cpp
class Glyph {
    char character;
    Font font;
public:
    Glyph(char c, Font f) : character(c), font(std::move(f)) {}

    void draw(int x, int y) const {     // ◄── extrinsic은 인자로
        // character와 font로 (x, y) 위치에 렌더링
    }
};
```

### 2. Factory — 풀 관리

```cpp
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
```

같은 (글자, 폰트) 조합은 단 한 번만 생성 → 이후엔 캐시 반환.

### 3. 사용

```cpp
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
    return NULL;
}

void glyph_draw(const Glyph* g, int x, int y) { /* ... */ }
```

## 트레이드오프 — 한눈에

| 차원 | Flyweight |
| --- | --- |
| 메모리 사용량 ↓ | ✅ 매우 큼 (객체 수 × intrinsic 크기) |
| CPU 캐시 친화 | ✅ 같은 객체 반복 접근 |
| extrinsic 관리 | ⚠️ 매 호출마다 전달 |
| 공유 객체 mutation | ❌ 위험 — 보통 immutable |
| Factory 동기화 (멀티스레드) | ⚠️ 락 필요 |

## 실제 사례

- **문서 편집기** (글자, 폰트)
- **`std::string` 일부 구현** (SSO/COW)
- **게임 엔진** (지형 타일, 풀 종류)
- **Java의 `String.intern()`, `Integer` 캐시** (-128~127)
- **C++ `string_view`** — 자체는 flyweight 아니지만 공유 의도

## 관련 패턴

- **[Composite (item 8)](/blog/programming/gof-design-patterns/item08-composite)** — Composite의 leaf가 많을 때 Flyweight으로 공유
- **[State (item 20)](/blog/programming/gof-design-patterns/item20-state)** — 무상태 state 객체는 Flyweight으로 공유
- **[Strategy (item 21)](/blog/programming/gof-design-patterns/item21-strategy)** — 무상태 strategy 객체도 같은 이유로 공유
- **[Singleton (item 5)](/blog/programming/gof-design-patterns/item05-singleton)** — FlyweightFactory는 보통 Singleton
