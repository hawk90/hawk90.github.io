---
title: "Ch 10: Genericity"
date: 2026-05-19T10:00:00
description: "제네릭 — 타입 매개변수화, 제약 제네릭, 컨테이너 설계."
series: "Object-Oriented Software Construction"
seriesOrder: 10
tags: [oop, meyer, genericity, generics, type-parameters]
draft: true
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> **제네릭**은 타입을 매개변수로 받는 클래스를 만드는 메커니즘이다. 타입 안전성을 유지하면서 재사용성을 극대화한다.

## 제네릭의 필요성

같은 로직인데 타입만 다른 상황을 생각해보자.

```eiffel
class INTEGER_STACK
feature
    push (x: INTEGER) do ... end
    top: INTEGER do ... end
end

class STRING_STACK
feature
    push (x: STRING) do ... end
    top: STRING do ... end
end
```

이런 식으로 타입마다 클래스를 만들면 문제가 생긴다.

| 문제 | 설명 |
|------|------|
| **코드 중복** | 같은 로직이 타입마다 반복된다 |
| **유지보수 부담** | 버그 수정을 N번 해야 한다 |
| **확장 불가** | 새 타입마다 새 클래스가 필요하다 |

## 제네릭 클래스

타입을 **매개변수**로 받는다:

```eiffel
class STACK [G]  -- G는 타입 매개변수 (Generic parameter)

create
    make

feature
    push (x: G)
        -- G 타입의 요소를 추가
        do
            count := count + 1
            data.put (x, count)
        end

    pop
        -- 최상위 요소 제거
        require
            not is_empty
        do
            count := count - 1
        end

    top: G
        -- 최상위 요소 반환
        require
            not is_empty
        do
            Result := data.item (count)
        end

    is_empty: BOOLEAN
        do
            Result := (count = 0)
        end

feature {NONE}
    data: ARRAY [G]
    count: INTEGER
end
```

### 사용법

```eiffel
local
    int_stack: STACK [INTEGER]
    str_stack: STACK [STRING]
    person_stack: STACK [PERSON]
do
    create int_stack.make
    int_stack.push (42)
    int_stack.push (17)
    print (int_stack.top)  -- 17

    create str_stack.make
    str_stack.push ("Hello")
    str_stack.push ("World")
    print (str_stack.top)  -- "World"

    create person_stack.make
    person_stack.push (create {PERSON}.make ("Kim"))
end
```

### 타입 안전성

```eiffel
local
    int_stack: STACK [INTEGER]
do
    create int_stack.make
    int_stack.push (42)       -- OK
    int_stack.push ("Hello")  -- 컴파일 오류!
    -- STRING은 INTEGER가 아님
end
```

제네릭은 **컴파일 타임에 타입 검사**를 한다. 런타임 오류 방지.

## 제네릭 vs 다른 접근법

### ANY 타입 사용 (타입 불안전)

```eiffel
class UNSAFE_STACK
feature
    push (x: ANY) do ... end
    top: ANY do ... end
end
```

ANY 타입으로 뭐든 담을 수 있지만, 타입 안전성을 잃는다.

```eiffel
stack.push (42)
stack.push ("Hello")  -- 컴파일러가 막지 못함
i := stack.top        -- 런타임에 타입 오류 발생
```

### 비교

| 접근법 | 타입 안전 | 재사용성 | 성능 |
|--------|:--------:|:--------:|:----:|
| 타입별 클래스 | O | X | O |
| ANY 사용 | X | O | 캐스팅 비용 |
| **제네릭** | O | O | O |

제네릭이 타입 안전성과 재사용성을 모두 제공한다.

## 제약 제네릭 (Constrained Genericity)

타입 매개변수에 **제약**을 둔다:

```eiffel
class SORTED_LIST [G -> COMPARABLE]
-- G는 COMPARABLE의 하위 타입이어야 함

feature
    put (x: G)
        -- 정렬 순서 유지하며 삽입
        local
            pos: INTEGER
        do
            from pos := 1
            until pos > count or else x < item (pos)
            loop
                pos := pos + 1
            end
            insert_at (x, pos)
        end
end
```

`G -> COMPARABLE`은 G가 반드시 `COMPARABLE`을 구현해야 함을 의미한다.

