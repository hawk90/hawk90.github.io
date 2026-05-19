---
title: "Ch 15: Multiple Inheritance"
date: 2026-05-19T15:00:00
description: "다중 상속 — 필요성, 다이아몬드 문제, 이름 충돌 해결."
series: "Object-Oriented Software Construction"
seriesOrder: 15
tags: [oop, meyer, multiple-inheritance, diamond-problem, renaming]
draft: false
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> **다중 상속**은 클래스가 여러 부모를 가지는 것이다. 다이아몬드 문제와 이름 충돌은 **이름 변경**과 **선택**으로 해결한다.

## 다중 상속의 필요성

현실 세계의 많은 개념은 여러 범주에 동시에 속한다.

| 클래스 | 부모 1 | 부모 2 |
|--------|--------|--------|
| TEACHING_ASSISTANT | STUDENT | EMPLOYEE |
| AMPHIBIOUS_VEHICLE | LAND_VEHICLE | WATER_VEHICLE |
| WINDOW | RECTANGLE | TREE_NODE |

단일 상속으로는 이런 관계를 자연스럽게 표현하기 어렵다.

## Eiffel의 다중 상속

```eiffel
class TEACHING_ASSISTANT
inherit
    STUDENT
    EMPLOYEE

feature
    -- TA 고유 피처
    hours_per_week: INTEGER

    assist_professor (course: COURSE)
        do
            ...
        end
end
```

`TEACHING_ASSISTANT`는 `STUDENT`와 `EMPLOYEE` 모두의 피처를 상속받는다.

## 다이아몬드 문제

![다이아몬드 상속](/images/blog/oosc/diagrams/ch02-diamond.svg)

`PERSON`의 피처가 **두 경로**로 상속된다. `name`이 `PERSON`에 있다면 TEACHING_ASSISTANT는 name을 몇 개 가지는가?

### Eiffel의 해결: 공유와 복제

```eiffel
class TEACHING_ASSISTANT
inherit
    STUDENT
        -- PERSON의 피처를 그대로 상속

    EMPLOYEE
        -- PERSON의 같은 피처를 공유

feature
    ...
end
```

기본적으로 **공유**(sharing): `name`은 하나만 존재.

**복제**(replication)가 필요하면 명시적으로 지정:

```eiffel
class TEACHING_ASSISTANT
inherit
    STUDENT
        rename
            name as student_name
        end

    EMPLOYEE
        rename
            name as employee_name
        end

feature
    ...
end
```

이제 `student_name`과 `employee_name` 두 개가 존재.

## 이름 충돌 해결

두 부모가 **같은 이름**의 다른 피처를 가질 때:

```eiffel
class STUDENT
feature
    id: INTEGER  -- 학번
end

class EMPLOYEE
feature
    id: INTEGER  -- 사번
end

class TEACHING_ASSISTANT
inherit
    STUDENT
        rename
            id as student_id
        end

    EMPLOYEE
        rename
            id as employee_id
        end

feature
    print_ids
        do
            print ("Student ID: " + student_id.out)
            print ("Employee ID: " + employee_id.out)
        end
end
```

### rename 절

이름을 바꿔 충돌 해결:

```eiffel
inherit
    PARENT
        rename
            feature_a as new_name_a,
            feature_b as new_name_b
        end
```

## 피처 선택(Select)

다형적 호출 시 어떤 버전을 사용할지 지정:

```eiffel
class PERSON
feature
    description: STRING
        do
            Result := "Person"
        end
end

class STUDENT
inherit
    PERSON
        redefine
            description
        end
feature
    description: STRING
        do
            Result := "Student"
        end
end

class EMPLOYEE
inherit
    PERSON
        redefine
            description
        end
feature
    description: STRING
        do
            Result := "Employee"
        end
end

class TEACHING_ASSISTANT
inherit
    STUDENT
        select
            description  -- 다형적 호출 시 STUDENT 버전 사용
        end

    EMPLOYEE

feature
    ...
end
```

```eiffel
local
    p: PERSON
    ta: TEACHING_ASSISTANT
do
    create ta
    p := ta
    print (p.description)  -- "Student" (select에 의해)
end
```

## 피처 적응(Feature Adaptation)

상속 시 피처를 여러 방식으로 조정:

### 1. rename (이름 변경)

```eiffel
inherit
    PARENT
        rename
            old_name as new_name
        end
```

### 2. export (가시성 변경)

```eiffel
inherit
    PARENT
        export
            {NONE} secret_feature  -- 비공개로
            {ANY} hidden_feature   -- 공개로
        end
```

### 3. undefine (추상화)

```eiffel
inherit
    PARENT
        undefine
            concrete_feature  -- 추상 피처로
        end
```

### 4. redefine (재정의)

```eiffel
inherit
    PARENT
        redefine
            some_feature
        end
```

### 5. select (선택)

```eiffel
inherit
    PARENT
        select
            version_to_use  -- 다형적 호출 시 이 버전
        end
```

