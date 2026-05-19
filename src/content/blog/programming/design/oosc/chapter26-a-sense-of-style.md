---
title: "Ch 26: A Sense of Style"
date: 2026-05-19T02:00:00
description: "스타일 감각 — 명명 규칙, 레이아웃, 주석, 헤더."
series: "Object-Oriented Software Construction"
seriesOrder: 26
tags: [oop, meyer, style, naming, conventions, readability]
draft: false
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> 코드 스타일은 단순한 미학이 아니라 **가독성**과 **유지보수성**에 직결된다. 일관된 명명, 적절한 레이아웃, 의미 있는 주석이 좋은 스타일의 핵심이다.

## 스타일의 중요성

### 왜 스타일이 중요한가

코드는 두 독자를 위해 쓴다: (1) 컴파일러 — 정확성, (2) 사람 — 이해와 유지보수.

**사람이 읽는 시간 >> 작성 시간** → 가독성 투자가 장기적 이득.

| 좋은 스타일의 효과 |
|------------------|
| 버그 발견 용이 |
| 유지보수 비용 감소 |
| 팀 협업 효율화 |
| 코드 리뷰 가속 |

### Meyer의 스타일 철학

| 원칙 | 설명 |
|------|------|
| 일관성 (Consistency) | 같은 것은 같은 방식으로 |
| 명확성 (Clarity) | 의도가 드러나는 코드 |
| 간결성 (Brevity) | 불필요한 장황함 제거 |
| 우아함 (Elegance) | 단순하고 직접적인 표현 |

## 명명 규칙 (Naming Conventions)

### 클래스 이름

```eiffel
-- 명사 사용
-- 대문자와 밑줄 (UPPER_CASE)

-- Good
class LINKED_LIST
class BANK_ACCOUNT
class HTTP_REQUEST

-- Bad
class linked_list  -- 소문자
class LinkedList   -- 카멜케이스
class LIST_LINKED  -- 어순
class DO_SOMETHING -- 동사 (클래스는 명사)
```

### 피처 이름

```eiffel
-- 소문자와 밑줄 (snake_case)

-- 쿼리 (Query): 명사 또는 형용사
feature
    count: INTEGER       -- 명사
    is_empty: BOOLEAN    -- 형용사 (is_ 접두사)
    has_item: BOOLEAN    -- has_ 접두사
    can_add: BOOLEAN     -- can_ 접두사

-- 명령 (Command): 동사
feature
    put (item: G)        -- 동사
    remove_first         -- 동사
    make_from_string     -- 팩토리는 make_ 접두사

-- Bad
feature
    GetCount: INTEGER    -- 대문자, Get 불필요
    isEmpty: BOOLEAN     -- 카멜케이스
    doRemove             -- do 불필요
```

### 불리언 피처 명명

```eiffel
-- is_, has_, can_ 접두사로 명확히

class CONTAINER
feature
    -- 상태 질의
    is_empty: BOOLEAN
    is_full: BOOLEAN
    is_valid: BOOLEAN

    -- 포함 여부
    has_item (item: G): BOOLEAN
    has_key (key: K): BOOLEAN

    -- 능력/허용 여부
    can_add: BOOLEAN
    can_remove: BOOLEAN
end

-- 사용 시 자연스러움
if container.is_empty then ...
if container.has_item (x) then ...
if container.can_add then ...
```

### 로컬 변수와 인자

| 규칙 | 설명 |
|------|------|
| 짧고 명확하게 | 의미를 담되 타입 접두사 피함 |
| 루프 변수 | `i`, `j`, `k` 허용 |
| 임시 변수 | 목적 표현 |

| Good | Bad |
|------|-----|
| `item`, `key`, `value`, `index` | `strName`, `intCount` (헝가리안) |
| `current_item`, `next_node` | `temp`, `tmp`, `x`, `a` (무의미) |
| `i`, `j` (루프 인덱스) | `theItem`, `aValue` (관사 불필요) |

### 일관된 명명 패턴

