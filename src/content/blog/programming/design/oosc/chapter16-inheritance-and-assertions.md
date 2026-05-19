---
title: "Ch 16: Inheritance and Assertions"
date: 2026-05-19T16:00:00
description: "상속과 단언 — 리스코프 치환 원칙, 계약의 상속."
series: "Object-Oriented Software Construction"
seriesOrder: 16
tags: [oop, meyer, inheritance, assertions, lsp, contracts]
draft: false
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> 상속에서 계약은 **리스코프 치환 원칙**을 따른다. 사전조건은 같거나 **약하게**, 사후조건은 같거나 **강하게**, 불변식은 **누적**된다.

## 상속과 계약의 관계

다형성을 사용하면 클라이언트는 **부모 타입 계약**에 의존한다:

```eiffel
process (acc: ACCOUNT)
    -- acc는 SAVINGS_ACCOUNT? CHECKING_ACCOUNT? PREMIUM_ACCOUNT?
    require
        valid: acc /= Void
    do
        acc.deposit (100)
        if acc.balance >= 50 then
            acc.withdraw (50)
        end
    end
```

클라이언트는 `ACCOUNT`의 계약만 알고 호출한다. 하위 타입이 이 계약을 **위반하면 안 된다**.

## 리스코프 치환 원칙(LSP)

Barbara Liskov의 원칙:

> **부모 타입 자리에 자식 타입 객체를 넣어도 프로그램이 올바르게 동작해야 한다.**

S가 T의 하위 타입이면, T 타입 객체를 사용하는 모든 프로그램에서 S 타입 객체로 대체해도 올바르게 동작해야 한다. 이것을 **계약**으로 해석하면:

## 사전조건 규칙

자식의 사전조건은 부모보다 **같거나 약해야** 한다.

```eiffel
class ACCOUNT
feature
    withdraw (amount: INTEGER)
        require
            positive: amount > 0
            sufficient: amount <= balance
        do
            ...
        end
end

class PREMIUM_ACCOUNT
inherit
    ACCOUNT
        redefine
            withdraw
        end

feature
    withdraw (amount: INTEGER)
        require else
            -- 더 약한 조건: 마이너스 잔고 허용
            not_too_negative: balance - amount >= -credit_limit
        do
            ...
        end

    credit_limit: INTEGER
end
```

### require else의 의미

| 요소 | 조건 |
|------|------|
| 부모 사전조건 | `amount > 0 AND amount <= balance` |
| 자식 추가 조건 | `balance - amount >= -credit_limit` |
| **결합** | 부모 OR 자식 → 조건 완화 |

### 왜 약해야 하나?

클라이언트는 `acc: ACCOUNT`에 대해 부모 계약만 확인하고 `withdraw`를 호출한다. acc가 PREMIUM_ACCOUNT라면 부모 계약을 만족시켰으므로 자식도 받아들여야 한다. 자식의 사전조건이 더 엄격하면 거부될 수 있어 LSP 위반이 된다.

**잘못된 예**:

```eiffel
class RESTRICTED_ACCOUNT
inherit
    ACCOUNT
        redefine
            withdraw
        end

feature
    withdraw (amount: INTEGER)
        require
            -- 더 엄격! (오류)
            small_amount: amount <= 100
        do
            ...
        end
end
```

클라이언트가 `withdraw(200)`을 `ACCOUNT`에 호출하면 성공하지만, `RESTRICTED_ACCOUNT`에 호출하면 실패 → LSP 위반.

## 사후조건 규칙

자식의 사후조건은 부모보다 **같거나 강해야** 한다.

```eiffel
class ACCOUNT
feature
    deposit (amount: INTEGER)
        require
            positive: amount > 0
        ensure
            increased: balance = old balance + amount
        do
            ...
        end
end

class LOGGED_ACCOUNT
inherit
    ACCOUNT
        redefine
            deposit
        end

feature
    deposit (amount: INTEGER)
        do
            Precursor (amount)
            log_transaction
        ensure then
            -- 더 강한 보장: 기록도 남김
            logged: last_log /= Void
        end
end
```

### ensure then의 의미

| 요소 | 조건 |
|------|------|
| 부모 사후조건 | `balance = old balance + amount` |
| 자식 추가 조건 | `last_log /= Void` |
| **결합** | 부모 AND 자식 → 보장 강화 |

### 왜 강해야 하나?

클라이언트는 `deposit(100)` 후 balance가 증가했음을 기대한다. LOGGED_ACCOUNT라면 balance 증가 + 로그 기록으로 기대를 충족하고 추가 보장도 한다. 자식이 더 약한 보장을 하면 클라이언트 기대 위반이므로 LSP 위반이다.

## 불변식 규칙

불변식은 **누적**된다.

```eiffel
class ACCOUNT
invariant
    non_negative: balance >= 0
end

class SAVINGS_ACCOUNT
inherit
    ACCOUNT

invariant
    -- 추가 불변식
    positive_rate: interest_rate > 0
end
```

