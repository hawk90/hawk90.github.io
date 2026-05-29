---
title: "Ch 17: Typing"
date: 2026-05-19T17:00:00
description: "타이핑 — 정적 vs 동적, 공변성, 반공변성, 앵커 타입."
series: "Object-Oriented Software Construction"
seriesOrder: 17
tags: [oop, meyer, typing, covariance, contravariance, anchored-types]
draft: true
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> **정적 타이핑**은 컴파일 타임에 타입 오류를 잡는다. **공변성**은 유연성을, **앵커 타입**은 안전한 공변성을 제공한다.

## 타이핑이란

타입 시스템은 **연산의 적용 가능성**을 보장한다. `x.f(a)` 호출 시 타입 시스템이 검사하는 항목은 다음과 같다.

| 검사 항목 | 질문 |
|----------|------|
| 피처 존재 | x의 타입이 피처 f를 가지는가? |
| 인자 호환 | a의 타입이 f의 인자 타입과 호환되는가? |

### 정적 vs 동적 타이핑

| 구분 | 정적 타이핑 | 동적 타이핑 |
|------|-----------|-----------|
| **검사 시점** | 컴파일 타임 | 런타임 |
| **오류 발견** | 일찍 | 늦게 |
| **유연성** | 제한적 | 높음 |
| **대표 언어** | Eiffel, Java, C++ | Smalltalk, Python, Ruby |

Meyer는 **정적 타이핑**을 강력히 지지한다.

| 이점 | 설명 |
|------|------|
| **신뢰성** | 타입 오류가 컴파일에서 잡힘 |
| **가독성** | 타입이 문서 역할 |
| **효율성** | 런타임 검사 불필요 |
| **도구 지원** | IDE 자동완성, 리팩토링 |

## 타이핑 규칙

### 기본 규칙

```eiffel
local
    acc: ACCOUNT
    sav: SAVINGS_ACCOUNT
do
    acc := sav  -- OK: SAVINGS_ACCOUNT는 ACCOUNT의 하위 타입
    sav := acc  -- 오류: ACCOUNT는 SAVINGS_ACCOUNT가 아님
end
```

### 타입 호환성

S가 T의 하위 타입이면:

| 규칙 | 예 |
|------|-----|
| S 타입 값을 T 타입 변수에 할당 가능 | `acc := sav` |
| T가 필요한 곳에 S 사용 가능 | `process(sav)` — `process(acc: ACCOUNT)` |

`SAVINGS_ACCOUNT ≤ ACCOUNT`이므로 `ACCOUNT` 변수에 `SAVINGS_ACCOUNT`를 할당할 수 있다.

### 호출 규칙

```eiffel
process (acc: ACCOUNT)
    do
        acc.deposit (100)  -- ACCOUNT가 deposit을 가지면 OK
        acc.add_interest   -- 오류! ACCOUNT는 add_interest가 없음
    end
```

`acc`가 실제로 `SAVINGS_ACCOUNT`를 가리키더라도, 선언된 타입이 `ACCOUNT`이므로 `ACCOUNT`의 피처만 호출 가능하다.

## 공변성과 반공변성

### 공변성(Covariance)

**자식 클래스에서 타입이 더 특수화**되는 것:

```eiffel
class ANIMAL
feature
    food: FOOD

    eat (f: FOOD)
        do
            -- 음식 먹기
        end
end

class COW
inherit
    ANIMAL
        redefine
            food, eat
        end

feature
    food: GRASS  -- 공변적: FOOD → GRASS

    eat (f: GRASS)  -- 공변적 인자 (문제!)
        do
            -- 풀 먹기
        end
end
```

### 공변성의 문제 (CAT Call)

```eiffel
local
    animal: ANIMAL
    cow: COW
    meat: MEAT
do
    create cow
    animal := cow  -- 다형적 할당

    create meat
    animal.eat (meat)  -- 컴파일 통과! 런타임 오류!
    -- COW.eat은 GRASS를 기대하는데 MEAT가 전달됨
end
```

**CAT**(Changing Availability or Type) 문제:

| 단계 | 상황 |
|------|------|
| 1 | `COW.eat`의 인자 타입이 `GRASS`로 좁아짐 |
| 2 | 부모 타입(`ANIMAL`)으로 호출 시 `FOOD` 전달 가능 |
| 3 | 타입 안전성 깨짐 → CAT call 문제 |

### 반공변성(Contravariance)

**자식에서 타입이 더 일반화**되는 것:

| 위치 | 인자 타입 |
|------|----------|
| 부모 | `eat(f: GRASS)` |
| 자식 | `eat(f: FOOD)` — 반공변적 |

