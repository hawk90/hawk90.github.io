---
title: "Ch 8: The Run-Time Structure: Objects"
date: 2026-05-19T08:00:00
description: "객체 — 런타임의 주역, 생성, 참조, 동등성."
series: "Object-Oriented Software Construction"
seriesOrder: 8
tags: [oop, meyer, objects, references, identity]
draft: false
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> 객체는 클래스의 런타임 **인스턴스**다. 생성, 참조, 동등성 비교의 정확한 이해가 안정적인 OO 시스템의 기반이다.

## 클래스와 객체의 관계

Chapter 7에서 클래스는 **정적** 구조라고 했다. 객체는 클래스의 **동적** 실체다.

컴파일 타임에 클래스 POINT(x, y 속성)가 정의되고, 런타임에 여러 객체(p1, p2, p3)가 각각 다른 값을 가진다.

| 측면 | 클래스 | 객체 |
|------|--------|------|
| 존재 | 소스 코드에 | 메모리에 |
| 시점 | 컴파일 타임 | 런타임 |
| 개수 | 하나 | 무한히 생성 가능 |
| 변경 | 불변 (소스 수정 필요) | 상태 변경 가능 |

## 객체 생성

### 생성 명령

Eiffel에서 객체는 `create` 명령으로 생성한다:

```eiffel
local
    p: POINT
    acc: ACCOUNT
do
    create p           -- 기본 생성
    create acc.make (1000)  -- 생성 프로시저 호출
end
```

### 생성의 두 단계

| 단계 | 동작 |
|------|------|
| 1단계: 메모리 할당 | 모든 속성 공간 확보, 기본값 초기화 (정수 0, 실수 0.0, 불리언 False, 참조 Void) |
| 2단계: 생성 프로시저 | 사용자 정의 초기화, 사전/사후조건 검사, 불변식 검사 |

### 생성 프로시저

```eiffel
class ACCOUNT

create
    make, make_empty  -- 생성 프로시저 목록

feature {NONE}  -- 생성 프로시저는 보통 비공개
    make (initial: INTEGER)
        -- 초기 잔고로 계좌 생성
        require
            non_negative: initial >= 0
        do
            balance := initial
            creation_date := current_date
        ensure
            balance_set: balance = initial
        end

    make_empty
        -- 잔고 0으로 계좌 생성
        do
            make (0)
        end

feature
    balance: INTEGER
    creation_date: DATE

end
```

클라이언트 코드:

```eiffel
local
    acc1, acc2: ACCOUNT
do
    create acc1.make (1000)     -- 잔고 1000으로 생성
    create acc2.make_empty      -- 잔고 0으로 생성
end
```

## 참조(Reference)

### 참조 의미론

Eiffel에서 객체 변수는 **참조**를 담는다. 객체 자체가 아니다.

```eiffel
local
    p1, p2: POINT
do
    create p1
    p1.set (3.0, 4.0)

    p2 := p1  -- p2는 p1과 같은 객체를 가리킴

    p2.set (0.0, 0.0)  -- p1도 영향받음!
    -- p1.x = 0.0, p1.y = 0.0
end
```

p1과 p2가 같은 POINT 객체를 가리킨다. 한쪽을 수정하면 다른 쪽에도 영향을 준다.

### Void 참조

아무 객체도 가리키지 않는 상태:

```eiffel
local
    p: POINT  -- 선언만 하면 Void
do
    if p = Void then
        print ("p는 아무것도 가리키지 않음")
    end

    create p  -- 이제 객체를 가리킴
end
```

### Void 참조의 위험

```eiffel
local
    p: POINT
do
    -- p는 Void
    p.set (3.0, 4.0)  -- 런타임 오류!
    -- "Feature call on void target"
end
```

이것이 **십억 달러짜리 실수**(null pointer exception)의 원인이다.

### Void 안전성

Eiffel은 **attached type** 개념으로 Void 안전성을 강화한다:

