---
title: "Ch 29: Teaching the Method"
date: 2026-05-19T05:00:00
description: "방법론 교육 — 객체지향을 어떻게 가르칠 것인가."
series: "Object-Oriented Software Construction"
seriesOrder: 29
tags: [oop, meyer, teaching, education, curriculum]
draft: false
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> 객체지향을 가르치려면 **처음부터 올바르게** 가르쳐야 한다. 절차적 사고의 나쁜 습관이 들기 전에 객체적 사고를 심어줘야 한다.

## 교육의 중요성

### 왜 교육이 중요한가

| 객체지향의 성패 |
|--------------|
| 기술 자체보다 사람이 결정 |
| 잘못 배우면 잘못 사용 |
| 나쁜 습관은 바꾸기 어려움 |

| 현실 |
|------|
| 많은 "OO" 코드가 절차적 |
| 상속 남용, getter/setter 범람 |
| 계약 없이 방어적 코딩 |
| 클래스 = 함수 모음으로 오해 |

### Meyer의 교육 철학

| 핵심 원칙 | 설명 |
|---------|------|
| 처음부터 올바르게 (Start Right) | 나중에 고치기보다 처음부터 제대로, "언러닝"은 학습보다 어렵다 |
| 추상화 먼저 (Abstraction First) | 구현 세부 전에 개념, HOW 전에 WHAT |
| 계약 중심 (Contract-Centered) | 계약이 설계의 핵심, 테스트보다 명세 먼저 |
| 재사용 강조 (Reuse Emphasis) | 라이브러리 활용, 바퀴 재발명 피함 |

## "절차 먼저" 접근의 문제

### 전통적 커리큘럼

| 일반적 순서 (문제 있음) |
|---------------------|
| 1. 변수와 타입 |
| 2. 조건문과 반복문 |
| 3. 함수와 프로시저 |
| 4. 배열과 포인터 |
| 5. 구조체 |
| 6. "이제 객체지향을 배웁시다" |

| 문제 |
|------|
| 절차적 사고가 먼저 굳어짐 |
| 클래스를 "구조체 + 함수"로 이해 |
| 객체를 데이터 홀더로만 봄 |
| 상속을 코드 재사용으로만 봄 |

### 나쁜 습관의 예

```eiffel
-- 절차적으로 배운 사람의 OO 코드

class DATA_HOLDER
feature
    x: INTEGER
    y: INTEGER

    set_x (new_x: INTEGER)
        do
            x := new_x
        end

    get_x: INTEGER
        do
            Result := x
        end

    set_y (new_y: INTEGER)
        do
            y := new_y
        end

    get_y: INTEGER
        do
            Result := y
        end
end

-- "Utility" 클래스에 함수 모음
class POINT_UTILS
feature
    distance (p1, p2: DATA_HOLDER): REAL
        do
            Result := sqrt ((p1.get_x - p2.get_x)^2 +
                           (p1.get_y - p2.get_y)^2)
        end
end
```

### 올바른 OO 코드

```eiffel
-- 객체적으로 배운 사람의 코드

class POINT
feature
    x: REAL
    y: REAL

    distance_to (other: POINT): REAL
        -- 다른 점까지의 거리
        require
            other_exists: other /= Void
        do
            Result := sqrt ((x - other.x)^2 + (y - other.y)^2)
        ensure
            non_negative: Result >= 0
            symmetric: Result = other.distance_to (Current)
        end

    translated (dx, dy: REAL): POINT
        -- 이동된 새 점
        do
            create Result.make (x + dx, y + dy)
        end

invariant
    -- 필요하다면 제약 조건
end
```

## "객체 먼저" 접근

### Objects First 커리큘럼

