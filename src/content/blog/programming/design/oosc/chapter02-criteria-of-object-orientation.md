---
title: "Ch 2: Criteria of Object Orientation"
date: 2026-05-19T02:00:00
description: "객체지향의 7가지 핵심 기준 — 무엇이 진정한 OO를 만드는가."
series: "Object-Oriented Software Construction"
seriesOrder: 2
tags: [oop, meyer, criteria, object-orientation]
draft: false
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> "객체지향"이라는 라벨은 남용된다. 진정한 OO는 7가지 핵심 기준을 충족해야 한다.

## 객체지향의 정의 문제

1990년대, "객체지향"은 마케팅 버즈워드가 되었다. 모든 언어, 도구, 방법론이 자신을 "객체지향"이라 불렀다. 그러나 실제로 무엇이 객체지향인가?

Meyer는 이 질문에 **구체적인 기준**으로 답한다. 단순히 "객체를 사용한다"는 것으로는 부족하다.

## 7가지 핵심 기준

### 기준 1: 클래스 기반 모듈 구조

> 시스템의 모듈 구조는 클래스에 기반해야 한다

객체지향 시스템에서 **클래스**는 모듈의 기본 단위다:

| 구조 | 전통적 방식 | 객체지향 |
|------|------------|---------|
| 구성 요소 | 함수, 데이터 구조, 메인 프로그램 | 클래스 A, B, C, ... |
| 핵심 단위 | 함수 + 별개의 데이터 | 클래스 (데이터 + 연산 통합) |

클래스는 **데이터 구조와 연산을 하나로 묶는다**. 이것이 모듈의 본질이다.

### 기준 2: 데이터 추상화

> 모든 타입은 추상 데이터 타입(ADT)에서 파생되어야 한다

객체지향에서 타입은 단순한 데이터 저장소가 아니다. **명세(무엇을 하는가)**와 **구현(어떻게 하는가)**이 분리된다:

```eiffel
-- ADT 명세: STACK
-- 연산: push, pop, top, is_empty
-- 공리: pop(push(s, x)) = s, top(push(s, x)) = x

class STACK [G]
feature
    push (x: G)
        -- x를 스택에 추가

    pop
        -- 최상위 요소 제거

    top: G
        -- 최상위 요소 반환

    is_empty: BOOLEAN
        -- 스택이 비었는가
end
```

ADT는 **계약**이다. 구현 세부사항은 숨기고 인터페이스만 노출한다.

### 기준 3: 자동 메모리 관리

> 사용하지 않는 객체는 자동으로 회수되어야 한다

Meyer는 **가비지 컬렉션**이 객체지향의 필수 요소라고 주장한다:

| 수동 메모리 관리 문제 | 설명 |
|--------------------|------|
| Dangling pointer | 해제된 메모리를 참조 |
| Memory leak | 해제하지 않은 메모리 누적 |
| Double free | 같은 메모리를 두 번 해제 |

가비지 컬렉션은 참조되지 않는 객체를 자동으로 회수한다. 프로그래머가 메모리 관리에서 벗어나고 안전성이 높아진다.

이 주장은 논쟁적이다. C++는 수동 메모리 관리를 쓰면서도 "객체지향"으로 분류된다. Meyer 관점에서 C++는 불완전한 OO다.

### 기준 4: 클래스

> 클래스는 타입과 모듈의 유일한 정의 메커니즘이어야 한다

객체지향 언어에서 **클래스 = 타입 = 모듈**이다:

| 역할 | 비OO | OO |
|------|------|-----|
| 타입 | struct, typedef | 클래스 |
| 모듈 | 파일, 패키지 | 클래스 |
| 연산 | 함수 | 메서드 |

객체지향에서는 클래스가 세 가지 역할을 모두 수행한다.

### 기준 5: 상속

> 클래스는 다른 클래스의 정의를 기반으로 정의될 수 있어야 한다

**상속**은 OO의 핵심 메커니즘이다:

