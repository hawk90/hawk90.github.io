---
title: "Ch 24: Using Inheritance Well"
date: 2026-05-19T00:00:00
description: "상속의 올바른 사용 — 12가지 상속 분류, 남용 방지."
series: "Object-Oriented Software Construction"
seriesOrder: 24
tags: [oop, meyer, inheritance, taxonomy, subtyping]
draft: false
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> 상속에는 **12가지 정당한 사용**이 있다. **is-a 관계**와 **코드 재사용**을 구분하고, 상속 남용을 피해야 한다.

## 상속의 두 얼굴

상속은 두 가지 목적을 동시에 제공한다:

| 목적 | 설명 |
|------|------|
| **타입 관계 (Subtyping)** | 하위 타입은 상위 타입을 대체 가능, LSP, 다형성의 기반 |
| **구현 공유 (Implementation Sharing)** | 코드 재사용, 중복 제거, 점진적 수정 |

**문제**: 두 목적이 항상 일치하지는 않는다!

## Meyer의 12가지 상속 분류

### 1. 하위 타입 상속 (Subtype Inheritance)

**정의**: B는 A의 특수한 종류다. "B is-a A"가 의미론적으로 성립.

| 예 | 특징 |
|-----|------|
| SAVINGS_ACCOUNT is-a ACCOUNT | LSP 만족 |
| CIRCLE is-a SHAPE | 다형적 사용 가능 |
| CAR is-a VEHICLE | 가장 "순수한" 상속 |

### 2. 확장 상속 (Extension Inheritance)

**정의**: 부모의 모든 것 + 새로운 피처 추가

| 특징 | 설명 |
|------|------|
| 부모 피처 수정 없음 | 기존 피처 그대로 |
| 새 피처만 추가 | `COLORED_POINT`에 `color` 추가 |
| 하위 타입 상속의 일종 | — |

### 3. 제한 상속 (Restriction Inheritance)

**정의**: 부모의 일부 피처를 제한하거나 숨김

| 특징 | 설명 |
|------|------|
| 기능 축소 | `FIXED_STACK`에서 `resize` 숨김 |
| LSP 주의 필요 | 대체 가능성 손상 위험 |
| 정사각형-직사각형 문제 관련 | 제한이 문제가 될 수 있음 |

### 4. 편의 상속 (Convenience Inheritance)

**정의**: 구현을 재사용하기 위한 상속. 의미론적 is-a가 아님.

| 특징 | 설명 |
|------|------|
| 실용적이지만 논쟁적 | `MY_DIALOG inherit WINDOW` |
| is-a 관계가 약함 | 의미론적 관계보다 코드 재사용 |
| 조합으로 대체 고려 | has-a가 더 적절할 수 있음 |

### 5. 구조 상속 (Structure Inheritance)

**정의**: 공통 구조(데이터)를 공유

| 특징 | 설명 |
|------|------|
| 데이터 레이아웃 공유 | EMPLOYEE가 PERSON의 `name`, `birth_date` 상속 |
| 보통 하위 타입 상속과 결합 | — |

### 6. 구현 상속 (Implementation Inheritance)

**정의**: 알고리즘/구현 재사용

| 특징 | 설명 |
|------|------|
| 코드 중복 제거 | SORTED_LIST가 LIST 구현 활용 |
| Precursor 활용 | 부모 메서드 호출 후 추가 동작 |

### 7. 기능 상속 (Facility Inheritance)

**정의**: 유틸리티 기능을 상속

| 특징 | 설명 |
|------|------|
| 믹스인과 유사 | MY_APPLICATION이 ARGUMENTS, MEMORY 상속 |
| 여러 기능을 조합 | 명령행 인자 + 메모리 관리 |
| 다중 상속 활용 | — |

### 8. 상수 상속 (Constant Inheritance)

**정의**: 상수 값을 상속

| 특징 | 설명 |
|------|------|
| 공유 상수 | CIRCLE이 MATH_CONSTANTS의 `Pi`, `E` 사용 |
| 일종의 기능 상속 | — |

### 9. 기계 상속 (Machine Inheritance)

**정의**: 상태 기계의 상태를 상속

| 특징 | 설명 |
|------|------|
| 상태 패턴 | STATE → IDLE_STATE, RUNNING_STATE |
| 각 상태가 클래스 | 상태 전이를 다형성으로 |

### 10. 분류 상속 (Taxonomy Inheritance)

**정의**: 분류 체계를 표현