부모 타입으로 호출 시 `animal.eat(grass)`를 하면 `COW.eat`은 `FOOD`를 받으므로 `GRASS`도 받아들인다. 타입 안전하다. 다만 **직관에 반한다**. 소가 모든 음식을 먹는다?

### 불변성(Invariance)

타입을 바꾸지 않는 방식이다.

| 위치 | 인자 타입 | 특징 |
|------|----------|------|
| 부모 | `eat(f: FOOD)` | — |
| 자식 | `eat(f: FOOD)` | 동일 |

가장 안전하지만 유연성이 없다.

## Meyer의 해결책: 앵커 타입

### like Current

```eiffel
class LINKABLE [G]
feature
    item: G
    right: like Current  -- 자기 타입에 앵커

    put_right (other: like Current)
        do
            right := other
        end
end

class BI_LINKABLE [G]
inherit
    LINKABLE [G]

feature
    left: like Current  -- 자동으로 BI_LINKABLE [G]
end
```

`like Current`의 의미:

| 클래스 | `like Current` 해석 |
|--------|-------------------|
| `LINKABLE` | `LINKABLE [G]` |
| `BI_LINKABLE` | `BI_LINKABLE [G]` |

자동으로 공변적이면서 타입 안전하다.

### like 속성

```eiffel
class COMPARABLE
feature
    other_item: like Current

    is_less (other: like Current): BOOLEAN
        deferred
        end

    is_greater (other: like Current): BOOLEAN
        do
            Result := other.is_less (Current)
        end
end

class INTEGER_COMPARABLE
inherit
    COMPARABLE

feature
    value: INTEGER

    is_less (other: like Current): BOOLEAN
        -- other는 자동으로 INTEGER_COMPARABLE
        do
            Result := value < other.value
        end
end
```

### 앵커 타입의 이점

| 이점 | 설명 |
|------|------|
| **타입 안전** | 컴파일러가 검사 가능 |
| **자동 공변** | 상속 시 자동으로 특수화 |
| **코드 재사용** | 부모에서 한 번 정의, 자식에서 재사용 |
| **바이너리 메서드** | `is_equal`, `is_less` 등에 적합 |

## 타입 검사와 다형성

### 정적 타입 vs 동적 타입

```eiffel
local
    shape: SHAPE        -- 정적 타입: SHAPE
    rect: RECTANGLE
do
    create rect
    shape := rect       -- shape의 동적 타입: RECTANGLE

    shape.draw          -- 정적 타입으로 호출 가능 확인
                        -- 동적 타입으로 실제 버전 결정
end
```

| 구분 | 정적 타입 | 동적 타입 |
|------|----------|----------|
| **정의** | 선언된 타입 | 런타임의 실제 타입 |
| **예** | `shape: SHAPE` | `shape → RECTANGLE 객체` |
| **용도** | 타입 검사 기준 | 메서드 선택 기준 |

### 타입 좁히기 (Assignment Attempt)

```eiffel
local
    shape: SHAPE
    rect: RECTANGLE
do
    -- shape는 어떤 SHAPE일 수 있음
    rect ?= shape  -- Assignment attempt

    if rect /= Void then
        -- shape가 실제로 RECTANGLE일 때만
        print (rect.width)
    end
end
```

`?=`(Assignment Attempt)의 동작:

| 동적 타입 | 결과 |
|----------|------|
| 호환됨 | 할당 성공 |
| 호환 안 됨 | `Void` |

다형적 객체를 특정 타입으로 좁힐 때 사용한다.

### attached 구문 (현대 Eiffel)

```eiffel
if attached {RECTANGLE} shape as rect then
    -- rect는 RECTANGLE로 확정
    print (rect.width)
    print (rect.height)
else
    -- shape는 RECTANGLE이 아님
end
```

## 제네릭과 타이핑

### 제네릭 타입 호환성

```eiffel
local
    list_shape: LIST [SHAPE]
    list_rect: LIST [RECTANGLE]
do
    list_shape := list_rect  -- 허용? 불허용?
end
```

### 공변적 제네릭의 문제

```eiffel
-- 만약 공변적이라면:
list_shape := list_rect  -- OK라고 가정

-- 문제 발생:
list_shape.extend (create {CIRCLE})  -- CIRCLE은 SHAPE
-- 하지만 list_rect에 CIRCLE이 들어감!
-- LIST [RECTANGLE]의 불변식 위반
```

### Eiffel의 해결

| 방식 | 설명 |
|------|------|
| **기본** | 불변적 — `LIST [RECTANGLE] ≠ LIST [SHAPE]` |
| **frozen 제네릭** | 공변성 허용(읽기 전용) — `class READABLE_LIST [frozen G]` |

## 타입 시스템의 완전성

