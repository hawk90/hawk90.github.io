---
title: "Ch 14: Introduction to Inheritance"
date: 2026-05-19T14:00:00
description: "상속 입문 — 확장, 재정의, 다형성, 동적 바인딩."
series: "Object-Oriented Software Construction"
seriesOrder: 14
tags: [oop, meyer, inheritance, polymorphism, dynamic-binding]
draft: false
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> **상속**은 기존 클래스를 기반으로 새 클래스를 정의한다. **다형성**과 **동적 바인딩**으로 확장 가능하고 유연한 시스템을 구축한다.

## 상속이란

기존 클래스(부모)의 피처를 물려받아 새 클래스(자식)를 정의:

```eiffel
class ACCOUNT
feature
    balance: INTEGER
    owner: STRING

    deposit (amount: INTEGER)
        do
            balance := balance + amount
        end

    withdraw (amount: INTEGER)
        require
            sufficient: amount <= balance
        do
            balance := balance - amount
        end
end

class SAVINGS_ACCOUNT
inherit
    ACCOUNT

feature
    interest_rate: REAL

    add_interest
        do
            deposit ((balance * interest_rate).truncated_to_integer)
        end
end
```

`SAVINGS_ACCOUNT`는 `ACCOUNT`의 모든 피처를 상속받는다.

## 상속의 두 가지 역할

### 1. 확장(Extension)

새 피처를 추가:

```eiffel
class CHECKING_ACCOUNT
inherit
    ACCOUNT

feature
    overdraft_limit: INTEGER
        -- ACCOUNT에 없는 새 피처

    check_number: INTEGER
        -- 새 피처

    write_check (amount: INTEGER; payee: STRING)
        -- 새 루틴
        do
            ...
        end
end
```

### 2. 특수화(Specialization)

기존 피처를 재정의:

```eiffel
class PREMIUM_ACCOUNT
inherit
    ACCOUNT
        redefine
            withdraw
        end

feature
    withdraw (amount: INTEGER)
        -- 재정의: 마이너스 잔고 허용
        require else
            within_credit: balance - amount >= -credit_limit
        do
            balance := balance - amount
        end

    credit_limit: INTEGER
end
```

## 재정의(Redefinition)

부모의 피처를 자식이 다시 구현:

```eiffel
class SHAPE
feature
    area: REAL
        -- 면적 (기본 구현)
        do
            Result := 0.0
        end

    draw
        -- 그리기
        do
            -- 기본: 아무것도 안 함
        end
end

class RECTANGLE
inherit
    SHAPE
        redefine
            area, draw
        end

feature
    width, height: REAL

    area: REAL
        -- 재정의: 직사각형 면적
        do
            Result := width * height
        end

    draw
        -- 재정의: 직사각형 그리기
        do
            draw_rectangle (0, 0, width, height)
        end
end

class CIRCLE
inherit
    SHAPE
        redefine
            area, draw
        end

feature
    radius: REAL

    area: REAL
        -- 재정의: 원 면적
        do
            Result := 3.14159 * radius * radius
        end

    draw
        -- 재정의: 원 그리기
        do
            draw_circle (0, 0, radius)
        end
end
```

## 다형성(Polymorphism)

자식 타입 객체를 부모 타입 변수에 할당:

```eiffel
local
    shape: SHAPE
    rect: RECTANGLE
    circle: CIRCLE
do
    create rect.make (10.0, 5.0)
    create circle.make (3.0)

    shape := rect    -- RECTANGLE을 SHAPE로
    print (shape.area)  -- 50.0

    shape := circle  -- CIRCLE을 SHAPE로
    print (shape.area)  -- 28.27...
end
```

`shape` 변수는 `SHAPE` 타입이지만, 실제로는 `RECTANGLE`이나 `CIRCLE`을 가리킬 수 있다.

## 동적 바인딩(Dynamic Binding)

호출할 피처가 **런타임**에 결정된다.

```eiffel
process_shapes (shapes: LIST [SHAPE])
    do
        across shapes as s loop
            s.item.draw  -- 어떤 draw?
            print (s.item.area)  -- 어떤 area?
        end
    end
```

`shapes = [RECTANGLE, CIRCLE, RECTANGLE]`일 때:

| 반복 | draw 호출 | area 결과 |
|------|-----------|-----------|
| 1 | RECTANGLE.draw | 50.0 |
| 2 | CIRCLE.draw | 28.27 |
| 3 | RECTANGLE.draw | 50.0 |

**정적 바인딩**(컴파일 타임)이 아닌 **동적 바인딩**(런타임)이 핵심이다.

## Precursor

재정의 시 부모 버전 호출:

```eiffel
class LOGGED_ACCOUNT
inherit
    ACCOUNT
        redefine
            deposit, withdraw
        end

feature
    deposit (amount: INTEGER)
        do
            log ("Depositing: " + amount.out)
            Precursor (amount)  -- ACCOUNT.deposit 호출
            log ("New balance: " + balance.out)
        end

    withdraw (amount: INTEGER)
        do
            log ("Withdrawing: " + amount.out)
            Precursor (amount)  -- ACCOUNT.withdraw 호출
            log ("New balance: " + balance.out)
        end
end
```

`Precursor`는 부모의 원래 구현을 호출한다.

## 상속 계층

![상속 계층](/images/blog/oosc/diagrams/ch14-inheritance-hierarchy.svg)

### 하위 타입 관계