```eiffel
-- 대칭적 이름 쌍
put / remove (추가/제거)
start / finish (시작/끝)
open / close
attach / detach
forth / back (전진/후진)

-- 변환 패턴
to_string, to_integer, to_array
as_string, as_integer, as_array
from_string, from_integer

-- 팩토리 패턴
make           -- 기본 생성
make_empty     -- 빈 객체 생성
make_from_xxx  -- xxx에서 생성
```

## 레이아웃 (Layout)

### 들여쓰기

```eiffel
class EXAMPLE
feature
    method
        require
            -- 4칸 들여쓰기
            precondition: value > 0
        local
            temp: INTEGER
        do
            if condition then
                -- 조건문 안 4칸 더
                do_something
            else
                do_other
            end

            from
                i := 1
            until
                i > count
            loop
                process (i)
                i := i + 1
            end
        ensure
            postcondition: Result >= 0
        end
```

### 빈 줄 사용

```eiffel
class WELL_FORMATTED
feature -- 접근
    name: STRING
    age: INTEGER

feature -- 상태 변경
    set_name (n: STRING)
        do
            name := n
        end

    set_age (a: INTEGER)
        do
            age := a
        end

feature {NONE} -- 구현
    internal_validate
        do
            -- 피처 사이 빈 줄로 구분
        end
end

-- 논리적 그룹 사이 빈 줄
-- 관련 구문은 붙여씀
```

### 한 줄 길이

| 규칙 | 설명 |
|------|------|
| 80-120자 이내 권장 | 가로 스크롤 피함 |
| 줄바꿈 위치 | 연산자 앞, 쉼표 뒤, 여는 괄호 뒤 |

```eiffel
-- 긴 조건문
if very_long_condition_one and then
   very_long_condition_two and then
   yet_another_condition
then
    do_something
end

-- 긴 인자 목록
very_long_method_name (
    first_argument,
    second_argument,
    third_argument
)

-- 긴 표현식
Result := first_part
    + second_part
    - third_part
```

### feature 절 조직

```eiffel
class WELL_ORGANIZED
feature -- 초기화
    make (initial_value: INTEGER)
        do
            value := initial_value
        end

feature -- 접근
    value: INTEGER
    is_valid: BOOLEAN

feature -- 기본 연산
    increment
        do
            value := value + 1
        end

feature -- 비교
    is_equal (other: like Current): BOOLEAN
        do
            Result := value = other.value
        end

feature {NONE} -- 구현
    internal_helper
        do
            -- 비공개 헬퍼
        end

invariant
    non_negative: value >= 0
end
```

## 주석 (Comments)

### 주석 원칙

| 좋은 주석 | 나쁜 주석 |
|----------|----------|
| WHY를 설명 (왜 이렇게 했는가) | WHAT을 반복 (코드가 이미 말함) |
| 의도를 명확히 | 오래되어 틀린 정보 |
| 비직관적인 부분 설명 | 나쁜 코드를 변명 |

```eiffel
-- Bad: 코드를 반복
i := i + 1  -- i를 1 증가

-- Good: 왜를 설명
i := i + 1  -- 센티널 포함하여 카운트

-- Bad: 나쁜 코드 변명
-- 이 부분은 복잡하지만 작동함
x := ((a + b) * c - d) / (e + f * g)

-- Good: 리팩터링
numerator := (a + b) * c - d
denominator := e + f * g
x := numerator / denominator
```

### 헤더 주석

```eiffel
note
    description: "이 클래스의 목적을 한 문장으로"
    author: "Author Name"
    date: "$Date$"
    revision: "$Revision$"

class DOCUMENTED_CLASS

feature -- 초기화
    make (initial: INTEGER)
        -- 초기값으로 생성
        require
            positive: initial > 0
        do
            value := initial
        ensure
            value_set: value = initial
        end
```

### 피처 주석