### 타입 안전성 정리

Meyer가 추구하는 목표는 **정적 타입 안전성**(Static Type Safety)이다. 컴파일을 통과한 프로그램은 런타임에 타입 오류가 발생하지 않아야 한다.

| Eiffel의 접근 | 설명 |
|--------------|------|
| 정적 타이핑 기본 | 컴파일 타임 검사 |
| 앵커 타입 | 안전한 공변성 |
| 명시적 타입 좁히기 | `?=`, `attached` |
| 불변적 제네릭 | 기본값 |

### 현실과 타협

완벽한 정적 타입 안전성은 어렵다. CAT call 완전 방지는 표현력을 제한하므로 실용적 해결책이 필요하다.

| Eiffel의 타협 | 설명 |
|--------------|------|
| 대부분의 CAT call | 컴파일 에러 |
| 일부 | 런타임 검사 |
| 앵커 타입 | 안전한 공변성 제공 |

## 다른 언어와 비교

| 언어 | 타이핑 | 공변성 처리 |
|------|--------|------------|
| **Eiffel** | 정적, 앵커 타입 | like Current로 안전한 공변성 |
| **Java** | 정적, 제네릭 | 와일드카드 (? extends, ? super) |
| **C#** | 정적, 제네릭 | in/out 키워드로 분산 지정 |
| **Scala** | 정적, 고급 | +T (공변), -T (반공변) 선언 |
| **Smalltalk** | 동적 | 런타임 검사 |

### Java의 접근

```java
// Java: 와일드카드로 공변성
List<? extends Shape> shapes = rectangles;  // 읽기 전용
shapes.get(0);        // OK: Shape 반환
shapes.add(circle);   // 컴파일 오류: 쓰기 불가

List<? super Rectangle> rects = shapes;  // 쓰기 가능
rects.add(rectangle); // OK
rects.get(0);         // Object 반환 (읽기 제한)
```

### Scala의 접근

```scala
// Scala: 선언 시점 분산
class Producer[+T] { def get: T }     // 공변적
class Consumer[-T] { def put(t: T) }  // 반공변적
class Box[T] { var item: T }          // 불변적
```

## 자주 하는 실수

타이핑에서 흔히 빠지는 함정이다.

| 실수 | 증상 | 해결 |
|------|------|------|
| **공변적 인자 타입** | `COW.eat(GRASS)`가 `ANIMAL.eat(FOOD)` 재정의 → CAT call | 인자는 불변 또는 반공변. `like Current`로 안전한 공변성 |
| **선언 타입으로 동적 피처 호출** | `shape.width` 호출 → SHAPE에 width 없어 컴파일 오류 | 타입 좁히기 후 호출. `attached {RECTANGLE} shape as r` |
| **제네릭 공변성 가정** | `LIST [DOG]`를 `LIST [ANIMAL]`에 할당 → 타입 오류 | 제네릭은 기본 불변. 읽기 전용이면 공변성 고려 |
| **정적/동적 타입 혼동** | 선언 타입으로 실제 동작 예측 → 다형성 무시 | 정적 타입은 검사용, 동적 타입이 실행 결정 |
| **Assignment Attempt 오용** | `?=` 남발 → 타입 시스템 무력화 | 다형성 활용. 타입 좁히기는 최소한으로 |
| **앵커 타입 미사용** | `is_equal(other: COMPARABLE)` → 아무 COMPARABLE이나 비교 | `like Current`로 같은 타입끼리 비교 보장 |
| **반공변성 무시** | 인자 타입만 공변으로 → 타입 불안전 | 반환은 공변, 인자는 반공변이 안전. 원칙 이해 필요 |

## 정리

- **정적 타이핑**: 컴파일 타임 타입 검사, 신뢰성 향상
- **공변성**: 자식에서 타입 특수화, CAT call 위험
- **반공변성**: 자식에서 타입 일반화, 직관에 반함
- **앵커 타입**: `like Current`로 안전한 공변성
- **타입 좁히기**: `?=`, `attached`로 명시적 타입 변환
- **정적 vs 동적 타입**: 선언 타입 vs 런타임 실제 타입

## 다음 장 예고

Chapter 18에서는 **전역 객체와 상수**를 다룬다. once 함수의 심화, 공유 객체 패턴, 상수 정의 방법.

## 관련 항목

- [Ch 10: Genericity](/blog/programming/design/oosc/chapter10-genericity) — 제네릭
- [Ch 14: Introduction to Inheritance](/blog/programming/design/oosc/chapter14-introduction-to-inheritance) — 상속
- [Ch 16: Inheritance and Assertions](/blog/programming/design/oosc/chapter16-inheritance-and-assertions) — LSP