| 권장 순서 | 내용 |
|---------|------|
| 1. 객체와 클래스 개념 | 객체는 세상의 것을 모델링, 클래스는 객체의 청사진 |
| 2. 메시지와 피처 | 객체에게 요청을 보냄, 피처 = 서비스 |
| 3. 계약과 명세 | 전조건/후조건/불변식, 무엇을 하는지 명시 |
| 4. 상속과 다형성 | 분류와 전문화, 대체 가능성 |
| 5. 제네릭과 추상화 | 일반화된 해결책, 재사용 가능한 컴포넌트 |
| 6. 필요 시 저수준 개념 | 메모리/포인터/최적화, 필요할 때 필요한 만큼 |

### 첫 수업 예

```eiffel
-- 첫 수업: 객체와 클래스

-- "자동차를 생각해보세요"
-- 모든 자동차는 특성(색상, 속도)과 행동(가속, 정지)이 있습니다

class CAR
feature
    color: STRING
    speed: INTEGER

    accelerate (amount: INTEGER)
        -- 가속
        require
            positive: amount > 0
        do
            speed := speed + amount
        ensure
            faster: speed > old speed
        end

    stop
        -- 정지
        do
            speed := 0
        ensure
            stopped: speed = 0
        end
end

-- 이것이 클래스입니다.
-- 객체는 이 클래스의 인스턴스입니다.
-- create my_car.make로 객체를 만듭니다.
```

## 계약 중심 교육

### 계약을 일찍 가르치기

| 왜 일찍? |
|---------|
| 명세적 사고 습관 형성 |
| "방어적 코딩" 대신 "계약적 사고" |
| 책임 분담 개념 확립 |

| 언제? |
|------|
| 첫 번째 피처 작성 시부터 |
| 전조건/후조건 함께 작성 |
| 불변식은 조금 뒤에 |

| 어떻게? |
|--------|
| 모든 예제에 계약 포함 |
| 계약 없는 코드는 불완전 |
| 계약 위반 시 즉각적 피드백 |

### 계약 교육 예

```eiffel
-- 학생에게 스택을 가르칠 때

class STACK [G]
feature
    count: INTEGER
        -- 요소 개수

    capacity: INTEGER
        -- 최대 용량

    is_empty: BOOLEAN
        do
            Result := count = 0
        end

    is_full: BOOLEAN
        do
            Result := count = capacity
        end

    put (item: G)
        -- item을 스택에 추가
        require
            not_full: not is_full
        do
            -- 구현
        ensure
            added: count = old count + 1
            on_top: item_at_top = item
        end

    remove
        -- 맨 위 요소 제거
        require
            not_empty: not is_empty
        do
            -- 구현
        ensure
            removed: count = old count - 1
        end

invariant
    count_non_negative: count >= 0
    count_bounded: count <= capacity
end
```

### "if 검사" vs "계약"

```eiffel
-- 학생들이 흔히 하는 실수

-- 방어적 코딩 (잘못된 접근)
remove_defensive
    do
        if not is_empty then
            -- 제거 수행
        else
            -- 아무것도 안 함? 예외? 메시지?
        end
    end

-- 계약적 사고 (올바른 접근)
remove
    require
        not_empty: not is_empty  -- 호출자 책임
    do
        -- 제거 수행
    end

-- 학생에게 설명:
-- "is_empty 검사는 호출자의 책임입니다.
--  remove는 비어있지 않을 때만 호출됩니다.
--  이것이 '계약'입니다."
```

## 상속의 올바른 이해

### 상속의 두 관점

| 관점 | 설명 | 결과 |
|------|------|------|
| 코드 재사용 (초보자의 오해) | "중복 코드를 피하려고 상속", "공통 코드를 부모에 올림" | 잘못된 상속, 유지보수 악몽 |
| 타입 관점 (올바른 이해) | "B는 A의 특수한 종류", "B는 A 자리에 사용 가능" | LSP 준수, 의미론적 일관성 |

### 상속 교육 예

```eiffel
-- 올바른 예
class SHAPE
feature
    area: REAL
        deferred
        end
end

class CIRCLE
inherit
    SHAPE

feature
    radius: REAL

    area: REAL
        do
            Result := 3.14159 * radius * radius
        end
end

-- "CIRCLE은 SHAPE입니다"
-- "SHAPE이 필요한 곳에 CIRCLE을 쓸 수 있습니다"
```