```eiffel
feature -- 기본 연산
    put (item: G; key: K)
        -- `item`을 `key`와 연관지어 저장.
        -- 기존 `key`가 있으면 덮어씀.
        require
            key_not_void: key /= Void
        local
            index: INTEGER
        do
            index := hash (key)
            -- 해시 충돌은 체이닝으로 처리
            buckets.item (index).force (item, key)
        ensure
            inserted: has (key)
            item_found: item_at (key) = item
        end
```

### 자기 문서화 코드

```eiffel
-- 주석 대신 명확한 이름 사용

-- Bad: 주석 필요
x := a * 3.14159 * r * r  -- 원의 면적

-- Good: 자기 문서화
pi: REAL = 3.14159
area_of_circle := pi * radius * radius

-- Bad: 매직 넘버
if status = 3 then  -- 완료 상태

-- Good: 상수 사용
Status_completed: INTEGER = 3
if status = Status_completed then
```

## 클래스 구조

### 표준 클래스 템플릿

```eiffel
note
    description: "클래스 설명"
    author: "Name"
    date: "$Date$"

class
    CLASS_NAME

inherit
    PARENT_CLASS
        redefine
            feature_to_redefine
        end

create
    make, make_default

feature {NONE} -- 초기화
    make (arg: TYPE)
        -- 인자로 생성
        do
            -- 초기화
        end

    make_default
        -- 기본값으로 생성
        do
            make (default_value)
        end

feature -- 접근
    -- 쿼리들

feature -- 상태 보고
    -- 불리언 쿼리들

feature -- 상태 변경
    -- 명령들

feature -- 변환
    -- to_*, as_* 피처들

feature {NONE} -- 구현
    -- 비공개 헬퍼들

feature {CLASS_NAME} -- 구현 (같은 클래스)
    -- 같은 클래스 인스턴스에만 공개

invariant
    -- 클래스 불변식

end
```

### 피처 그룹화

| 순서 | 그룹 |
|------|------|
| 1 | 초기화 (make, make_*) |
| 2 | 접근 (쿼리, 속성) |
| 3 | 상태 보고 (is_*, has_*, can_*) |
| 4 | 기본 연산 (핵심 기능) |
| 5 | 비교 (is_equal, is_less) |
| 6 | 변환 (to_*, as_*) |
| 7 | 반복 (across 지원) |
| 8 | 구현 세부 (feature {NONE}) |

| 원칙 |
|------|
| 공개 먼저, 비공개 나중 |
| 자주 쓰는 것 위쪽 |
| 관련 피처끼리 묶음 |

## 표현식 스타일

### 불리언 표현식

```eiffel
-- 명확한 불리언 반환
is_valid: BOOLEAN
    do
        Result := count > 0 and count <= max_count
    end

-- 불리언 비교 피함
-- Bad
if is_empty = True then
if is_empty = False then

-- Good
if is_empty then
if not is_empty then
```

### 조건문 스타일

```eiffel
-- 긍정 조건 우선
-- Good
if is_valid then
    process_normal
else
    handle_error
end

-- Bad (이중 부정)
if not is_invalid then
    process_normal
end

-- 중첩 최소화
-- Bad
if cond1 then
    if cond2 then
        if cond3 then
            do_something
        end
    end
end

-- Good (빠른 탈출)
if not cond1 then
    return
end
if not cond2 then
    return
end
if not cond3 then
    return
end
do_something
```

### 루프 스타일

```eiffel
-- across 선호 (현대 Eiffel)
across items as item loop
    process (item.item)
end

-- from-until은 인덱스 필요 시
from
    i := 1
until
    i > count
loop
    process (items.item (i), i)
    i := i + 1
end

-- 불변식과 변위 포함 (정확성)
from
    i := 1
invariant
    processed_count: i - 1 개가 처리됨
variant
    count - i + 1  -- 감소 보장
until
    i > count
loop
    process (items.item (i))
    i := i + 1
end
```

## 피해야 할 패턴

### 안티패턴

