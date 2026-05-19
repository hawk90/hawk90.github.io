---
title: "Ch 25: Useful Techniques"
date: 2026-05-19T01:00:00
description: "유용한 기법들 — 참조 vs 값, 복제, 동등성 비교."
series: "Object-Oriented Software Construction"
seriesOrder: 25
tags: [oop, meyer, techniques, cloning, equality]
draft: false
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> 객체의 **복제(cloning)**와 **동등성(equality)** 비교는 생각보다 복잡하다. **얕은 복사 vs 깊은 복사**, **참조 동등성 vs 값 동등성**을 명확히 구분해야 한다.

## 참조와 값

### OO에서의 참조 의미론

객체지향에서 변수는 객체 자체가 아니라 객체에 대한 **참조(reference)**를 담는다.

| 코드 | 의미 |
|------|------|
| `x := create {POINT}.make (1, 2)` | 새 객체 생성, x가 참조 |
| `y := x` | y는 x와 **같은 객체**를 참조 |

x와 y는 두 개의 참조, 하나의 객체.

### 참조 vs 확장 타입

```eiffel
-- 참조 타입 (Reference Type)
class PERSON
feature
    name: STRING
    age: INTEGER
end

-- 확장 타입 (Expanded Type)
expanded class POINT
feature
    x, y: REAL
end

-- 사용
local
    p1, p2: PERSON  -- 참조
    pt1, pt2: POINT  -- 값 (확장)
do
    create p1
    p2 := p1         -- 같은 객체 공유

    pt1.make (1, 2)
    pt2 := pt1       -- 값 복사! 별개 객체
end
```

### expanded의 의미

| expanded 클래스 특징 | 설명 |
|---------------------|------|
| 객체가 직접 저장됨 | 참조가 아닌 값 |
| 할당 시 전체 값 복사 | `pt2 := pt1`이면 별개 객체 |
| C의 struct와 유사 | — |
| NULL이 될 수 없음 | 항상 유효한 값 |

| 사용 시기 | 예 |
|----------|-----|
| 작은 값 객체 | POINT, COMPLEX, DATE |
| 불변 객체 | — |
| 성능이 중요한 경우 | — |

## 복제 (Cloning)

### clone과 twin

```eiffel
-- ANY 클래스에 정의된 복제 피처
class ANY
feature
    twin: like Current
        -- Current와 같은 필드 값을 가진 새 객체
        do
            Result := clone (Current)
        end

    clone (other: like Current): like Current
        -- other의 얕은 복사본
        external
            "built_in"
        end

    deep_twin: like Current
        -- Current의 깊은 복사본
        do
            Result := deep_clone (Current)
        end

    deep_clone (other: like Current): like Current
        -- other의 깊은 복사본 (모든 참조 객체도 복제)
        external
            "built_in"
        end
end
```

### 얕은 복사 vs 깊은 복사

```text
원본 객체:
  ┌──────────┐
  │ PERSON   │
  │ name ────┼──→ "Kim"
  │ address ─┼──→ ADDRESS 객체
  └──────────┘

얕은 복사 (twin):
  ┌──────────┐
  │ PERSON   │
  │ name ────┼──→ "Kim" (공유!)
  │ address ─┼──→ ADDRESS 객체 (공유!)
  └──────────┘

깊은 복사 (deep_twin):
  ┌──────────┐
  │ PERSON   │
  │ name ────┼──→ "Kim" (새 복사본)
  │ address ─┼──→ ADDRESS 객체 (새 복사본)
  └──────────┘
```

### copy 프로시저

```eiffel
class ANY
feature
    copy (other: like Current)
        -- other의 필드 값을 Current로 복사
        require
            other_not_void: other /= Void
            same_type: same_type (other)
        external
            "built_in"
        ensure
            is_equal: Current.is_equal (other)
        end
end

-- 사용
local
    p1, p2: PERSON
do
    create p1.make ("Kim", 30)
    create p2.make ("", 0)

    p2.copy (p1)  -- p2를 p1의 값으로 덮어씀
    -- p2.name = "Kim", p2.age = 30
end
```

### 커스텀 복제

