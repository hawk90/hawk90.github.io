---
title: "Ch 9: Memory Management"
date: 2026-05-19T09:00:00
description: "메모리 관리 — 가비지 컬렉션, 참조 카운팅, 수동 관리의 위험."
series: "Object-Oriented Software Construction"
seriesOrder: 9
tags: [oop, meyer, memory, garbage-collection, references]
draft: false
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> 수동 메모리 관리는 위험하다. **가비지 컬렉션**은 객체지향의 필수 요소이며, 개발자를 메모리 오류에서 해방한다.

## 메모리 관리의 문제

객체는 생성되고 사용되다가 버려진다. 버려진 객체의 메모리는 누가 회수하는가?

```eiffel
local
    p: POINT
do
    create p       -- 메모리 할당
    p.set (3, 4)
    p := Void      -- p는 더 이상 객체를 가리키지 않음
    -- 객체는 여전히 메모리에 존재
    -- 누가 회수하는가?
end
```

## 세 가지 접근법

### 1. 수동 메모리 관리

C/C++ 스타일:

```cpp
// C++
Point* p = new Point(3, 4);
// ... 사용 ...
delete p;  // 프로그래머가 직접 해제
p = nullptr;
```

**문제점**:

| 문제 | 설명 | 결과 |
|------|------|------|
| **Memory Leak** | `delete` 호출 잊음 | 메모리 고갈 |
| **Dangling Pointer** | 해제 후 접근 | 정의되지 않은 동작 |
| **Double Free** | 같은 메모리 두 번 해제 | 크래시 |
| **Use After Free** | 해제된 메모리 사용 | 보안 취약점 |

```cpp
// Dangling Pointer 예
Point* p1 = new Point(3, 4);
Point* p2 = p1;      // p1, p2 모두 같은 객체 가리킴
delete p1;           // 메모리 해제
p2->x;               // Dangling pointer! 정의되지 않은 동작
```

```cpp
// Double Free 예
Point* p = new Point(3, 4);
delete p;
delete p;  // Double free! 크래시
```

### 2. 참조 카운팅

각 객체가 자신을 가리키는 참조의 수를 추적한다.

| 연산 | 결과 |
|------|------|
| `create p1` | POINT: refcount=1 (p1이 참조) |
| `p2 := p1` | POINT: refcount=2 (p1, p2가 참조) |
| `p1 := Void` | POINT: refcount=1 (p2만 참조) |
| `p2 := Void` | POINT: refcount=0 → 자동 해제 |

**장점**: 참조가 0이 되면 즉시 회수하고, 타이밍이 예측 가능하다.

**문제점 — 순환 참조**:

```eiffel
class NODE
feature
    data: INTEGER
    next: NODE
end

local
    a, b: NODE
do
    create a
    create b
    a.set_next (b)
    b.set_next (a)  -- 순환 참조!
    a := Void
    b := Void
    -- a와 b 객체는 여전히 서로를 참조
    -- refcount가 0이 되지 않음
    -- 메모리 누수!
end
```

![순환 참조 문제](/images/blog/oosc/diagrams/ch09-circular-ref.svg)

### 3. 가비지 컬렉션

런타임 시스템이 자동으로 도달 불가능한 객체를 찾아 회수한다.

![GC 도달 가능성](/images/blog/oosc/diagrams/ch09-gc-reachability.svg)

Root Set(전역, 지역, 스택)에서 출발해 참조를 따라가면 도달 가능한 객체를 찾을 수 있다. 나머지는 회수 대상이다. Meyer는 **가비지 컬렉션이 객체지향의 필수 요소**라고 강조한다.

## 가비지 컬렉션 알고리즘

### Mark-and-Sweep

| 단계 | 동작 |
|------|------|
| **Mark** | Root set에서 시작해 도달 가능한 모든 객체에 표시. 재귀적으로 참조를 따라간다. |
| **Sweep** | 힙 전체를 스캔해 표시 없는 객체를 회수하고 표시를 초기화한다. |

Mark 단계에서 ROOT → A → C 경로는 표시되고, B, D, E는 도달 불가능하므로 Sweep 단계에서 회수된다.

### Copying Collection

