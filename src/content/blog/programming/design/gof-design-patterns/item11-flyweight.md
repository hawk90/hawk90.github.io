---
title: "GoF 11: Flyweight"
date: 2026-05-01T11:00:00
description: "공유 가능한 부분을 분리해 메모리 절약 — 객체가 너무 많을 때."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 11
draft: false
---

## 한 줄 요약

> **"같은 건 하나만 두고 위치만 따로"** — 글자 'a'가 10만 번 등장해도 객체는 1개.

## 비유 — 알파벳 폰트 글리프

문서에 "the quick brown fox..."가 100번 반복된다고 해봅시다. 글자 *'a'가 수백 번* 등장합니다. 매 *'a'마다 글리프 모양*(베지어 곡선 데이터)을 따로 저장하면 *메모리 폭발*입니다.

실제 폰트 렌더링은 *'a'의 모양 데이터를 한 번만* 메모리에 둡니다. 각 *'a'의 위치, 크기, 색상*만 따로 기록합니다.

또는 게임에서 *나무 1만 그루*를 생각해봅시다. *나무 메시(3D 모델)*는 *한 번만* GPU에 올리고, 각 나무의 *위치·크기·회전*만 별도로 처리합니다.

Flyweight가 이 구조입니다.

- *글리프 모양·메시 데이터* = intrinsic state (공유)
- *위치·색상·크기* = extrinsic state (외부 전달)
- *Factory* = 같은 글리프 요청 시 *이미 만든 것 재사용*

"*많이 등장하는데 내용은 같은*" 객체가 보이면 Flyweight를 의심합니다.

## 어떤 문제를 푸는가

문서 편집기에 **수십만 개의 글자 객체**가 있다고 해봅시다. 각 글자가 폰트·색·크기·위치·강조 정보를 모두 들고 있으면 메모리 폭발.

같은 폰트의 'a'가 10만 개라면 — *글자 모양·폰트*는 **한 객체**만 두고, *위치*는 **각자 따로**.

## 핵심 개념: intrinsic vs extrinsic

| | intrinsic (공유 가능) | extrinsic (외부 전달) |
| --- | --- | --- |
| 위치 | 객체 안 (멤버) | 호출 인자 |
| 변하는가 | ❌ 불변 (immutable) | ✅ 컨텍스트별 |
| 예 (글자) | 글자 모양, 폰트, 너비 | 위치, 색, 강조 여부 |
| 공유 | ✅ 1개 객체로 다수 표현 | ❌ 인스턴스별 |

→ **intrinsic만 객체에 두고, extrinsic은 메서드 인자로 전달**.

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item11-flyweight.svg" alt="Flyweight 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

Factory가 풀을 관리 — 같은 key 요청 시 캐시된 객체 반환.

런타임 상호작용은 다음과 같습니다.

<img src="/images/blog/gof/diagrams/item11-flyweight-seq.svg" alt="Flyweight 시퀀스 — Factory가 공유 인스턴스 반환, Extrinsic은 호출 시 전달" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

## 언제 쓰면 좋은가

- 어플리케이션이 **다수의 객체**를 사용 (수만~수백만)
- 객체 저장 비용이 *전체 메모리 budget의 상당 비율*
- 대부분의 상태를 **외부 상태로 추출** 가능
- 객체 *동일성보다 상태 동등성*으로 충분 (id 비교 X)
- *읽기 위주* 워크로드 (mutation이 거의 없음)

## 언제 쓰면 안 되나

> ⚠️ **객체가 적으면 과도** — 공유 인프라 (Factory + 해시맵) 구축 비용 > 메모리 절약.

> ⚠️ **상태 분리가 부자연스러우면** — extrinsic 추출이 도메인 어색하면 코드 더 복잡.

> ⚠️ **공유 객체에 mutation 필요** — Flyweight는 보통 immutable. mutation이 필요하면 *Copy-on-Write* 같은 추가 메커니즘.

> ⚠️ **멀티스레드 race** — Factory의 풀 접근에 lock 또는 lock-free 자료구조 필요. 비용 vs 절감 신중 비교.

## 헷갈리는 패턴과의 차이

| 비교 대상 | 무엇이 다른가 |
| --- | --- |
| [Singleton](/blog/programming/design/gof-design-patterns/item05-singleton) | Singleton은 *정확히 하나*. Flyweight는 *여러 개를 공유* (intrinsic 동일한 것끼리). |
| Object Pool | Object Pool은 *생성 비용 절약 + 재사용* (mutable). Flyweight는 *intrinsic 불변 + 공유*. |
| [Prototype](/blog/programming/design/gof-design-patterns/item04-prototype) | Prototype은 *복제로 새 객체 생성*. Flyweight는 *기존 객체 재사용*. |
| Cache | Cache는 *값을 일시 저장*. Flyweight는 *영구 공유 객체*. |