**잘못된 예 (학생들에게 경고)**:
- `class STACK inherit ARRAY` — Stack은 Array인가? Array의 모든 연산이 Stack에 적합한가?
- `remove_at(5)`가 Stack에서 의미가 있는가?

**올바른 교육**: "상속은 '~이다' 관계입니다. Stack은 Array가 아닙니다. Stack은 Array를 '사용'할 수 있습니다 (조합)."

## 라이브러리 활용

### 재사용 먼저 교육

**원칙**: "새로 만들기 전에 있는 것을 찾아라"

| 방법 |
|------|
| 표준 라이브러리 소개 |
| 라이브러리 탐색 훈련 |
| 라이브러리 사용 예제 풍부히 |
| 필요할 때만 구현 |

| 효과 |
|------|
| 바퀴 재발명 방지 |
| 품질 높은 코드 사용 |
| 추상화 수준 유지 |
| 생산성 향상 |

### 라이브러리 활용 예

```eiffel
-- 학생 과제: 텍스트 처리

-- 잘못된 접근: 모든 것을 직접 구현
class MY_STRING
feature
    -- 문자열 구현을 처음부터...
end

-- 올바른 접근: 라이브러리 활용
class TEXT_PROCESSOR
feature
    process (input: STRING)
        local
            words: LIST [STRING]
            sorted: SORTED_LIST [STRING]
        do
            words := input.split (' ')

            create sorted.make_from_iterable (words)
            -- 이미 있는 것을 사용

            across sorted as word loop
                print (word.item)
            end
        end
end
```

## 실습 설계

### 프로젝트 기반 학습

| 좋은 프로젝트 특성 | 설명 |
|-----------------|------|
| 실제적 문제 | 추상적인 예제 아님, 실생활과 연결 |
| 점진적 복잡도 | 쉬운 것부터 시작, 단계별 확장 |
| 재사용 기회 | 라이브러리 활용 필수, 자신의 코드 재사용 |
| 계약 연습 | 모든 클래스에 계약, 계약 위반 디버깅 |

### 프로젝트 예

**도서관 시스템 프로젝트 예**

| 주차 | 주제 | 내용 |
|------|------|------|
| 1주차 | 핵심 클래스 | BOOK, MEMBER, LIBRARY, 기본 피처와 계약 |
| 2주차 | 관계 | LOAN (대출 관계), 연관/집합 개념 |
| 3주차 | 상속 | BOOK 하위 타입 (FICTION, REFERENCE), 다형성 활용 |
| 4주차 | 제네릭 | COLLECTION [G], 타입 안전 컬렉션 |
| 5주차 | 통합 | 전체 시스템 조립, 시스템 테스트 |

## 평가 방법

### 평가 기준

| 코드 평가 항목 |
|-------------|
| □ 계약이 있는가? (전조건, 후조건, 불변식) |
| □ 상속이 의미론적으로 올바른가? |
| □ 적절한 캡슐화인가? |
| □ 라이브러리를 활용했는가? |
| □ 스타일 규칙을 따랐는가? |
| □ 코드가 자기 문서화되는가? |

| 비기술적 평가 |
|------------|
| □ 설계 결정을 설명할 수 있는가? |
| □ 대안을 고려했는가? |
| □ 트레이드오프를 이해하는가? |

### 반패턴 감지

| 경고 신호 (학생 코드에서) |
|----------------------|
| getter/setter만 있는 클래스 |
| "Utils", "Helper", "Manager" 클래스 |
| 계약 없는 피처 |
| 깊은 상속 계층 |
| 순환 의존성 |
| 중복 코드 |

| 피드백 방법 |
|----------|
| 왜 문제인지 설명 |
| 올바른 대안 제시 |
| 리팩터링 연습 |

## 교육 환경

### 도구 선택

| 초보자용 환경 요구 |
|----------------|
| 빠른 피드백 |
| 명확한 오류 메시지 |
| 계약 지원 |
| 디버깅 용이 |