### 제약의 효과

```eiffel
local
    sorted_ints: SORTED_LIST [INTEGER]
    sorted_strings: SORTED_LIST [STRING]
    sorted_persons: SORTED_LIST [PERSON]  -- PERSON이 COMPARABLE?
do
    create sorted_ints.make
    sorted_ints.put (3)
    sorted_ints.put (1)
    sorted_ints.put (2)
    -- 결과: [1, 2, 3]

    create sorted_strings.make
    sorted_strings.put ("banana")
    sorted_strings.put ("apple")
    -- 결과: ["apple", "banana"]

    -- PERSON이 COMPARABLE을 상속하지 않으면:
    create sorted_persons.make  -- 컴파일 오류!
end
```

### PERSON을 COMPARABLE로

```eiffel
class PERSON
inherit
    COMPARABLE
        redefine
            is_less
        end

create
    make

feature
    name: STRING
    age: INTEGER

    is_less alias "<" (other: like Current): BOOLEAN
        -- 이름 알파벳 순서로 비교
        do
            Result := name < other.name
        end
end
```

이제 `SORTED_LIST [PERSON]`이 가능하다.

## 다중 제약

여러 제약을 동시에:

```eiffel
class HASHABLE_SET [G -> {HASHABLE, COMPARABLE}]
-- G는 HASHABLE이면서 COMPARABLE이어야

feature
    put (x: G)
        do
            -- x.hash_code 사용 가능 (HASHABLE)
            -- x < y 비교 가능 (COMPARABLE)
        end
end
```

## 제네릭과 상속

### 제네릭 클래스 상속

```eiffel
class BOUNDED_STACK [G]
inherit
    STACK [G]
        redefine
            push
        end

create
    make

feature
    capacity: INTEGER

    push (x: G)
        require else
            not is_full
        do
            Precursor (x)  -- 부모의 push 호출
        end

    is_full: BOOLEAN
        do
            Result := (count >= capacity)
        end
end
```

### 타입 매개변수 고정

```eiffel
class INTEGER_MATRIX
inherit
    MATRIX [INTEGER]
-- INTEGER로 타입 고정

feature
    -- INTEGER 전용 연산
    sum_all: INTEGER
        do
            ...
        end
end
```

### 제네릭 파생(Generic Derivation)

```eiffel
class PAIR [G, H]
feature
    first: G
    second: H
end
```

```eiffel
local
    int_str: PAIR [INTEGER, STRING]
    point: PAIR [REAL, REAL]
    nested: PAIR [STACK [INTEGER], LIST [STRING]]
do
    create int_str
    int_str.first := 42
    int_str.second := "Hello"

    create point
    point.first := 3.0
    point.second := 4.0
end
```

## 표준 라이브러리의 제네릭

Eiffel 표준 라이브러리는 제네릭을 광범위하게 사용한다:

### ARRAY [G]

```eiffel
local
    numbers: ARRAY [INTEGER]
    names: ARRAY [STRING]
do
    create numbers.make_filled (0, 1, 10)
    numbers[1] := 42
    numbers[2] := 17

    create names.make_filled ("", 1, 5)
    names[1] := "Kim"
end
```

### LIST [G]

```eiffel
local
    list: LINKED_LIST [PERSON]
do
    create list.make
    list.extend (create {PERSON}.make ("Kim"))
    list.extend (create {PERSON}.make ("Lee"))

    from list.start
    until list.after
    loop
        print (list.item.name)
        list.forth
    end
end
```

### HASH_TABLE [G, K]

```eiffel
local
    ages: HASH_TABLE [INTEGER, STRING]
do
    create ages.make (10)
    ages.put (30, "Kim")
    ages.put (25, "Lee")

    print (ages.item ("Kim"))  -- 30
end
```

## 제네릭과 공변성(Covariance)

타입 매개변수와 상속이 만나면 복잡한 문제가 발생한다.

### 문제 상황

```eiffel
class ANIMAL end
class DOG inherit ANIMAL end
class CAT inherit ANIMAL end

class CAGE [G]
feature
    occupant: G
    put (x: G) do occupant := x end
end
```

질문: `CAGE [DOG]`는 `CAGE [ANIMAL]`의 하위 타입인가?