| 특징 | 설명 |
|------|------|
| 도메인 분류 반영 | ANIMAL → MAMMAL/BIRD → DOG/CAT/EAGLE/PENGUIN |
| 지식 표현 | 분류학적 구조 |
| 실세계 모델링 | 자연계 분류 반영 |

### 11. 변형 상속 (Variation Inheritance)

**정의**: 알고리즘의 변형

| 특징 | 설명 |
|------|------|
| Strategy 패턴 | SORTER → QUICK_SORTER, MERGE_SORTER |
| 알고리즘 변형 | 같은 인터페이스, 다른 구현 |
| 템플릿 메서드 | 골격은 부모, 세부는 자식 |

### 12. 계약 상속 (Contract Inheritance)

**정의**: 계약(명세)만 상속

| 특징 | 설명 |
|------|------|
| 인터페이스 상속 | MY_NUMBER가 COMPARABLE 상속 |
| deferred class | 추상 클래스 |
| 구현 없이 계약만 | 명세만 정의 |

## 상속 사용 가이드

### 상속을 써야 할 때

| ✓ 사용 조건 | 예 |
|------------|-----|
| 진정한 is-a 관계 | SAVINGS_ACCOUNT is-a ACCOUNT |
| 하위 타입으로 대체 가능 | ACCOUNT 자리에 SAVINGS_ACCOUNT |
| 공통 계약 공유 | COMPARABLE의 is_less 계약 |
| 다형성이 필요할 때 | SHAPE 컬렉션에 다양한 도형 |

### 상속을 피해야 할 때

| ✗ 피할 조건 | 대안 |
|-----------|------|
| 단순한 코드 재사용 | 조합(Composition) 사용 |
| has-a 관계 | CAR has ENGINE (상속 X, 조합 O) |
| 역할/상태 표현 | PERSON has STUDENT_ROLE |
| 유틸리티 기능 | 조합 또는 유틸리티 클래스 |

## 상속 vs 조합

### 조합 우선 원칙

**"Favor Composition over Inheritance"**

| 이유 | 조합 | 상속 |
|------|------|------|
| 유연성 | 런타임에 구성 변경 가능 | 컴파일 타임 결정 |
| 캡슐화 | 내부 객체 숨김 가능 | 부모 구현에 결합 |
| 다중 구현 | 여러 객체 포함 가능 | 단일 상속 제한 (일부 언어) |
| 테스트 | 목 객체로 대체 용이 | 부모와 결합됨 |

### 비교 예시

```eiffel
-- 상속으로 구현 (문제 있음)
class STACK_USING_LIST
inherit
    LIST  -- LIST의 모든 것 노출됨

feature
    push (item: G)
        do
            put_last (item)
        end

    pop
        do
            remove_last
        end
end
-- 문제: remove_first, remove_at 등도 노출됨
```

```eiffel
-- 조합으로 구현 (더 나음)
class STACK_USING_LIST
feature
    push (item: G)
        do
            storage.put_last (item)
        end

    pop
        require
            not_empty: not is_empty
        do
            storage.remove_last
        end

feature {NONE}
    storage: LIST [G]
        -- 내부 구현, 외부에 숨김
end
-- 좋음: 필요한 것만 공개
```

## 상속의 남용 패턴

### 상속 남용 1: 역할을 상속으로

| 잘못된 설계 | 문제 |
|-----------|------|
| PERSON → STUDENT, EMPLOYEE | 학생이면서 직원이면? 역할 변경 시 객체 타입 변경? |

| 올바른 설계 | 장점 |
|-----------|------|
| PERSON has ROLE (STUDENT_ROLE, EMPLOYEE_ROLE) | 한 PERSON이 여러 ROLE 가능 |

### 상속 남용 2: 상태를 상속으로

| 잘못된 설계 | 문제 |
|-----------|------|
| ORDER → PENDING_ORDER, CONFIRMED_ORDER, SHIPPED_ORDER | 상태 변경 시 객체 타입 변경? 동일 주문이 다른 객체? |

| 올바른 설계 | 장점 |
|-----------|------|
| ORDER has ORDER_STATE (PENDING, CONFIRMED, SHIPPED) | ORDER의 상태 필드 변경으로 전이 |

### 상속 남용 3: 유틸리티 상속

| 잘못된 설계 | 문제 |
|-----------|------|
| MY_CLASS inherit STRING_UTILITIES, MATH_UTILITIES, IO_UTILITIES | is-a 관계 없음, 불필요한 피처 노출, 이름 충돌 위험 |