| 권장 |
|------|
| EiffelStudio (계약 네이티브 지원) |
| 또는 계약 라이브러리 있는 언어 |
| 단순한 UI의 IDE |

### 학습 자료

| 효과적인 자료 | 설명 |
|------------|------|
| 동작하는 예제 코드 | 추상적 설명보다 구체적 코드, 복사해서 실행 가능 |
| 점진적 예제 | 간단 → 복잡, 이전 예제 확장 |
| 잘못된 예제 + 교정 | "이것은 왜 나쁜가?", "이렇게 고쳐야 한다" |
| 연습 문제 | 난이도별, 해답과 설명 포함 |

## 교사를 위한 조언

### 일반 원칙

| 원칙 | 설명 |
|------|------|
| 인내 | 패러다임 전환은 시간이 걸림, 같은 것을 여러 번 설명 |
| 일관성 | 항상 계약 작성, 예외 없이 규칙 적용 |
| 실제 예제 | 인위적인 예제 피함, 실무에서 유래한 문제 |
| 왜를 설명 | 규칙의 이유 설명, 위반 시 결과 보여줌 |

### 흔한 오해 교정

| 흔한 오해 | 올바른 이해 |
|---------|----------|
| "클래스는 함수를 모아놓은 것" | "클래스는 ADT, 데이터와 연산의 결합" |
| "상속은 코드 재사용" | "상속은 타입 관계, is-a" |
| "계약은 테스트 같은 것" | "계약은 명세, 설계의 일부" |
| "private은 캡슐화" | "캡슐화는 추상화, 정보 은닉" |

## 자주 하는 실수

객체지향 교육에서 흔히 빠지는 함정이다.

| 실수 | 증상 | 해결 |
|------|------|------|
| **절차 먼저 가르침** | 클래스를 "구조체 + 함수"로 이해 → 절차적 사고가 굳어짐 | Objects First. 객체와 클래스부터 시작 |
| **상속을 코드 재사용으로** | is-a 관계 없이 상속 → Stack inherit Array 같은 설계 | 상속 = 타입 관계. is-a 테스트, LSP 강조 |
| **계약을 테스트로 오해** | 계약 없이 방어적 코딩 → if 검사 남발, 책임 불분명 | 계약 중심 교육. 첫 피처부터 require/ensure 작성 |
| **getter/setter 클래스** | 데이터 홀더 + Utils 클래스 → ADT 개념 부재 | 행위 중심 설계. 객체에게 무엇을 요청하는가 강조 |
| **라이브러리 활용 안 함** | 모든 것을 직접 구현 → 바퀴 재발명, 낮은 품질 | 재사용 먼저. 표준 라이브러리 탐색 훈련 |
| **추상적 예제만 사용** | Foo/Bar 예제 → 실무와의 괴리, 동기 부여 실패 | 실제적 문제. 도서관, 은행 같은 도메인 프로젝트 |
| **왜를 설명 안 함** | 규칙만 제시, 이유 생략 → 규칙 위반 시 대처 못함 | 근거 설명. 위반 시 결과 보여줌, 트레이드오프 토론 |

## 정리

- **처음부터 올바르게**: 절차적 습관 들기 전에 OO 사고
- **Objects First**: 객체와 클래스부터 시작
- **계약 중심**: 첫 피처부터 계약 작성
- **상속 = 타입 관계**: 코드 재사용이 아님
- **라이브러리 활용**: 재사용 먼저, 구현 나중
- **실습 중심**: 프로젝트 기반 학습

## 다음 장 예고

Chapter 30에서는 **동시성과 분산**을 다룬다. OO에서의 동시성, SCOOP 모델, 클라이언트-서버 아키텍처.

## 관련 항목

- [Ch 5: Towards Object Technology](/blog/programming/design/oosc/chapter05-towards-object-technology) — OO 기초
- [Ch 11: Design by Contract](/blog/programming/design/oosc/chapter11-design-by-contract) — 계약
- [Ch 24: Using Inheritance Well](/blog/programming/design/oosc/chapter24-using-inheritance-well) — 상속
