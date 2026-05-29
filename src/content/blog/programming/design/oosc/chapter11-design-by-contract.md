---
title: "Ch 11: Design by Contract"
date: 2026-05-19T11:00:00
description: "계약에 의한 설계 — 사전조건, 사후조건, 불변식으로 신뢰성 구축."
series: "Object-Oriented Software Construction"
seriesOrder: 11
tags: [oop, meyer, design-by-contract, precondition, postcondition, invariant]
draft: true
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> **Design by Contract(DbC)**는 소프트웨어의 신뢰성을 구축하는 핵심 방법론이다. 사전조건, 사후조건, 불변식이 공급자와 클라이언트 간의 **계약**을 명시한다.

## 계약의 개념

현실의 계약을 생각해보자. 건설 계약에서 클라이언트는 건축 허가를 취득하고 자재 대금을 지불해야 한다. 공급자는 설계도대로 건물을 완성하고 기한을 준수해야 한다. 위반하면 계약 해지나 손해배상이 따른다.

소프트웨어 계약도 마찬가지다.

| 요소 | 역할 |
|------|------|
| **사전조건** | 클라이언트의 의무. 올바른 인자 제공 |
| **사후조건** | 공급자의 의무. 올바른 결과 반환 |
| **불변식** | 항상 유지. 객체 상태 일관성 |

## 사전조건(Precondition)

**클라이언트의 의무**. 루틴 호출 전에 참이어야 하는 조건.

```eiffel
class ACCOUNT
feature
    balance: INTEGER

    withdraw (amount: INTEGER)
        require  -- 사전조건
            positive_amount: amount > 0
            sufficient_funds: amount <= balance
        do
            balance := balance - amount
        end
end
```

### 사전조건의 의미

```eiffel
local
    acc: ACCOUNT
do
    create acc.make (1000)

    acc.withdraw (500)   -- OK: 500 > 0 and 500 <= 1000
    acc.withdraw (0)     -- 위반: amount > 0 실패
    acc.withdraw (2000)  -- 위반: amount <= balance 실패
end
```

사전조건 위반은 **클라이언트의 버그**다. 공급자(withdraw)는 책임지지 않는다.

### 방어적 프로그래밍 vs DbC

```eiffel
-- 방어적 프로그래밍 (권장하지 않음)
withdraw (amount: INTEGER)
    do
        if amount <= 0 then
            -- 어떻게 처리? 무시? 예외?
            return
        end
        if amount > balance then
            -- 또 어떻게?
            return
        end
        balance := balance - amount
    end

-- Design by Contract
withdraw (amount: INTEGER)
    require
        positive_amount: amount > 0
        sufficient_funds: amount <= balance
    do
        balance := balance - amount  -- 깔끔한 핵심 로직
    end
```

DbC는 **책임을 명확히 분리**한다.

## 사후조건(Postcondition)

**공급자의 의무**. 루틴 실행 후 참이어야 하는 조건.

```eiffel
class ACCOUNT
feature
    withdraw (amount: INTEGER)
        require
            positive_amount: amount > 0
            sufficient_funds: amount <= balance
        do
            balance := balance - amount
        ensure  -- 사후조건
            balance_decreased: balance = old balance - amount
        end

    deposit (amount: INTEGER)
        require
            positive_amount: amount > 0
        do
            balance := balance + amount
        ensure
            balance_increased: balance = old balance + amount
        end
end
```

### old 키워드

`old` 표현식은 루틴 **시작 시점**의 값을 나타낸다.

```eiffel
deposit (amount: INTEGER)
    ensure
        balance_increased: balance = old balance + amount
end
```

예를 들어 balance가 1000인 상태에서 `deposit(500)`을 호출하면, 사후조건은 `1500 = 1000 + 500`을 검사한다.

### Result 키워드

함수의 반환값을 참조:

```eiffel
class STACK [G]
feature
    top: G
        require
            not_empty: not is_empty
        do
            Result := data [count]
        ensure
            definition: Result = data [count]
        end

    count: INTEGER

    is_empty: BOOLEAN
        do
            Result := (count = 0)
        ensure
            definition: Result = (count = 0)
        end
end
```

## 클래스 불변식(Class Invariant)

**항상 유지되어야 하는 조건**. 모든 루틴의 시작과 끝에서 참.

```eiffel
class ACCOUNT
feature
    balance: INTEGER
    minimum_balance: INTEGER

    withdraw (amount: INTEGER)
        require
            positive_amount: amount > 0
            sufficient_funds: amount <= balance - minimum_balance
        do
            balance := balance - amount
        ensure
            balance_decreased: balance = old balance - amount
        end

    deposit (amount: INTEGER)
        require
            positive_amount: amount > 0
        do
            balance := balance + amount
        ensure
            balance_increased: balance = old balance + amount
        end

invariant
    balance_above_minimum: balance >= minimum_balance
    minimum_non_negative: minimum_balance >= 0
end
```