메모리를 두 영역(From-space, To-space)으로 분할한다.

![Copying Collection](/images/blog/oosc/diagrams/ch09-copying-gc.svg)

| 장점 | 단점 |
|------|------|
| 단편화 없음 | 메모리 절반만 사용 가능 |
| 할당이 빠름 (bump pointer) | 복사 비용 |

### Generational Collection

**세대 가설(Generational Hypothesis)**: "대부분의 객체는 젊게 죽는다."

이 가설에 기반해 객체의 "나이"에 따라 다르게 처리한다.

![Generational Collection](/images/blog/oosc/diagrams/ch09-generational.svg)

| 세대 | 특성 |
|------|------|
| **Young Generation** | 새로 생성된 객체. 작은 영역, 빈번한 수거. 대부분 여기서 죽는다. |
| **Old Generation** | 오래 살아남은 객체. 큰 영역, 드문 수거. |

대부분의 객체가 Young Gen에서 죽으므로, Young Gen을 자주 수거하면 효율적이다.

## 가비지 컬렉션의 비용

### 시간 비용

| 방식 | 설명 |
|------|------|
| **Stop-the-World** | GC 동안 애플리케이션 일시정지. 단순하지만 지연 발생. |
| **Concurrent GC** | 애플리케이션과 GC가 동시 실행. 지연 감소, 구현 복잡. |

### 공간 비용

GC는 객체 헤더(mark bit, forwarding pointer), 추가 힙 공간(Copying GC는 2배), GC 자체의 데이터 구조 등 오버헤드를 수반한다.

### 예측 불가능성

실시간 시스템에서 GC 일시정지가 데드라인을 위반할 수 있다. 응답이 10ms씩 걸리다가 GC로 100ms 지연되면 문제다.

**해결책**: 증분 GC, 실시간 GC

## 왜 GC가 OO에 필수인가

Meyer의 주장을 세 가지로 정리한다.

### 1. 복잡한 참조 구조

OO 시스템은 복잡한 객체 그래프를 형성한다. Controller가 Model과 View를 참조하고, 둘 다 Observer를 참조하고, Observer가 여러 Event를 참조하는 식이다. 누가 어떤 객체를 "소유"하는지 명확하지 않으므로 수동 관리는 거의 불가능하다.

### 2. 다형성과 소유권

```eiffel
process_shape (s: SHAPE)
    -- s는 CIRCLE? RECTANGLE? TRIANGLE?
    -- s의 메모리를 누가 관리?
    do
        s.draw
        -- s를 삭제해야 하나?
        -- 호출자가 아직 사용 중일 수도
    end
```

다형성 때문에 객체의 실제 타입과 수명을 컴파일 타임에 알 수 없다.

### 3. 재사용과 캡슐화

```eiffel
class STACK [G]
feature
    put (x: G)
        do
            -- x의 메모리 관리는?
            -- STACK이 책임지나?
            -- 호출자가 책임지나?
        end

    remove
        do
            -- 제거된 요소의 메모리는?
        end
end
```

캡슐화된 컴포넌트는 내부 객체의 수명을 외부에 노출하지 않아야 한다.

## Eiffel의 메모리 모델

### 자동 가비지 컬렉션

Eiffel은 기본적으로 GC를 사용한다:

```eiffel
local
    p: POINT
    list: LIST [POINT]
do
    create list.make
    from i := 1 until i > 1000 loop
        create p
        p.set (i, i)
        list.extend (p)
        i := i + 1
    end
    list := Void
    -- 1000개 POINT 객체 자동 회수
end
```

### dispose와 외부 자원

GC로 관리되지 않는 외부 자원은 명시적 정리 필요:

```eiffel
class FILE
inherit
    DISPOSABLE

feature
    open (name: STRING)
        do
            handle := external_open (name)
        end

    close
        do
            external_close (handle)
            handle := 0
        end

    dispose
        -- GC가 호출 (finalizer)
        do
            if handle /= 0 then
                close
            end
        end

feature {NONE}
    handle: INTEGER
end
```

**주의**: `dispose`에 의존하지 말고 명시적으로 `close` 호출 권장.

## 메모리 관리 전략 비교