```eiffel
local
    dog_cage: CAGE [DOG]
    animal_cage: CAGE [ANIMAL]
do
    create dog_cage
    dog_cage.put (create {DOG})  -- OK

    animal_cage := dog_cage  -- 허용된다면?

    animal_cage.put (create {CAT})  -- CAT을 DOG 케이지에!
    -- dog_cage.occupant는 이제 CAT
    -- 타입 불건전!
end
```

### Eiffel의 해결: CAT call 문제

Eiffel은 이 문제를 **CAT call** (Changing Availability or Type)이라 부르고, 정적 분석으로 감지한다.

## 제네릭 vs 상속

| 측면 | 제네릭 | 상속 |
|------|--------|------|
| **목적** | 타입 매개변수화 | 특수화/확장 |
| **관계** | has-a (컨테이너-요소) | is-a |
| **결정 시점** | 인스턴스화 시 | 클래스 정의 시 |
| **다형성** | 없음 | 있음 |

제네릭에서 `STACK [INTEGER]`와 `STACK [STRING]`은 다른 타입이다. 상속에서 `SAVINGS_ACCOUNT`는 `ACCOUNT`로 다형적으로 사용할 수 있다.

두 메커니즘은 **상호 보완적**이다:

```eiffel
class SORTED_LIST [G -> COMPARABLE]
-- 제네릭 (어떤 COMPARABLE이든)
-- + 제약 (COMPARABLE 상속 관계 활용)
inherit
    LIST [G]
-- 상속 (LIST 확장)
end
```

## 자주 하는 실수

제네릭 사용 시 흔히 빠지는 함정이다.

| 실수 | 증상 | 해결 |
|------|------|------|
| **ANY 타입으로 대체** | `STACK [ANY]`로 아무거나 담음 → 런타임 타입 오류 | 제네릭 사용. `STACK [G]`로 컴파일 타임 검사 |
| **제약 누락** | `SORTED_LIST [G]`에서 `<` 연산 불가 → 컴파일 오류 | 제약 추가. `G -> COMPARABLE` |
| **타입별 클래스 양산** | `INTEGER_STACK`, `STRING_STACK`, `PERSON_STACK` 따로 | 하나의 `STACK [G]`로 통일 |
| **공변성 문제 무시** | `CAGE [DOG]`를 `CAGE [ANIMAL]`로 대입 → CAT이 DOG 케이지에 | 제네릭은 불변(invariant). 타입 관계 이해 필요 |
| **과도한 타입 매개변수** | `CLASS [A, B, C, D, E]` → 이해 불가 | 2~3개 이하로. 필요하면 클래스 분리 |
| **제약 조건 과다** | `G -> {A, B, C, D}` → 만족하는 타입이 거의 없음 | 꼭 필요한 제약만. 인터페이스 분리 고려 |
| **제네릭과 상속 혼동** | `STACK [INTEGER]`가 `STACK [ANY]`의 하위 타입이라 착각 | 제네릭 인스턴스화는 상속 관계 아님 |

## 정리

- **제네릭**: 타입을 매개변수로 받는 클래스
- **타입 안전성**: 컴파일 타임 타입 검사
- **제약 제네릭**: `G -> COMPARABLE` 형태로 제약
- **다중 제약**: `G -> {A, B}` 여러 제약 동시 적용
- **제네릭 상속**: 제네릭 클래스도 상속 가능
- **표준 라이브러리**: ARRAY, LIST, HASH_TABLE 등
- **공변성 문제**: CAT call 감지

## 다음 장 예고

Chapter 11에서는 **Design by Contract**를 다룬다. 사전조건, 사후조건, 클래스 불변식으로 신뢰성 있는 소프트웨어를 구축하는 방법.

## 관련 항목

- [Ch 4: Approaches to Reusability](/blog/programming/design/oosc/chapter04-approaches-to-reusability) — 재사용성
- [Ch 11: Design by Contract](/blog/programming/design/oosc/chapter11-design-by-contract) — 계약
- [Ch 14: Introduction to Inheritance](/blog/programming/design/oosc/chapter14-introduction-to-inheritance) — 상속
- [Ch 17: Typing](/blog/programming/design/oosc/chapter17-typing) — 타입 시스템