### 불변식의 시점

![불변식 검사 시점](/images/blog/oosc/diagrams/ch11-contract-flow.svg)

생성 후, 각 루틴 완료 후에 불변식을 검사한다. **루틴 실행 중**에는 불변식이 일시적으로 위반될 수 있다:

```eiffel
class SORTED_LIST [G -> COMPARABLE]
feature
    put (x: G)
        local
            pos: INTEGER
        do
            extend (x)       -- 리스트 끝에 추가 (정렬 깨짐!)
            bubble_up (x)    -- 정렬 복원
        end

invariant
    is_sorted: is_sorted_list
end
```

## 계약의 완전한 예

```eiffel
class STACK [G]

create
    make

feature {NONE}  -- 구현
    data: ARRAY [G]
    capacity: INTEGER

feature  -- 접근
    count: INTEGER
        -- 스택의 요소 수

    top: G
        -- 최상위 요소
        require
            not_empty: not is_empty
        do
            Result := data [count]
        ensure
            definition: Result = data [count]
        end

    is_empty: BOOLEAN
        -- 스택이 비었는가
        do
            Result := (count = 0)
        ensure
            definition: Result = (count = 0)
        end

    is_full: BOOLEAN
        -- 스택이 가득 찼는가
        do
            Result := (count = capacity)
        ensure
            definition: Result = (count = capacity)
        end

feature  -- 상태 변경
    put (x: G)
        -- x를 최상위에 추가
        require
            not_full: not is_full
        do
            count := count + 1
            data [count] := x
        ensure
            count_increased: count = old count + 1
            item_pushed: top = x
            not_empty: not is_empty
        end

    remove
        -- 최상위 요소 제거
        require
            not_empty: not is_empty
        do
            count := count - 1
        ensure
            count_decreased: count = old count - 1
            not_full: not is_full
        end

feature {NONE}  -- 초기화
    make (n: INTEGER)
        -- 용량 n의 스택 생성
        require
            positive_capacity: n > 0
        do
            capacity := n
            create data.make_filled (default_value, 1, n)
            count := 0
        ensure
            capacity_set: capacity = n
            empty: is_empty
        end

invariant
    count_non_negative: count >= 0
    count_bounded: count <= capacity
    capacity_positive: capacity > 0

end
```

## 계약과 문서화

계약은 **실행 가능한 문서**다:

```eiffel
-- 계약이 곧 명세
deposit (amount: INTEGER)
    require
        positive_amount: amount > 0
    ensure
        balance_increased: balance = old balance + amount

-- 별도 문서 불필요:
-- "deposit은 양수 amount를 받아 잔고를 증가시킨다"
-- → 이 정보가 이미 코드에 있음
```

### Short Form

Eiffel은 클래스의 **인터페이스 뷰**를 추출한다:

```eiffel
class interface STACK [G]

create
    make

feature -- 접근
    count: INTEGER
    top: G
        require
            not_empty: not is_empty
    is_empty: BOOLEAN
    is_full: BOOLEAN

feature -- 상태 변경
    put (x: G)
        require
            not_full: not is_full
        ensure
            count_increased: count = old count + 1
            item_pushed: top = x

    remove
        require
            not_empty: not is_empty
        ensure
            count_decreased: count = old count - 1

feature {NONE} -- 초기화
    make (n: INTEGER)
        require
            positive_capacity: n > 0
        ensure
            capacity_set: capacity = n
            empty: is_empty

invariant
    count_non_negative: count >= 0
    count_bounded: count <= capacity

end
```

구현(`do` 블록)은 숨기고 계약만 보인다. 이것이 **진정한 인터페이스**.

## 계약 위반과 버그

| 위반 | 버그 위치 | 예시 |
|------|----------|------|
| 사전조건 위반 | **클라이언트** | `acc.withdraw(-100)` — 클라이언트 코드 수정 필요 |
| 사후조건 위반 | **공급자** | deposit이 balance를 증가시키지 않음 — deposit 구현 수정 필요 |
| 불변식 위반 | **공급자** | 루틴 완료 후 balance < minimum_balance — 공급자 코드 수정 필요 |

## 계약과 상속

상속 시 계약은 어떻게 되는가?

### 규칙

| 계약 요소 | 상속 시 | 이유 |
|-----------|---------|------|
| **사전조건** | 같거나 약하게 (require else) | 클라이언트에게 더 관대해질 수 있지만, 더 엄격해지면 Liskov 위반 |
| **사후조건** | 같거나 강하게 (ensure then) | 더 많이 보장할 수 있지만, 더 적게 보장하면 안 됨 |
| **불변식** | 상속 + 추가 가능 | 부모의 불변식 + 자신의 불변식 |