판별 한 줄: *"같은 내용 객체가 너무 많아 메모리가 문제"*면 Flyweight.

## C++ 구현

### 1. Flyweight — intrinsic만 보유

```cpp
class Glyph {
    char character;
    Font font;
public:
    Glyph(char c, Font f) : character(c), font(std::move(f)) {}

    // extrinsic (x, y, color)은 인자로
    void draw(int x, int y, Color color) const {
        // character와 font로 (x, y) 위치에 color로 렌더링
    }
};
```

### 2. Factory — 풀 관리

```cpp
class GlyphFactory {
    std::unordered_map<std::pair<char, Font>, std::unique_ptr<Glyph>, PairHash> pool;
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
a.draw(10, 20, Color::Black);    // 위치·색 extrinsic
a.draw(30, 20, Color::Red);      // 같은 글자 — 같은 객체 재사용
a.draw(50, 20, Color::Black);

// 'a'가 백 번 나와도 객체는 하나
```

### 4. 메모리 절약 추정 — 글자 10만 개

| 구성 | 객체당 | 객체 수 | 총 메모리 |
| --- | --- | --- | --- |
| naive (전부 멤버) | 64B | 100,000 | **6.4 MB** |
| Flyweight (intrinsic 공유) | 64B (공유) + 8B 좌표/색 (외부) | 26 종 × 64B + 100k × 8B | **~0.8 MB** |

→ ~8× 절감 (실제 값은 도메인 특성에 따라).

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

