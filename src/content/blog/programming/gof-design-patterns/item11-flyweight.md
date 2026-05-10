---
title: "GoF 11: Flyweight"
date: 2026-02-02T15:00:00
description: "공유 가능한 부분(intrinsic)을 분리해 메모리 절약 — 객체 수가 많을 때."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 11
draft: true
---

> **초안** — 정리 진행 중

## 의도

공유 가능한 상태를 분리해 **다수의 비슷한 객체를 효율적으로** 표현. 메모리 사용량 감소.

## 동기

문서 편집기의 글자 객체 — 백만 개의 'a'가 같은 폰트·색이라면 한 객체를 공유.

## intrinsic vs extrinsic 상태

- **intrinsic**: 공유 가능, 객체 안에 저장 (글자 모양, 폰트)
- **extrinsic**: 외부에서 매번 전달 (위치, 강조 여부)

## C++ 구현

```cpp
// Flyweight (intrinsic만 보유)
class Glyph {
    char  character;
    Font  font;
public:
    Glyph(char c, Font f) : character(c), font(std::move(f)) {}
    void draw(int x, int y) const {    // extrinsic은 인자로
        // character와 font로 렌더링
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
};

// 사용
GlyphFactory factory;
const Glyph& a = factory.get('a', myFont);
a.draw(10, 20);    // extrinsic 위치
a.draw(30, 20);    // 같은 글자 다른 위치 — 같은 객체 재사용
```

## C 구현

```c
typedef struct {
    char    character;
    int     font_id;
} Glyph;

#define POOL_SIZE 256
static Glyph pool[POOL_SIZE];
static int pool_count = 0;

const Glyph* glyph_get(char c, int font_id) {
    for (int i = 0; i < pool_count; ++i) {
        if (pool[i].character == c && pool[i].font_id == font_id)
            return &pool[i];
    }
    pool[pool_count] = (Glyph){c, font_id};
    return &pool[pool_count++];
}

void glyph_draw(const Glyph* g, int x, int y) { /* ... */ }
```

## 표준 라이브러리에서

`std::string` 구현이 일부 작은 string에 대해 SSO/COW로 비슷한 효과. 정수 캐시 등도 비슷한 발상.

## 트레이드오프

- **장점**: 대량 객체 메모리 절약
- **단점**: extrinsic 상태 관리 부담, 공유 객체의 thread-safety 주의