```eiffel
local
    p: POINT           -- detachable (Void 가능)
    q: attached POINT  -- attached (Void 불가)
do
    create q           -- q는 항상 객체를 가리킴

    if attached p as safe_p then
        -- 이 블록 안에서 safe_p는 Void가 아님
        safe_p.set (1.0, 2.0)
    end
end
```

## 동등성과 동일성

객체 비교에는 두 가지가 있다:

### 참조 동등성 (=, /=)

```eiffel
local
    p1, p2, p3: POINT
do
    create p1
    p1.set (3.0, 4.0)

    p2 := p1           -- 같은 객체 참조

    create p3
    p3.set (3.0, 4.0)  -- 다른 객체, 같은 값

    if p1 = p2 then
        print ("참조 같음")  -- 출력됨
    end

    if p1 = p3 then
        print ("참조 같음")  -- 출력 안 됨
    end
end
```

![참조 동등성](/images/blog/oosc/diagrams/ch08-reference.svg)

### 객체 동등성 (~, /~)

```eiffel
local
    p1, p3: POINT
do
    create p1
    p1.set (3.0, 4.0)

    create p3
    p3.set (3.0, 4.0)

    if p1 ~ p3 then
        print ("값이 같음")  -- 출력됨
    end
end
```

`~` 연산자는 `is_equal` 함수를 호출한다:

```eiffel
class POINT
feature
    is_equal (other: POINT): BOOLEAN
        -- 좌표가 같으면 동등
        do
            Result := (x = other.x) and (y = other.y)
        end
end
```

### 비교 요약

| 연산자 | 의미 | 질문 |
|--------|------|------|
| `=` | 참조 동등성 | 같은 객체인가? |
| `~` | 객체 동등성 | 값이 같은가? |
| `/=` | 참조 비동등성 | 다른 객체인가? |
| `/~` | 객체 비동등성 | 값이 다른가? |

## 복사

### 참조 복사 vs 객체 복사

```eiffel
local
    p1, p2, p3: POINT
do
    create p1
    p1.set (3.0, 4.0)

    p2 := p1              -- 참조 복사 (같은 객체 공유)
    p3 := p1.twin         -- 객체 복사 (새 객체 생성)

    p1.set (0.0, 0.0)

    -- p2.x = 0.0  (p1과 같은 객체)
    -- p3.x = 3.0  (독립된 복사본)
end
```

| 복사 유형 | 결과 |
|----------|------|
| 참조 복사 (`p2 := p1`) | p1, p2가 같은 객체 공유 |
| 객체 복사 (`p3 := p1.twin`) | p3는 독립된 복사본 |

### 얕은 복사 vs 깊은 복사

```eiffel
class PERSON
feature
    name: STRING
    address: ADDRESS
end
```

| 복사 방식 | ADDRESS |
|----------|---------|
| 얕은 복사 (twin) | 원본과 복사본이 같은 ADDRESS 공유 |
| 깊은 복사 (deep_twin) | ADDRESS도 복사하여 독립 |

```eiffel
local
    person1, person2, person3: PERSON
do
    create person1.make ("Kim", create_address)

    person2 := person1.twin       -- 얕은 복사
    person3 := person1.deep_twin  -- 깊은 복사

    person1.address.change_city ("Seoul")

    -- person2.address.city = "Seoul"  (공유)
    -- person3.address.city = 원래 값  (독립)
end
```

## 객체 구조

### 단순 객체

기본 타입의 인스턴스:

```eiffel
local
    i: INTEGER  -- 단순 객체
    b: BOOLEAN  -- 단순 객체
do
    i := 42
    b := True
end
```

단순 객체는 **값 의미론**을 따른다. 참조가 아니라 값 자체가 복사된다.

### 복합 객체

다른 객체를 참조하는 객체:

```eiffel
class BOOK
feature
    title: STRING
    author: PERSON
    chapters: LIST [CHAPTER]
end
```