void glyph_draw(const Glyph* g, int x, int y, int color) { /* ... */ }
```

선형 탐색이지만 POOL_SIZE가 작으면 cache friendly. 큰 풀이면 hash table.

## Flyweight의 4 가지 변형

### 1. **Unshared concrete flyweight**

상위 인터페이스는 같지만 *공유되지 않는* concrete. 예: 글자 컴포지트의 *행 (line)* 객체 — 인터페이스는 Glyph지만 매번 다름.

### 2. **Lazy intrinsic 초기화**

생성이 비싸면 Factory에서 *처음 요청 시 생성*. 그 후 캐시.

```cpp
const Glyph& get(char c, Font f) {
    // lazy: 처음 호출 시에만 생성
}
```

### 3. **Pool with eviction (LRU)**

메모리 상한이 있으면 *덜 쓰인 객체 제거*. 단 동일성 가정 깨질 수 있음 — 신중.

### 4. **Thread-local Factory**

스레드 contention 회피. 단 *스레드별로 풀이 따로*라 전체 객체 수는 증가.

## 흔한 함정 — Anti-patterns

### 1. extrinsic 상태를 *객체에 다시 저장*

```cpp
// 회피
class Glyph {
    int last_x, last_y;     // ❌ 위치를 객체에 — 공유 의미 깨짐
public:
    void draw(int x, int y) {
        last_x = x; last_y = y;
        // ...
    }
};
```

→ Flyweight의 *공유 가정*이 무너짐. extrinsic은 *반드시 인자 또는 외부 컨텍스트*.

### 2. 공유 객체 *mutation*

```cpp
// 회피
const Glyph& g = factory.get('a', font);
const_cast<Glyph&>(g).changeFont(...);    // ❌ 다른 사용자에 영향
```

→ Flyweight는 *원칙적으로 immutable*. mutation이 필요하면 Flyweight 폐기 또는 새 객체.

### 3. Factory가 *무제한 캐시*

```cpp
// 회피
class GlyphFactory {
    std::map<Key, std::unique_ptr<Glyph>> pool;   // ❌ 영원히 증가
};
```

→ 풀 자체가 *메모리 leak*. *상한* 설정 또는 *eviction* 전략 (LRU 등).

### 4. *동일성 비교* 사용

```cpp
// 회피
const Glyph& g1 = factory.get('a', font1);
const Glyph& g2 = factory.get('a', font1);
assert(&g1 == &g2);    // 보통 true, 하지만 의존 X
```

→ Factory가 *항상 같은 객체* 보장하는지는 구현 detail. 동일성 가정 코드는 *fragile*.

### 5. *thread safety 없이* 공유

Factory의 풀에 동시 접근 → race. 최소 *mutex*, 가능하면 *lock-free*.

```cpp
class GlyphFactory {
    mutable std::shared_mutex mu;
    std::unordered_map<Key, std::unique_ptr<Glyph>> pool;
public:
    const Glyph& get(char c, Font f) {
        Key key{c, f};
        {
            std::shared_lock<std::shared_mutex> r(mu);
            auto it = pool.find(key);
            if (it != pool.end()) return *it->second;
        }
        std::unique_lock<std::shared_mutex> w(mu);
        // double-check + insert
        auto it = pool.find(key);
        if (it == pool.end()) {
            auto [iter, _] = pool.emplace(key, std::make_unique<Glyph>(c, f));
            return *iter->second;
        }
        return *it->second;
    }
};
```

## Modern C++에서의 Flyweight

### 1. `std::string` 자체

- *SSO* (Small String Optimization): 짧은 문자열은 *stack에 직접*
- *COW* (legacy GCC libstdc++): 같은 내용 공유 (C++11 이후 표준 부적합)
- 일부 구현이 *interning* 지원 (Java `intern`처럼)

### 2. `std::string_view`

- 자체는 flyweight 아니지만 *공유 의도*. 원본 문자열을 *비소유 view*로 다수가 참조.

### 3. Enum class as flyweight

```cpp
enum class Direction { North, South, East, West };
// 4개 인스턴스. 메서드 분기 시 같은 enum 값 사용 — 자연스러운 flyweight.
```

### 4. Boost.Flyweight

Boost 라이브러리. 직접 구현 대신 사용 가능.

```cpp
#include <boost/flyweight.hpp>
boost::flyweight<std::string> a = "hello";
boost::flyweight<std::string> b = "hello";
assert(&a.get() == &b.get());     // 자동 interning
```

## 성능 고려

### 메모리 vs CPU 트레이드오프

| | 메모리 | CPU |
| --- | --- | --- |
| Naive (멤버 전부 보유) | ↑ | ↓ (직접 접근) |
| Flyweight | ↓ | ↑ (factory lookup, indirection) |

→ Hot path의 *factory lookup*이 병목이 될 수 있음. *thread-local cache*, *inline cache*로 완화.

### Cache 친화성

같은 Flyweight 객체를 반복 접근 → CPU L1 cache hit 증가. *현실에서 큰 효과*. 단 *extrinsic이 cache miss*가 되면 상쇄.

## 트레이드오프 — 한눈에

| 차원 | Flyweight |
| --- | --- |
| 메모리 사용량 ↓ | ✅ 매우 큼 (객체 수 × intrinsic 크기) |
| CPU 캐시 친화 | ✅ 같은 객체 반복 접근 |
| extrinsic 관리 | ⚠️ 매 호출마다 전달 |
| 공유 객체 mutation | ❌ 위험 — 보통 immutable |
| Factory 동기화 (멀티스레드) | ⚠️ 락 필요 |
| Factory lookup 비용 | ⚠️ hot path에선 측정 |
| 코드 복잡도 | ⚠️ extrinsic 추적 부담 |

## 실제 사례

### 표준 라이브러리

- **`std::string` 일부 구현** — SSO + 일부 환경의 interning
- **`std::string_view`** — 비소유 공유 view
- **`std::shared_ptr` control block** — 참조 카운터 공유

### Java / 다른 언어

- **Java `String.intern()`** — 명시적 string interning
- **Java `Integer` 캐시** — -128~127은 미리 생성된 객체 공유
- **Java `Boolean.TRUE/FALSE`** — 단 2개 인스턴스

### 게임 / 그래픽

- **게임 엔진 — Texture/Mesh 공유** — 같은 텍스처를 여러 객체가 참조
- **타일 기반 맵** — 같은 풀, 같은 바닥 텍스처
- **파티클 시스템** — 같은 파티클 visual + 위치/속도만 다름
- **3D 모델 instancing** — GPU instanced rendering

### 도메인

- **DB connection pool** — 비싼 connection 공유
- **Compiled regex 캐시** — 같은 패턴 컴파일 1회
- **Configuration 객체** — 읽기 위주, 다수 접근

## 관련 패턴

- **[Composite (item 8)](/blog/programming/design/gof-design-patterns/item08-composite)** — Composite의 leaf가 많을 때 Flyweight으로 공유
- **[State (item 20)](/blog/programming/design/gof-design-patterns/item20-state)** — 무상태 state 객체는 Flyweight으로 공유
- **[Strategy (item 21)](/blog/programming/design/gof-design-patterns/item21-strategy)** — 무상태 strategy 객체도 같은 이유로 공유
- **[Singleton (item 5)](/blog/programming/design/gof-design-patterns/item05-singleton)** — FlyweightFactory는 보통 Singleton
- **[Interpreter (item 15)](/blog/programming/design/gof-design-patterns/item15-interpreter)** — terminal symbol은 Flyweight 후보
- **[item 24 — 전체 관계도](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview)** — Flyweight는 *공유의 허브*. Composite/State/Strategy/Interpreter와 결합