```eiffel
class SAVINGS_ACCOUNT
inherit
    ACCOUNT
        redefine
            withdraw
        end

feature
    interest_rate: REAL

    withdraw (amount: INTEGER)
        -- 재정의: 최소 잔고 유지
        require
            amount <= balance - minimum_balance
        do
            balance := balance - amount
        end

    add_interest
        do
            balance := balance + (balance * interest_rate)
        end
end
```

상속은 두 가지 목적을 가진다:

| 목적 | 설명 | 예 |
|------|------|-----|
| **타입 확장** | 새 기능 추가 | SAVINGS_ACCOUNT에 interest_rate 추가 |
| **타입 특수화** | 기존 기능 재정의 | withdraw 조건 강화 |

### 기준 6: 다형성과 동적 바인딩

> 객체 타입은 런타임에 결정되고, 해당 타입의 연산이 호출되어야 한다

**다형성**은 같은 코드가 다른 타입에 대해 다르게 동작하는 능력이다:

```eiffel
process_accounts (accounts: LIST [ACCOUNT])
    do
        from accounts.start
        until accounts.after
        loop
            accounts.item.withdraw (100)  -- 어떤 withdraw?
            accounts.forth
        end
    end
```

`accounts.item`이 `SAVINGS_ACCOUNT`면 `SAVINGS_ACCOUNT.withdraw`가 호출되고, `CHECKING_ACCOUNT`면 `CHECKING_ACCOUNT.withdraw`가 호출된다. 이것이 **동적 바인딩**이다.

| 바인딩 | 결정 시점 | 동작 |
|--------|----------|------|
| 정적 | 컴파일 타임 | `account.withdraw()` → 항상 `Account::withdraw()` |
| 동적 | 런타임 | `account.withdraw()` → 실제 타입에 따라 `SavingsAccount::withdraw()` 또는 `CheckingAccount::withdraw()` |

### 기준 7: 다중 상속과 반복 상속

> 클래스는 여러 부모를 가질 수 있고, 조상이 반복되는 경우를 처리해야 한다

Meyer는 **다중 상속**이 필수라고 주장한다:

```eiffel
class TEACHING_ASSISTANT
inherit
    STUDENT
    EMPLOYEE
feature
    -- TA 고유 기능
end
```