## 복합 적응 예

```eiffel
class MANAGER
inherit
    EMPLOYEE
        rename
            department as managed_department
        redefine
            salary_calculation
        export
            {HR_SYSTEM} confidential_info
        select
            salary_calculation
        end

    PERSON
        rename
            name as full_name
        end

feature
    salary_calculation: INTEGER
        do
            Result := base_salary + bonus
        end

    team: LIST [EMPLOYEE]
end
```

## 반복 상속(Repeated Inheritance)

같은 조상(COMPARABLE)이 STUDENT과 EMPLOYEE 두 경로를 통해 TEACHING_ASSISTANT로 상속되는 경우다.

### 공유 vs 복제

```eiffel
-- 기본: 공유
-- COMPARABLE의 is_less는 하나만 존재

class TEACHING_ASSISTANT
inherit
    STUDENT
    EMPLOYEE
feature
    is_less (other: TEACHING_ASSISTANT): BOOLEAN
        -- 하나의 is_less만 있음
        do
            ...
        end
end
```

```eiffel
-- 복제 원하면:
class TEACHING_ASSISTANT
inherit
    STUDENT
        rename
            is_less as student_less
        end

    EMPLOYEE
        rename
            is_less as employee_less
        end

feature
    student_less, employee_less  -- 두 개 존재
end
```

## 다중 상속 사용 지침

### 적절한 경우

| 경우 | 예 |
|------|-----|
| **진정한 다중 분류** | TEACHING_ASSISTANT: STUDENT이면서 EMPLOYEE |
| **믹스인 스타일** | PRINTABLE, STORABLE, COMPARABLE 등 기능 조합 |
| **인터페이스 구현** | 여러 deferred class 구현 |

### 주의할 경우

| 상황 | 해결책 |
|------|--------|
| **우연한 이름 충돌** | rename으로 해결 |
| **복잡한 다이아몬드** | 설계 재검토 권장 |
| **상속 대신 위임** | "has-a"가 자연스러우면 위임 사용 |

## 다른 언어와 비교

| 언어 | 다중 상속 |
|------|----------|
| **Eiffel** | 완전 지원, 이름 충돌 해결 메커니즘 |
| **C++** | 지원, 가상 상속으로 다이아몬드 해결 |
| **Java** | 불가, 인터페이스로 대체 |
| **Python** | 지원, MRO(Method Resolution Order) |
| **Ruby** | 불가, 믹스인으로 대체 |

### Java의 인터페이스

```java
interface Student {
    void study();
}

interface Employee {
    void work();
}

class TeachingAssistant implements Student, Employee {
    public void study() { ... }
    public void work() { ... }
}
```

상태(속성)는 상속 불가. 행위(메서드)만 다중 구현.

## 자주 하는 실수

다중 상속 사용 시 흔히 빠지는 함정이다.

| 실수 | 증상 | 해결 |
|------|------|------|
| **이름 충돌 방치** | 두 부모에 같은 이름 피처 → 컴파일 오류 | rename으로 이름 변경. 충돌 명시적 해결 |
| **다이아몬드 문제 무시** | 공유/복제 결정 안 함 → 예기치 않은 동작 | 의도적으로 공유(기본) 또는 rename으로 복제 |
| **select 누락** | 다형적 호출 시 어떤 버전인지 모호 → 컴파일 오류 | select로 다형적 버전 명시 |
| **과도한 다중 상속** | 5개 이상 부모 → 복잡성 폭발 | 꼭 필요한 경우만. 믹스인 스타일 권장 |
| **has-a를 is-a로** | "WINDOW is RECTANGLE"보다 "has position, size" | 진정한 다중 분류만 상속. 나머지는 위임 |
| **피처 적응 순서 오류** | rename, redefine 등 순서 잘못 → 컴파일 오류 | rename → export → undefine → redefine → select 순서 |
| **반복 상속 혼란** | 조상이 여러 경로로 와서 혼란 → 버그 | 상속 계층 시각화. 공유/복제 명확히 |

## 정리

- **다중 상속**: 여러 부모 클래스 상속
- **다이아몬드 문제**: 조상이 여러 경로로 도달
- **rename**: 이름 충돌 해결
- **select**: 다형적 버전 선택
- **공유 vs 복제**: 반복 상속된 피처 처리
- **피처 적응**: rename, export, undefine, redefine, select

## 다음 장 예고

Chapter 16에서는 **상속과 단언**을 다룬다. 리스코프 치환 원칙, 계약이 상속에서 어떻게 작동하는가.

## 관련 항목

- [Ch 14: Introduction to Inheritance](/blog/programming/design/oosc/chapter14-introduction-to-inheritance) — 상속 기초
- [Ch 16: Inheritance and Assertions](/blog/programming/design/oosc/chapter16-inheritance-and-assertions) — 계약과 상속
- [Ch 2: Criteria of Object Orientation](/blog/programming/design/oosc/chapter02-criteria-of-object-orientation) — 다중 상속 기준