```eiffel
class LINKED_LIST [G]
inherit
    ANY
        redefine
            copy
        end

feature
    copy (other: like Current)
        -- 깊은 복사 수행
        local
            cursor: LINKABLE [G]
        do
            wipe_out
            from
                cursor := other.first_element
            until
                cursor = Void
            loop
                extend (cursor.item)
                cursor := cursor.right
            end
        ensure then
            same_count: count = other.count
        end
end
```

## 동등성 비교 (Equality)

### 세 가지 동등성

| 동등성 종류 | 연산 | 의미 |
|-----------|------|------|
| 참조 동등성 | `x = y` | 같은 객체를 가리키는가? |
| 얕은 값 동등성 | `x.is_equal(y)` | 필드 값이 같은가? |
| 깊은 값 동등성 | `x.is_deep_equal(y)` | 모든 참조된 객체까지 같은가? |

### is_equal 구현

```eiffel
class ANY
feature
    is_equal (other: like Current): BOOLEAN
        -- other와 Current가 같은 값인가?
        require
            other_not_void: other /= Void
        do
            -- 기본: 모든 필드 비트 비교
            Result := standard_is_equal (other)
        ensure
            symmetric: Result implies other.is_equal (Current)
            consistent: -- 객체가 변하지 않으면 결과도 변하지 않음
        end

    standard_is_equal (other: like Current): BOOLEAN
        -- 필드별 비트 비교
        external
            "built_in"
        end
end
```

### is_equal 재정의

```eiffel
class PERSON
inherit
    ANY
        redefine
            is_equal
        end

feature
    name: STRING
    id: INTEGER
    address: ADDRESS

    is_equal (other: like Current): BOOLEAN
        -- ID가 같으면 같은 사람
        do
            Result := id = other.id
        end
end

class STRING
inherit
    ANY
        redefine
            is_equal
        end

feature
    is_equal (other: like Current): BOOLEAN
        -- 문자열 내용이 같은가?
        local
            i: INTEGER
        do
            if count /= other.count then
                Result := False
            else
                from
                    i := 1
                    Result := True
                until
                    i > count or not Result
                loop
                    Result := item (i) = other.item (i)
                    i := i + 1
                end
            end
        end
end
```

### ~ 연산자 (동등성 연산자)

```eiffel
-- Eiffel에서 ~ 는 is_equal의 shorthand
x ~ y  -- x.is_equal (y)와 동일

-- 차이점
x = y   -- 참조 동등성 (같은 객체?)
x ~ y   -- 값 동등성 (같은 값?)
x /= y  -- 참조 부등성
x /~ y  -- 값 부등성
```

### 깊은 동등성

```eiffel
class ANY
feature
    is_deep_equal (other: like Current): BOOLEAN
        -- Current와 other가 깊은 수준에서 동등한가?
        require
            other_not_void: other /= Void
        do
            Result := deep_equal (Current, other)
        end

    deep_equal (obj1, obj2: ANY): BOOLEAN
        -- 두 객체가 깊은 수준에서 동등한가?
        -- 모든 참조된 객체까지 재귀적으로 비교
        external
            "built_in"
        end
end
```

### 동등성과 해시

```eiffel
-- 해시 테이블에서 사용하려면 hash_code도 재정의

class PERSON
inherit
    HASHABLE
        redefine
            is_equal, hash_code
        end

feature
    id: INTEGER

    is_equal (other: like Current): BOOLEAN
        do
            Result := id = other.id
        end

    hash_code: INTEGER
        -- is_equal과 일관되어야 함
        -- x.is_equal (y) implies x.hash_code = y.hash_code
        do
            Result := id
        end
end
```

## Void 안전성

### Void 참조 문제

| 문제 | 설명 |
|------|------|
| 가장 흔한 런타임 에러 | `x.feature_call` — x가 Void이면 실패 |
| 10억 달러짜리 실수 | Tony Hoare의 NULL 참조 발명 후회 |
| 모든 참조가 잠재적으로 Void | 방어적 코드 필요 |

### attached와 detachable

```eiffel
class PERSON
feature
    name: STRING              -- attached (기본)
    nickname: detachable STRING  -- Void 가능

    display_name: STRING
        do
            if attached nickname as n then
                Result := n  -- n은 attached STRING
            else
                Result := name
            end
        end
end
```

### Void-safe 프로그래밍