| 측면 | 수동 | 참조 카운팅 | GC |
|------|------|-------------|-----|
| **안전성** | 낮음 | 중간 | 높음 |
| **순환 참조** | 해당 없음 | 누수 | 처리됨 |
| **예측성** | 높음 | 높음 | 낮음 |
| **오버헤드** | 없음 | 카운트 갱신 | GC 일시정지 |
| **개발 비용** | 높음 | 중간 | 낮음 |
| **버그 위험** | 높음 | 중간 | 낮음 |

## 실용적 고려사항

### GC 튜닝

| 파라미터 | 효과 |
|----------|------|
| **힙 크기** | 크면 GC 빈도 감소, 메모리 사용 증가 |
| **세대 크기** | Young Gen 크기 조절로 수거 빈도 제어 |
| **GC 알고리즘** | Throughput vs Latency 트레이드오프 |
| **병렬화** | GC 스레드 수 조절 |

### GC와 성능

| GC 친화적 | GC 비친화적 |
|-----------|-------------|
| 객체 재사용 (풀링) | 과도한 임시 객체 생성 |
| 불필요한 할당 회피 | 거대한 객체 그래프 |
| 큰 객체는 별도 관리 | 오래 사는 객체에서 젊은 객체 참조 |
| 약한 참조 활용 (캐시) | |

### 약한 참조(Weak Reference)

GC가 회수해도 되는 참조다.

| 참조 유형 | 동작 |
|-----------|------|
| **강한 참조** | Cache가 Object를 참조하면 회수 불가 |
| **약한 참조** | Object가 다른 곳에서 참조되지 않으면 회수 가능. 캐시 조회 시 Void일 수 있음 |

## 자주 하는 실수

메모리 관리에서 흔히 빠지는 함정이다.

| 실수 | 증상 | 해결 |
|------|------|------|
| **수동 관리 고집** | C++ 스타일 `delete` → Dangling pointer, Double free | GC 언어 사용. 불가피하면 RAII/스마트 포인터 |
| **참조 카운팅으로 충분하다 생각** | 순환 참조 구조에서 메모리 누수 | 순환 가능성 있으면 GC 필요. 또는 약한 참조로 사이클 끊기 |
| **GC에 의존해 외부 자원 방치** | 파일 핸들, DB 연결이 GC 때까지 열림 | 외부 자원은 명시적 `close`. `dispose`/finalizer는 안전망일 뿐 |
| **임시 객체 과다 생성** | 루프 안에서 매번 `create` → GC 부담 | 객체 풀링, 재사용. 불필요한 할당 회피 |
| **GC 튜닝 무시** | 기본 설정 그대로 → 애플리케이션 특성과 불일치 | 힙 크기, 세대 크기, GC 알고리즘 조정 |
| **실시간 시스템에서 Stop-the-World GC** | 데드라인 위반 | Concurrent/Incremental GC 또는 실시간 GC 사용 |
| **캐시에 강한 참조** | 캐시가 모든 객체를 붙잡음 → 메모리 부족 | 약한 참조(Weak Reference)로 캐시 구현 |

## 정리

- **수동 관리의 위험**: Memory leak, Dangling pointer, Double free
- **참조 카운팅의 한계**: 순환 참조 처리 불가
- **GC의 원리**: 도달 불가능한 객체 자동 회수
- **GC 알고리즘**: Mark-and-Sweep, Copying, Generational
- **GC가 OO에 필수인 이유**: 복잡한 참조, 다형성, 캡슐화
- **트레이드오프**: 안전성 vs 예측성, 개발 비용 vs 런타임 비용

## 다음 장 예고

Chapter 10에서는 **제네릭(Genericity)**을 다룬다. 타입을 매개변수로 받는 클래스, 재사용성의 핵심 메커니즘.

## 관련 항목

- [Ch 2: Criteria of Object Orientation](/blog/programming/design/oosc/chapter02-criteria-of-object-orientation) — GC as OO criterion
- [Ch 8: The Run-Time Structure: Objects](/blog/programming/design/oosc/chapter08-the-run-time-structure-objects) — 객체 생명주기
- [Ch 10: Genericity](/blog/programming/design/oosc/chapter10-genericity) — 제네릭