많은 언어(Java, C#)는 다중 상속을 지원하지 않는다. Meyer의 관점에서 이는 OO의 표현력을 제한하는 것이다.

**다이아몬드 문제**:

![다이아몬드 상속](/images/blog/oosc/diagrams/ch02-diamond.svg)

`PERSON`의 속성이 두 경로로 상속된다. Eiffel은 **이름 충돌 해결**과 **반복 상속 지정**으로 이 문제를 처리한다:

```eiffel
class TEACHING_ASSISTANT
inherit
    STUDENT
        rename
            id as student_id
        select
            name  -- STUDENT의 name 사용
        end
    EMPLOYEE
        rename
            id as employee_id
        end
feature
    -- ...
end
```

## 부수적 기준

핵심 기준 외에 Meyer가 언급하는 부수적 특성:

| 특성 | 설명 |
|------|------|
| 정적 타이핑 | 타입 오류를 컴파일 타임에 잡음 |
| 단언(Assertions) | 계약 명시, 런타임 검사 |
| 제네릭 | 타입 매개변수화 |
| 예외 처리 | 에러 상황 구조적 처리 |

이들은 OO의 필수 조건은 아니지만, 좋은 OO 언어가 갖추어야 할 특성이다.

## 언어별 평가

Meyer의 기준으로 주요 언어를 평가하면:

| 언어 | 클래스 기반 | ADT | GC | 상속 | 다형성 | 다중 상속 |
|------|:---------:|:---:|:--:|:----:|:-----:|:--------:|
| **Eiffel** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Smalltalk** | ✓ | △ | ✓ | ✓ | ✓ | ✗ |
| **Java** | ✓ | △ | ✓ | ✓ | ✓ | △ (인터페이스) |
| **C++** | ✓ | △ | ✗ | ✓ | ✓ | ✓ |
| **C** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

Meyer의 관점에서 **Eiffel**만이 모든 기준을 충족한다. 다른 언어들은 부분적으로 OO다.

## OO가 아닌 것들

"객체지향"이라 불리지만 실제로는 아닌 것들:

### Object-Based ≠ Object-Oriented

**Object-based** 언어는 객체를 가지지만 상속이 없다:

| 특성 | Object-based | Object-oriented |
|------|-------------|-----------------|
| 예시 | Ada 83, Visual Basic (초기) | Eiffel, Smalltalk, Java |
| 캡슐화 | ✓ | ✓ |
| 상속 | ✗ | ✓ |
| 다형성 | ✗ | ✓ |

### 구조체 + 함수 ≠ 클래스

C의 구조체와 함수는 클래스가 아니다:

```c
// C: 구조체 + 함수 (OO 아님)
struct Account {
    int balance;
};

void withdraw(struct Account* acc, int amount) {
    acc->balance -= amount;
}

// 문제:
// - 데이터와 연산이 분리됨
// - 캡슐화 없음 (balance 직접 접근 가능)
// - 상속 없음
// - 다형성 없음
```

### 메시지 패싱만으로는 부족

"객체 간 메시지 패싱"은 OO의 **필요조건**이지 **충분조건**이 아니다.

## 왜 이 기준들인가

Meyer의 기준은 **품질 요소**에서 도출된다:

| 기준 | 달성하는 품질 |
|------|-------------|
| 클래스 기반 모듈 | 모듈성, 확장성 |
| ADT | 정확성, 재사용성 |
| GC | 안전성, 생산성 |
| 상속 | 재사용성, 확장성 |
| 다형성 | 확장성, 유연성 |
| 다중 상속 | 표현력, 재사용성 |

Chapter 1의 품질 요소를 달성하기 위한 **메커니즘**이 Chapter 2의 기준이다.

## 자주 하는 실수

OO 기준을 적용할 때 흔히 빠지는 함정이다.

| 실수 | 증상 | 해결 |
|------|------|------|
| **Object-based를 OO로 착각** | 캡슐화만 있고 상속·다형성 없음 | 상속과 다형성이 OO의 핵심. 없으면 불완전 |
| **구조체+함수로 OO 흉내** | C에서 `struct Account` + `withdraw(acc, amount)` | 데이터와 연산이 분리됨. 진정한 캡슐화 아님 |
| **상속 없이 복사-붙여넣기** | `SavingsAccount`에 `Account` 코드 복사 | 상속으로 공통 코드 재사용. 중복 제거 |
| **다형성 대신 타입 체크** | `if (type == SAVINGS) ... else if (type == CHECKING)` | 동적 바인딩으로 타입별 동작 분리 |
| **GC 없이 수동 메모리 관리** | dangling pointer, memory leak 빈발 | GC 언어 사용, 또는 RAII/스마트 포인터 |
| **다중 상속 회피로 표현력 상실** | `TeachingAssistant`가 `Student`만 상속 | 인터페이스 다중 구현, 또는 합성으로 보완 |

## 정리

- **7가지 핵심 기준**: 클래스 기반 모듈, ADT, GC, 클래스, 상속, 다형성/동적 바인딩, 다중 상속
- **부수적 기준**: 정적 타이핑, 단언, 제네릭, 예외 처리
- **Object-based ≠ Object-oriented**: 상속 없으면 OO 아님
- **완전한 OO 언어**: Eiffel (Meyer의 관점에서)
- **부분적 OO**: Java, C++, Smalltalk
- **기준의 목적**: 품질 요소 달성

## 다음 장 예고

Chapter 3에서는 **모듈성**을 다룬다. 좋은 모듈이란 무엇인가? 어떤 기준으로 모듈을 평가하는가?

## 관련 항목

- [Ch 1: Software Quality](/blog/programming/design/oosc/chapter01-software-quality) — 품질 요소
- [Ch 3: Modularity](/blog/programming/design/oosc/chapter03-modularity) — 모듈 기준
- [Ch 14: Introduction to Inheritance](/blog/programming/design/oosc/chapter14-introduction-to-inheritance) — 상속 상세
- [Ch 15: Multiple Inheritance](/blog/programming/design/oosc/chapter15-multiple-inheritance) — 다중 상속