| 올바른 설계 | 방법 |
|-----------|------|
| 조합 | `string_utils: STRING_UTILITIES` |
| 정적 메서드 | `STRING_UTILITIES.format(s)` |

## 올바른 상속 설계

### is-a 테스트

| 질문 | CIRCLE/SHAPE | STACK/LIST |
|------|-------------|-----------|
| "B is-a A"가 자연스러운가? | 예 | 아니오 |
| B를 A 자리에 사용할 수 있는가? | 예 | 위험 |
| A의 모든 계약이 B에서도 유효한가? | 예 | 아니오 |

**결론**: 하나라도 "아니오"면 상속을 재고해야 한다.

### 리팩토링: 상속 → 조합

```eiffel
-- 전: 상속
class EMPLOYEE
inherit
    ADDRESS_HOLDER

feature
    name: STRING
end

-- 후: 조합
class EMPLOYEE
feature
    name: STRING
    address: ADDRESS
end

class ADDRESS_HOLDER
feature
    address: ADDRESS
end

-- 필요하면 ADDRESS_HOLDER를 인터페이스로:
class EMPLOYEE
inherit
    ADDRESS_HOLDER

feature
    address: ADDRESS
end
```

## 설계 결정 흐름

새 클래스 B와 기존 클래스 A 관계 결정:

| 질문 | 답변 | 결정 |
|------|------|------|
| B와 A가 is-a 관계인가? | 아니오 | 상속 사용하지 않음 |
| B가 A의 모든 계약을 만족하는가? | 아니오 | 상속 사용하지 않음 |
| B에서 A의 피처를 제한/숨김해야 하는가? | 예 | 상속 주의, 조합 고려 |
| A에서 코드 재사용만 원하는가? | 예 | 조합 또는 위임 |
| 다형성이 필요한가? | 예/아니오 | 상속 또는 인터페이스 / 조합 |

**최종 결정**: 위 조건 모두 만족 → 상속 OK. 그렇지 않으면 → 조합/위임

## 자주 하는 실수

상속 사용에서 흔히 빠지는 함정이다.

| 실수 | 증상 | 해결 |
|------|------|------|
| **코드 재사용만을 위한 상속** | is-a 관계 없이 상속 → 불필요한 피처 노출 | 조합 우선. has-a면 포함으로 |
| **역할을 상속으로** | PERSON → STUDENT, EMPLOYEE → 동시 역할 불가 | 역할 패턴. PERSON has ROLE |
| **상태를 상속으로** | ORDER → PENDING_ORDER → 상태 변경 시 객체 변경 | 상태 패턴. ORDER has STATE |
| **제한 상속 남용** | 부모 피처 숨김/제한 → LSP 위반 위험 | 조합으로 대체. 필요한 것만 위임 |
| **유틸리티 상속** | MATH_UTILS, STRING_UTILS 상속 → 이름 충돌, 불필요 노출 | 조합 또는 정적 호출 |
| **is-a 테스트 무시** | "B가 A 자리에 대체 가능한가?" 미검증 → LSP 위반 | is-a·계약 테스트 후 상속 결정 |
| **깊은 상속 계층** | 5단계 이상 → 이해·유지보수 어려움 | 상속 깊이 제한. 조합·위임 활용 |

## 정리

- **12가지 상속**: 하위타입, 확장, 제한, 편의, 구조, 구현, 기능, 상수, 기계, 분류, 변형, 계약
- **상속 기준**: is-a 관계, LSP 만족, 다형성 필요
- **조합 우선**: 단순 재사용, has-a 관계, 유연성 필요 시
- **남용 패턴**: 역할/상태를 상속으로, 유틸리티 상속
- **설계 결정**: is-a 테스트, 계약 검증, 조합 대안 고려

## 다음 장 예고

Chapter 25에서는 **유용한 기법들**을 다룬다. 실전에서 자주 쓰이는 OO 기법과 패턴.

## 관련 항목

- [Ch 14: Introduction to Inheritance](/blog/programming/design/oosc/chapter14-introduction-to-inheritance) — 상속 기초
- [Ch 16: Inheritance and Assertions](/blog/programming/design/oosc/chapter16-inheritance-and-assertions) — LSP
- [Ch 15: Multiple Inheritance](/blog/programming/design/oosc/chapter15-multiple-inheritance) — 다중 상속
- [Ch 23: Principles of Class Design](/blog/programming/design/oosc/chapter23-principles-of-class-design) — 클래스 설계