```eiffel
-- 1. 스파게티 조건문
-- Bad
if a then
    if b then
        if c then x
        elsif d then y
        else z end
    elsif e then w
    end
elsif f then v
end

-- 2. 매직 넘버
-- Bad
if status = 42 then
timeout := 30000

-- Good
Status_ready: INTEGER = 42
Default_timeout_ms: INTEGER = 30000

-- 3. 과도한 축약
-- Bad
calc_avg_tmp_val

-- Good
calculate_average_temperature

-- 4. 불일치
-- Bad (같은 개념, 다른 이름)
add_item
append_element
insert_entry
```

### 코드 냄새

| 경고 신호 | 해결 |
|----------|------|
| 피처가 100줄 초과 | 분해 필요 |
| 클래스가 50개 피처 초과 | 책임 분리 필요 |
| 5단계 이상 중첩 | 추출 또는 조기 반환 |
| 같은 코드 3회 이상 반복 | 추출하여 재사용 |
| 주석 없이 이해 불가 | 코드 자체를 명확히 |

## 팀 스타일 가이드

### 일관성의 가치

| 팀 스타일 가이드 원칙 |
|---------------------|
| 합의된 규칙 문서화 |
| 도구로 자동 검사 (린터) |
| 코드 리뷰에서 스타일 체크 |
| 새 멤버 온보딩에 포함 |

**"최고의 스타일"보다 "일관된 스타일"이 중요하다.** 개인 취향은 양보하고 팀 합의를 따른다.

### 자동화 도구

| 도구 | 역할 |
|------|------|
| 포매터 | 자동 레이아웃 |
| 린터 | 규칙 위반 검출 |
| IDE 설정 | 팀 공유 |

| Eiffel 도구 |
|------------|
| EiffelStudio 내장 포매터 |
| 코드 메트릭 분석 |
| 스타일 경고 |

## 자주 하는 실수

코드 스타일에서 흔히 빠지는 함정이다.

| 실수 | 증상 | 해결 |
|------|------|------|
| **일관성 없는 명명** | add, put, insert 혼용 → 학습 비용 증가 | 명명 규칙 문서화. 대칭적 이름 쌍 사용 |
| **매직 넘버** | `if status = 42` → 의미 불명 | 상수 정의. `Status_ready: INTEGER = 42` |
| **코드가 말하는 것을 주석으로** | `i := i + 1 -- i를 1 증가` → 가치 없음 | WHY를 설명. 자기 문서화 코드 추구 |
| **깊은 중첩** | 5단계 if → 읽기 어려움 | 조기 반환(guard clause). 메서드 추출 |
| **과도한 축약** | `calc_avg_tmp_val` → 이해 불가 | 완전한 단어 사용. 명확성 우선 |
| **개인 스타일 고집** | 팀 규칙 무시 → 코드베이스 불일치 | 팀 스타일 가이드 준수. 일관성이 최선보다 중요 |
| **피처 그룹화 무시** | 공개/비공개 섞임 → 탐색 어려움 | 표준 순서(초기화→접근→상태보고→연산→구현) |

## 정리

- **명명 규칙**: 클래스는 UPPER_CASE, 피처는 snake_case
- **불리언**: is_, has_, can_ 접두사
- **레이아웃**: 4칸 들여쓰기, 논리적 그룹화
- **주석**: WHY 설명, 자기 문서화 코드 추구
- **클래스 구조**: 표준 순서, 공개 먼저
- **일관성**: 팀 스타일 가이드 준수

## 다음 장 예고

Chapter 27에서는 **객체지향 분석**을 다룬다. 요구사항에서 클래스를 도출하고 시스템을 모델링하는 방법.

## 관련 항목

- [Ch 22: How to Find the Classes](/blog/programming/design/oosc/chapter22-how-to-find-the-classes) — 클래스 발견
- [Ch 23: Principles of Class Design](/blog/programming/design/oosc/chapter23-principles-of-class-design) — 설계 원칙
- [Ch 5: Towards Object Technology](/blog/programming/design/oosc/chapter05-towards-object-technology) — OO 기초