```eiffel
-- Void가 아님을 보장
class CONTAINER
feature
    item: attached G
        -- 절대 Void가 아님

    safe_item: detachable G
        -- Void일 수 있음

    process
        do
            -- item은 안전하게 사용 가능
            print (item.out)

            -- safe_item은 검사 필요
            if attached safe_item as s then
                print (s.out)
            end
        end
end
```

### 객체 테스트

```eiffel
-- 타입 검사와 Void 검사를 동시에
local
    x: ANY
    s: STRING
do
    x := get_something

    -- 객체 테스트
    if attached {STRING} x as str then
        -- str은 STRING 타입이고 Void가 아님
        print (str.count)
    end

    -- 다중 조건과 결합
    if attached {STRING} x as str and then str.count > 0 then
        process_string (str)
    end
end
```

## 인자 전달

### 참조 전달과 값 전달

| 타입 | 전달 방식 | 결과 |
|------|----------|------|
| 참조 타입 | call by sharing | 객체 내용 수정 가능, 참조 자체 교체 불가 |
| 확장 타입 | call by value | 원본에 영향 없음 |

### 인자 수정 금지

```eiffel
-- Eiffel에서 형식 인자는 상수처럼 취급
-- 재할당 불가

add_person (p: PERSON)
    do
        p.set_age (30)    -- OK: 객체 내용 수정
        p := other_person  -- 컴파일 에러! 인자 재할당 금지
    end
```

### 출력 인자 대안

```eiffel
-- 여러 값을 반환해야 할 때

-- 방법 1: TUPLE 반환
divide_with_remainder (a, b: INTEGER): TUPLE [quotient, remainder: INTEGER]
    do
        Result := [a // b, a \\ b]
    end

-- 방법 2: 결과 객체
class DIVISION_RESULT
feature
    quotient: INTEGER
    remainder: INTEGER

    make (a, b: INTEGER)
        do
            quotient := a // b
            remainder := a \\ b
        end
end
```

## 캡슐화된 참조

### 참조 누출 문제

```eiffel
-- 위험: 내부 참조 노출
class ACCOUNT
feature
    transactions: LIST [TRANSACTION]
        -- 호출자가 직접 수정 가능!

-- 사용자 코드
account.transactions.wipe_out  -- 모든 거래 삭제!
```

### 방어적 복사

```eiffel
class ACCOUNT
feature
    transactions: LIST [TRANSACTION]
        -- 방어적 복사
        do
            Result := internal_transactions.twin
        end

feature {NONE}
    internal_transactions: LIST [TRANSACTION]

feature
    add_transaction (t: TRANSACTION)
        do
            internal_transactions.extend (t)
        end
end
```

### 불변 뷰

```eiffel
-- 읽기 전용 인터페이스 노출
class ACCOUNT
feature
    transaction_count: INTEGER
        do
            Result := internal_transactions.count
        end

    transaction_at (i: INTEGER): TRANSACTION
        require
            valid_index: 1 <= i and i <= transaction_count
        do
            Result := internal_transactions.i_th (i).twin
        end

    do_all (action: PROCEDURE [TRANSACTION])
        do
            across internal_transactions as t loop
                action.call ([t.item])
            end
        end
end
```

## 정리

- **참조 vs 값**: 일반 클래스는 참조, expanded 클래스는 값 의미론
- **얕은 복사 (twin)**: 필드 값만 복사, 참조된 객체는 공유
- **깊은 복사 (deep_twin)**: 모든 참조 객체까지 재귀적 복사
- **참조 동등성 (=)**: 같은 객체인가?
- **값 동등성 (~)**: is_equal로 비교, 재정의 가능
- **Void 안전성**: attached/detachable로 NULL 안전성 보장
- **방어적 복사**: 내부 상태 노출 방지

## 다음 장 예고

Chapter 26에서는 **스타일 감각**을 다룬다. 명명 규칙, 레이아웃, 주석 작성법, 가독성 높은 코드 작성.

## 관련 항목

- [Ch 6: Abstract Data Types](/blog/programming/design/oosc/chapter06-abstract-data-types) — 캡슐화
- [Ch 11: Design by Contract](/blog/programming/design/oosc/chapter11-design-by-contract) — 계약
- [Ch 17: Typing](/blog/programming/design/oosc/chapter17-typing) — 타입 시스템