`SAVINGS_ACCOUNT`의 실제 불변식:

```text
balance >= 0           -- ACCOUNT에서 상속
AND interest_rate > 0  -- SAVINGS_ACCOUNT 추가
```

자식은 부모의 불변식을 **반드시 유지**해야 한다.

## 계약 상속 요약

| 계약 요소 | 상속 규칙 | 결합 방식 | 결과 |
|----------|----------|----------|------|
| **사전조건** | 같거나 약하게 | OR | 완화 |
| **사후조건** | 같거나 강하게 | AND | 강화 |
| **불변식** | 누적 | AND | 강화 |

부모가 `require PRE_P`, `ensure POST_P`, `invariant INV_P`를 가지고, 자식이 `require else PRE_C`, `ensure then POST_C`, `invariant INV_C`를 추가하면 자식의 실제 계약은 다음과 같다.

| 요소 | 결합 | 결과 |
|------|------|------|
| 사전조건 | PRE_P OR PRE_C | 완화 |
| 사후조건 | POST_P AND POST_C | 강화 |
| 불변식 | INV_P AND INV_C | 강화 |

## 예: 올바른 상속

```eiffel
class RECTANGLE
feature
    width, height: INTEGER

    set_dimensions (w, h: INTEGER)
        require
            positive_w: w > 0
            positive_h: h > 0
        do
            width := w
            height := h
        ensure
            width_set: width = w
            height_set: height = h
        end

    area: INTEGER
        do
            Result := width * height
        ensure
            correct: Result = width * height
        end

invariant
    positive_width: width > 0
    positive_height: height > 0
end

class SQUARE
inherit
    RECTANGLE
        redefine
            set_dimensions
        end

feature
    set_dimensions (w, h: INTEGER)
        require else
            -- 더 약한 조건: 하나만 양수면 OK
            one_positive: w > 0 or h > 0
        do
            width := w
            height := w  -- 정사각형이므로 같게
        ensure then
            -- 더 강한 보장: width = height
            is_square: width = height
        end

invariant
    square_invariant: width = height
end
```

## 예: 잘못된 상속 (LSP 위반)

**문제**: 정사각형은 직사각형인가? 수학적으로는 Yes이지만, OO에서는 주의가 필요하다.

```eiffel
-- 잘못된 설계
class RECTANGLE
feature
    set_width (w: INTEGER)
        do
            width := w
        ensure
            width_changed: width = w
            height_unchanged: height = old height  -- 문제!
        end

    set_height (h: INTEGER)
        do
            height := h
        ensure
            height_changed: height = h
            width_unchanged: width = old width  -- 문제!
        end
end

class SQUARE
inherit
    RECTANGLE
        redefine
            set_width, set_height
        end

feature
    set_width (w: INTEGER)
        do
            width := w
            height := w  -- 정사각형 유지
        ensure then
            still_square: width = height
        end
    -- height_unchanged 사후조건 위반!
end
```

```eiffel
-- 클라이언트 코드
resize_rectangle (r: RECTANGLE)
    local
        old_height: INTEGER
    do
        old_height := r.height
        r.set_width (100)
        assert (r.height = old_height)  -- SQUARE면 실패!
    end
```

### 해결책

| 방법 | 설명 |
|------|------|
| **별개 클래스** | SQUARE가 RECTANGLE을 상속하지 않음 |
| **불변 객체** | set_width, set_height 대신 새 객체 생성 |
| **공통 추상 부모** | SHAPE를 부모로, RECTANGLE과 SQUARE는 형제 |

## 추상 클래스와 계약

```eiffel
deferred class SHAPE
feature
    area: INTEGER
        deferred
        ensure
            non_negative: Result >= 0
        end

    perimeter: INTEGER
        deferred
        ensure
            non_negative: Result >= 0
        end

invariant
    valid_dimensions: area >= 0 and perimeter >= 0
end
```

추상 피처도 **계약을 명시**할 수 있다. 구현 클래스는 이 계약을 따라야 한다.

## 정리

- **LSP**: 자식이 부모 자리를 대체 가능해야
- **사전조건**: 같거나 약하게 (`require else`, OR)
- **사후조건**: 같거나 강하게 (`ensure then`, AND)
- **불변식**: 누적 (부모 + 자식, AND)
- **위반 예**: Rectangle-Square 문제
- **추상 계약**: deferred 피처도 계약 가능

## 다음 장 예고

Chapter 17에서는 **타이핑**을 다룬다. 정적 vs 동적 타이핑, 공변성, 반공변성, 앵커 타입.

## 관련 항목

- [Ch 11: Design by Contract](/blog/programming/design/oosc/chapter11-design-by-contract) — 계약 기초
- [Ch 14: Introduction to Inheritance](/blog/programming/design/oosc/chapter14-introduction-to-inheritance) — 상속
- [Ch 17: Typing](/blog/programming/design/oosc/chapter17-typing) — 타입 시스템