BOOK 객체는 title(STRING), author(PERSON), chapters(LIST of CHAPTER)를 참조한다. 복합 객체는 다른 객체들의 그래프를 형성한다.

## 객체의 생명주기

| 단계 | 동작 | 예시 |
|------|------|------|
| 1. 생성 | 메모리 할당 + 초기화 | `create obj.make(...)` |
| 2. 사용 | 피처 호출 | `obj.feature1`, `obj.set_value(...)` |
| 3. 공유 | 다른 변수/컬렉션에 전달 | `other := obj` |
| 4. 참조 해제 | 참조 제거 | `obj := Void` |
| 5. 수거 | GC가 회수 | 더 이상 참조 없으면 |

## Current 객체

모든 루틴은 **현재 객체**에 대해 실행된다:

```eiffel
class POINT
feature
    x, y: REAL

    distance (other: POINT): REAL
        -- 현재 점(Current)과 other 사이 거리
        do
            Result := sqrt (
                (Current.x - other.x)^2 +
                (Current.y - other.y)^2
            )
            -- Current는 생략 가능
            -- Result := sqrt ((x - other.x)^2 + (y - other.y)^2)
        end

    set_from (other: POINT)
        -- 현재 점을 other로 설정
        do
            Current.x := other.x
            Current.y := other.y
            -- 또는 단순히
            -- x := other.x
            -- y := other.y
        end
end
```

`Current`는 현재 루틴이 실행되는 객체를 가리킨다:

```eiffel
local
    p1, p2: POINT
do
    create p1
    p1.set (3.0, 4.0)

    create p2
    p2.set (0.0, 0.0)

    print (p1.distance (p2))
    -- distance 실행 중 Current는 p1
    -- other는 p2
end
```

## 확장 타입(Expanded Types)

일부 타입은 **값 의미론**을 사용한다:

```eiffel
expanded class COMPLEX
feature
    real_part, imag_part: REAL

    plus (other: COMPLEX): COMPLEX
        do
            create Result
            Result.set (real_part + other.real_part,
                       imag_part + other.imag_part)
        end
end
```

```eiffel
local
    c1, c2: COMPLEX  -- 값 타입
do
    c1.set (1.0, 2.0)
    c2 := c1  -- 값 복사 (참조 공유 아님)
    c2.set (3.0, 4.0)
    -- c1은 변경 안 됨
end
```

기본 타입들이 확장 타입이다:

| 타입 분류 | 예시 |
|----------|------|
| 확장 타입 | INTEGER, REAL, DOUBLE, BOOLEAN, CHARACTER, 사용자 정의 expanded class |
| 참조 타입 | STRING, ARRAY, LIST, 대부분의 사용자 정의 클래스 |

## 정리

- **객체 = 클래스의 런타임 인스턴스**: 메모리에 존재
- **참조 의미론**: 변수는 객체를 가리키는 참조를 담음
- **Void 참조**: 아무것도 가리키지 않음 (위험!)
- **참조 동등성 (=)**: 같은 객체인가
- **객체 동등성 (~)**: 값이 같은가
- **복사**: 얕은 복사(twin) vs 깊은 복사(deep_twin)
- **Current**: 현재 루틴을 실행 중인 객체
- **확장 타입**: 값 의미론을 따르는 타입

## 다음 장 예고

Chapter 9에서는 **메모리 관리**를 다룬다. 객체가 더 이상 필요 없을 때 어떻게 메모리를 회수하는가. 가비지 컬렉션의 원리.

## 관련 항목

- [Ch 7: The Static Structure: Classes](/blog/programming/design/oosc/chapter07-the-static-structure-classes) — 클래스
- [Ch 9: Memory Management](/blog/programming/design/oosc/chapter09-memory-management) — 메모리 관리
- [Ch 11: Design by Contract](/blog/programming/design/oosc/chapter11-design-by-contract) — 생성과 불변식