SQUARE is-a RECTANGLE, RECTANGLE is-a SHAPE이므로 SQUARE is-a SHAPE다. 따라서 `shape: SHAPE` 변수에 `create {SQUARE}.make(5.0)`로 생성한 객체를 할당할 수 있다.

## 추상 클래스와 지연 피처

구현이 없는 **추상** 피처:

```eiffel
deferred class SHAPE
    -- 추상 클래스: 인스턴스화 불가

feature
    area: REAL
        -- 추상 피처: 하위 클래스가 구현
        deferred
        end

    draw
        -- 추상 피처
        deferred
        end

    perimeter: REAL
        -- 추상 피처
        deferred
        end
end
```

```eiffel
class RECTANGLE
inherit
    SHAPE

feature
    width, height: REAL

    area: REAL
        -- 구현 제공
        do
            Result := width * height
        end

    draw
        do
            ...
        end

    perimeter: REAL
        do
            Result := 2 * (width + height)
        end
end
```

`deferred class`는 **추상 클래스**. 직접 인스턴스화 불가:

```eiffel
local
    shape: SHAPE
do
    create shape  -- 컴파일 오류!
    -- SHAPE is deferred

    create {RECTANGLE} shape.make (10, 5)  -- OK
    -- 구체 클래스로 생성
end
```

## 상속 vs 클라이언트 관계

| 관계 | 의미 | 예 |
|------|------|-----|
| **상속** | is-a | SAVINGS_ACCOUNT is ACCOUNT |
| **클라이언트** | has-a / uses | PERSON has ACCOUNT |

```eiffel
-- 상속: SAVINGS_ACCOUNT is ACCOUNT
class SAVINGS_ACCOUNT
inherit
    ACCOUNT
end

-- 클라이언트: PERSON has ACCOUNT
class PERSON
feature
    account: ACCOUNT  -- 참조로 연결
end
```

### 선택 기준

| 문장 | 관계 |
|------|------|
| "A is B"가 자연스러움 | **상속** |
| "A has B" 또는 "A uses B" | **클라이언트** |

예를 들어 "자동차는 바퀴를 가진다"는 클라이언트(has-a), "자동차는 탈것이다"는 상속(is-a)이다.

## 상속의 이점

### 재사용성

ACCOUNT의 balance, deposit, withdraw 코드를 SAVINGS_ACCOUNT와 CHECKING_ACCOUNT가 재사용하고, 각각 interest_rate나 overdraft만 추가한다. 중복 없이 특화할 수 있다.

### 확장성

새 도형을 추가하려면 SHAPE를 상속하고 area, draw를 구현하면 된다. 기존의 `process_shapes` 코드는 수정 없이 새 도형도 처리한다. **Open-Closed Principle**의 실현이다.

### 다형적 데이터 구조

```eiffel
class DRAWING
feature
    shapes: LIST [SHAPE]

    add_shape (s: SHAPE)
        do
            shapes.extend (s)
        end

    draw_all
        do
            across shapes as s loop
                s.item.draw
            end
        end

    total_area: REAL
        do
            across shapes as s loop
                Result := Result + s.item.area
            end
        end
end
```

## 자주 하는 실수

상속 사용 시 흔히 빠지는 함정이다.

| 실수 | 증상 | 해결 |
|------|------|------|
| **is-a 아닌 곳에 상속** | "Stack은 List를 상속" → 불필요한 피처 노출 | is-a 관계만 상속. has-a는 위임으로 |
| **재정의 명시 누락** | `redefine` 절 없이 부모 피처 덮어씀 → 컴파일 오류 | `redefine feature_name` 명시 |
| **Precursor 호출 잊음** | 부모 동작 생략 → 계약 위반, 기능 누락 | 필요하면 `Precursor` 호출. 부모 로직 유지 |
| **추상 클래스 인스턴스화 시도** | `create {SHAPE}` → 컴파일 오류 | deferred class는 직접 생성 불가. 구체 클래스로 |
| **깊은 계층** | 5단계 이상 상속 → 이해·유지보수 어려움 | 상속 깊이 3~4 이하. 합성 고려 |
| **다형성 무시** | 타입 체크(`if attached {RECTANGLE}`)로 분기 | 동적 바인딩 활용. 재정의로 타입별 동작 구현 |
| **Open-Closed 위반** | 새 타입 추가 시 기존 코드 수정 필요 | 추상 피처 정의. 확장은 상속으로, 수정은 최소화 |

## 정리

- **상속**: 기존 클래스 기반 새 클래스 정의
- **확장**: 새 피처 추가
- **재정의 (redefine)**: 기존 피처 재구현
- **다형성**: 자식을 부모 타입으로 사용
- **동적 바인딩**: 런타임에 실제 타입의 피처 호출
- **Precursor**: 부모 버전 호출
- **deferred**: 추상 피처, 구현 필수
- **is-a 관계**: 상속의 의미론적 기준

## 다음 장 예고

Chapter 15에서는 **다중 상속**을 다룬다. 여러 부모를 상속받는 클래스, 다이아몬드 문제와 해결책.

## 관련 항목

- [Ch 4: Approaches to Reusability](/blog/programming/design/oosc/chapter04-approaches-to-reusability) — 재사용성
- [Ch 15: Multiple Inheritance](/blog/programming/design/oosc/chapter15-multiple-inheritance) — 다중 상속
- [Ch 16: Inheritance and Assertions](/blog/programming/design/oosc/chapter16-inheritance-and-assertions) — 계약과 상속
- [Ch 3: Modularity](/blog/programming/design/oosc/chapter03-modularity) — Open-Closed Principle