```eiffel
class ACCOUNT
feature
    withdraw (amount: INTEGER)
        require
            positive: amount > 0
            sufficient: amount <= balance
        ensure
            decreased: balance = old balance - amount
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
            not_too_negative: balance - amount >= -overdraft_limit
        ensure then
            -- 더 강한 보장: 거래 기록
            logged: last_transaction /= Void
        do
            balance := balance - amount
            log_transaction
        end
end
```

## 단언 모니터링

Eiffel은 단언 검사 수준을 설정할 수 있다.

| 수준 | 검사 내용 | 용도 |
|------|-----------|------|
| **no** | 검사 안 함 | 최종 배포 |
| **require** | 사전조건만 | 배포 |
| **ensure** | 사전조건 + 사후조건 | 테스트 |
| **invariant** | 전체 | 개발 |
| **all** | 모든 단언 | 개발/디버깅 |

개발 중에는 `all`로, 배포 시에는 `no` 또는 `require`로 설정한다.

## 계약의 이점

| 이점 | 설명 |
|------|------|
| **명확한 책임** | 방어적 프로그래밍은 양쪽 모두 검사해서 중복과 불명확함이 생긴다. DbC는 한 쪽만 검사하므로 명확하고 효율적이다. |
| **버그 조기 발견** | 사전조건 위반은 즉시 감지된다. 방어적 코드에서는 조용히 무시되거나 나중에 이상한 증상으로 나타난다. |
| **자동 테스트** | 계약이 테스트 오라클 역할을 한다. `deposit(500)` 호출 후 balance 검사가 자동으로 이루어진다. |
| **문서로서의 코드** | require/ensure가 명세이므로 별도 문서와 동기화 문제가 없고 항상 최신 상태다. |

## 자주 하는 실수

Design by Contract 적용 시 흔히 빠지는 함정이다.

| 실수 | 증상 | 해결 |
|------|------|------|
| **방어적 프로그래밍과 혼용** | require에도 검사, do에서도 `if amount <= 0` 검사 → 중복 | 책임 분리. 사전조건은 클라이언트 책임, 공급자는 신뢰 |
| **사전조건이 너무 약함** | `withdraw`에 `require amount > 0`만 → 잔고 마이너스 가능 | 필요한 조건 모두 명시. `amount <= balance` 추가 |
| **사전조건이 너무 강함** | 클라이언트가 만족시키기 어려움 → API 사용 불편 | 합리적 수준. 외부 요인(파일 존재 등)은 예외로 |
| **사후조건이 검증 불가** | `ensure 결과가_정확함` → 형식적 의미 없음 | 구체적이고 검사 가능한 조건. `balance = old balance + amount` |
| **불변식 일시 위반 혼동** | 루틴 중간에 불변식 깨짐 → "버그인가?" | 루틴 실행 중에는 불변식 위반 허용. 완료 시점에만 검사 |
| **단언과 입력 검증 혼동** | 사용자 입력을 require로 검사 → 프로덕션에서 크래시 | 외부 입력은 명시적 검증. 단언은 내부 프로그래머 오류용 |
| **상속 시 계약 강화** | 하위 클래스에서 사전조건을 더 엄격하게 → Liskov 위반 | 사전조건은 같거나 약하게(require else), 사후조건은 같거나 강하게(ensure then) |

## 정리

- **Design by Contract**: 공급자-클라이언트 간 계약
- **사전조건 (require)**: 클라이언트의 의무
- **사후조건 (ensure)**: 공급자의 의무
- **불변식 (invariant)**: 항상 유지되는 조건
- **old/Result**: 사후조건에서 이전 상태/반환값 참조
- **위반 = 버그**: 사전조건 위반 → 클라이언트 버그
- **상속**: 사전조건은 약하게, 사후조건은 강하게
- **이점**: 명확한 책임, 조기 버그 발견, 자동 문서화

## 다음 장 예고

Chapter 12에서는 **계약이 깨졌을 때**를 다룬다. 예외 처리, 재시도, 조직적 패닉.

## 관련 항목

- [Ch 6: Abstract Data Types](/blog/programming/design/oosc/chapter06-abstract-data-types) — ADT와 명세
- [Ch 7: The Static Structure: Classes](/blog/programming/design/oosc/chapter07-the-static-structure-classes) — 클래스 구조
- [Ch 12: When the Contract is Broken](/blog/programming/design/oosc/chapter12-exception-handling) — 예외 처리
- [Ch 16: Inheritance and Assertions](/blog/programming/design/oosc/chapter16-inheritance-and-assertions) — 상속과 계약
