---
title: "Ch 3: Modularity"
date: 2026-05-19T03:00:00
description: "모듈성의 5가지 기준과 5가지 원칙 — 분해, 조합, 이해, 연속성, 보호."
series: "Object-Oriented Software Construction"
seriesOrder: 3
tags: [oop, meyer, modularity, decomposition, composition]
draft: false
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> 좋은 모듈은 5가지 기준(분해, 조합, 이해, 연속성, 보호)을 충족하고, 5가지 원칙(언어 모듈 단위, 적은 인터페이스, 작은 인터페이스, 명시적 인터페이스, 정보 은닉)을 따른다.

## 모듈의 중요성

대규모 소프트웨어를 다루는 유일한 방법은 **분할**이다. 인간의 두뇌는 한 번에 7±2개의 요소만 처리할 수 있다. 100만 줄의 코드를 한 번에 이해하는 것은 불가능하다.

**모듈**은 분할의 단위다. 그러나 아무렇게나 분할하면 안 된다. 잘못된 분할은 오히려 복잡성을 증가시킨다.

나쁜 분할에서는 모든 모듈이 서로 의존하여 수정이 전체로 퍼진다. 좋은 분할에서는 단방향 의존으로 수정 영향이 국소적이다.

![모듈 의존성 비교](/images/blog/oosc/diagrams/ch03-module-deps.svg)

## 5가지 모듈 기준

Meyer는 **좋은 모듈 구조**를 판단하는 5가지 기준을 제시한다.

### 기준 1: 모듈 분해 (Modular Decomposability)

> 문제를 덜 복잡한 하위 문제들로 분해하는 데 도움이 되는가?

분해 기준을 충족하는 방법론은 복잡한 문제를 **독립적인 부분 문제**로 나눌 수 있어야 한다.

예를 들어 급여 시스템을 구축한다고 하자.

| 분해 방식 | 구조 | 문제점 |
|----------|------|--------|
| 나쁜 분해 | 입력 처리, 계산, 출력 파일로 나눔 | 기능 횡단, 변경 시 여러 파일 수정 |
| 좋은 분해 | Employee, Payroll, TaxCalculator, Report, Database | 각 모듈이 독립적인 책임 |

**하향식 설계(Top-down design)**는 분해 기준의 전형적인 예다. 그러나 하향식만으로는 부족하다.

### 기준 2: 모듈 조합 (Modular Composability)

> 기존 모듈을 새로운 환경에서 자유롭게 조합할 수 있는가?

조합 기준은 **재사용성**과 직결된다. 모듈이 원래 개발된 맥락과 다른 맥락에서도 사용될 수 있어야 한다.

| 설계 | 특징 | 재사용성 |
|------|------|----------|
| 조합 불가 | 국가=한국 고정, 연도=2024 고정 | 다른 국가·연도에 사용 불가 |
| 조합 가능 | 국가·연도·세율표가 매개변수/주입 | 어떤 맥락에서도 재사용 가능 |

분해와 조합은 **반대 방향**이다:

| 기준 | 방향 | 목표 |
|------|------|------|
| 분해 | 문제 → 모듈 | 복잡성 관리 |
| 조합 | 모듈 → 시스템 | 재사용성 |

둘 다 충족해야 좋은 모듈이다.

### 기준 3: 모듈 이해 (Modular Understandability)

> 모듈을 다른 모듈을 읽지 않고도 이해할 수 있는가?

이해 기준은 **유지보수성**의 핵심이다. 버그를 고치려면 코드를 이해해야 한다. 하나의 모듈을 이해하기 위해 다른 10개 모듈을 읽어야 한다면 생산성이 급락한다.

```text
이해 어려움:
// OrderProcessor.java
public void process(Order order) {
    // ValidationHelper의 내부 구현 알아야 이해 가능
    if (ValidationHelper.check(order, FLAGS_A | FLAGS_B)) {
        // DatabaseManager의 상태에 따라 동작이 달라짐
        DatabaseManager.getInstance().save(order);
    }
}

이해 쉬움:
// OrderProcessor.java
public void process(Order order) {
    // 인터페이스만 알면 충분
    if (validator.isValid(order)) {
        repository.save(order);
    }
}
```

### 기준 4: 모듈 연속성 (Modular Continuity)

> 명세의 작은 변경이 모듈 구조에 작은 변경만 초래하는가?

연속성 기준은 **확장성**의 핵심이다. 요구사항 변경은 불가피하다. 작은 변경이 시스템 전체를 흔들어서는 안 된다.

| 연속성 | 세율 변경 시 |
|--------|-------------|
| 낮음 | 12개 파일 수정 필요 |
| 높음 | TaxRate.java 한 파일만 수정 |

**상수 정의**는 연속성의 대표적 예다:

```eiffel
-- 연속성 낮음: 상수가 코드에 흩어짐
fee := amount * 0.03  -- 파일 A
charge := total * 0.03  -- 파일 B
commission := price * 0.03  -- 파일 C

-- 연속성 높음: 상수를 한 곳에 정의
Transaction_fee_rate: REAL = 0.03

fee := amount * Transaction_fee_rate
charge := total * Transaction_fee_rate
commission := price * Transaction_fee_rate
```

### 기준 5: 모듈 보호 (Modular Protection)

> 한 모듈의 오류가 다른 모듈로 전파되지 않는가?

보호 기준은 **견고성**의 핵심이다. 모듈 A의 버그가 모듈 B의 crash를 유발해서는 안 된다.

| 보호 수준 | 모듈 A 파일 읽기 실패 시 |
|----------|------------------------|
| 보호 없음 | 전역 상태 오염 → 모듈 B, C, D 모두 crash |
| 보호 있음 | 예외를 모듈 A 내에서 처리 → B, C, D 영향 없음 |

## 5가지 모듈 원칙

기준을 충족하기 위한 **구체적 원칙** 5가지.

### 원칙 1: 언어 모듈 단위 (Linguistic Modular Units)

> 모듈은 프로그래밍 언어의 구문 단위와 일치해야 한다

모듈이 언어 수준에서 지원되어야 한다. 파일로만 분리하는 것은 부족하다.

| 유형 | 예시 | 컴파일러 인식 |
|------|------|--------------|
| 비언어적 모듈 | A.c + B.c | 모듈을 모름, 관례일 뿐 |
| 언어적 모듈 | `class Account {}`, `module Payment`, `package main` | 컴파일러가 모듈 인식 |

객체지향에서는 **클래스**가 언어 모듈 단위다.

### 원칙 2: 적은 인터페이스 (Few Interfaces)

> 모듈 간 통신 채널을 최소화해야 한다

모듈 A가 B, C, D, E, F, G, H와 통신하면 복잡성이 폭발한다. 통신 채널 수를 줄여야 한다.

완전 연결 그래프에서는 n개 모듈이 O(n²) 연결을 갖지만, 계층 구조에서는 O(n) 연결로 줄어든다.

![모듈 연결 비교](/images/blog/oosc/diagrams/ch03-module-deps.svg)

### 원칙 3: 작은 인터페이스 (Small Interfaces)

> 두 모듈이 통신한다면, 교환하는 정보를 최소화해야 한다

통신 채널 수뿐 아니라 **채널의 폭**도 줄여야 한다.

```eiffel
-- 넓은 인터페이스
process_order (
    customer_name: STRING;
    customer_address: STRING;
    customer_phone: STRING;
    item_id: INTEGER;
    item_quantity: INTEGER;
    item_price: REAL;
    shipping_method: INTEGER;
    payment_type: INTEGER;
    ...  -- 20개 매개변수
)

-- 좁은 인터페이스
process_order (order: ORDER)
-- ORDER 클래스가 모든 정보를 캡슐화
```

### 원칙 4: 명시적 인터페이스 (Explicit Interfaces)

> 두 모듈 간의 통신은 코드에서 명시적으로 드러나야 한다

**전역 변수**는 명시적 인터페이스 원칙의 위반이다:

```eiffel
-- 암묵적 인터페이스 (위반)
global_state: INTEGER  -- 전역 변수

class A
    set_state
        do
            global_state := 42
        end
end

class B
    check_state
        do
            if global_state > 0 then ...  -- A가 설정했는지 알 수 없음
        end
end

-- 명시적 인터페이스
class A
    get_state: INTEGER
        do
            Result := 42
        end
end

class B
    check_state (a: A)
        do
            if a.get_state > 0 then ...  -- A와의 통신이 명시적
        end
end
```

### 원칙 5: 정보 은닉 (Information Hiding)

> 모듈의 모든 정보는 비공개가 기본이어야 하고, 명시적으로 공개한 것만 외부에서 접근 가능해야 한다

Parnas의 고전적 원칙. 모듈은 **무엇을 하는지**만 공개하고 **어떻게 하는지**는 숨긴다.

```eiffel
class STACK [G]
feature {NONE}  -- private
    representation: ARRAY [G]
    count: INTEGER

feature  -- public
    push (x: G)
        do
            count := count + 1
            representation.put (x, count)
        end

    pop
        require
            not is_empty
        do
            count := count - 1
        end

    top: G
        require
            not is_empty
        do
            Result := representation.item (count)
        end

    is_empty: BOOLEAN
        do
            Result := count = 0
        end
end
```

외부에서는 `push`, `pop`, `top`, `is_empty`만 보인다. 내부 구현(배열 vs 연결 리스트)은 숨겨진다. 구현을 바꿔도 클라이언트 코드는 변경 불필요.

## 전통적 모듈화 방법의 문제

Meyer는 기존 방법론들을 5가지 기준으로 평가한다:

### 하향식 분해 (Top-Down Decomposition)

| 기준 | 평가 |
|------|------|
| 분해 | ✓ (주목적) |
| 조합 | ✗ (특정 문제에 종속) |
| 이해 | △ (의존 관계 복잡) |
| 연속성 | ✗ (상위 변경 → 하위 전체 영향) |
| 보호 | ✗ (상위 오류 → 하위 전파) |

하향식은 **분해**에만 좋고 나머지에는 취약하다.

### 데이터 흐름 설계 (Data Flow Design)

| 기준 | 평가 |
|------|------|
| 분해 | ✓ |
| 조합 | △ |
| 이해 | △ |
| 연속성 | ✗ (데이터 형식 변경 시 전파) |
| 보호 | ✗ |

### 객체지향

| 기준 | 평가 |
|------|------|
| 분해 | ✓ (클래스로 분해) |
| 조합 | ✓ (클래스 재사용) |
| 이해 | ✓ (캡슐화) |
| 연속성 | ✓ (변경 국소화) |
| 보호 | ✓ (정보 은닉) |

객체지향이 5가지 기준을 모두 충족한다. 이것이 OO를 선택해야 하는 이유다.

## 모듈 연결: Open-Closed 원칙

Meyer는 여기서 **Open-Closed Principle**을 소개한다:

> 모듈은 확장에 열려 있고, 수정에 닫혀 있어야 한다.

| 상태 | 의미 |
|------|------|
| 닫힘 (Closed) | 다른 모듈이 사용 가능, 안정된 인터페이스, 수정 불필요 |
| 열림 (Open) | 기능 확장 가능, 새 기능 추가 가능, 상속으로 확장 |

전통적 방법에서는 둘 중 하나만 가능했다. 객체지향의 **상속**은 둘 다 가능하게 한다.

![Open-Closed 원칙](/images/blog/oosc/diagrams/ch03-open-closed.svg)

```eiffel
-- ACCOUNT는 닫혀 있음 (수정 없이 사용 가능)
class ACCOUNT
feature
    balance: INTEGER
    deposit (amount: INTEGER) do balance := balance + amount end
    withdraw (amount: INTEGER) do balance := balance - amount end
end

-- ACCOUNT는 열려 있음 (상속으로 확장 가능)
class SAVINGS_ACCOUNT
inherit
    ACCOUNT
        redefine withdraw end
feature
    minimum_balance: INTEGER
    withdraw (amount: INTEGER)
        require
            balance - amount >= minimum_balance
        do
            Precursor (amount)
        end
end
```

`ACCOUNT`를 수정하지 않고 `SAVINGS_ACCOUNT`를 만들었다. Open-Closed 달성.

## 정리

- **5가지 기준**: 분해, 조합, 이해, 연속성, 보호
- **5가지 원칙**: 언어 모듈 단위, 적은 인터페이스, 작은 인터페이스, 명시적 인터페이스, 정보 은닉
- **하향식의 한계**: 분해만 좋고 나머지 취약
- **객체지향의 강점**: 5가지 기준 모두 충족
- **Open-Closed 원칙**: 확장에 열려 있고 수정에 닫혀 있음
- **클래스 = 모듈**: OO에서 모듈의 기본 단위

## 다음 장 예고

Chapter 4에서는 **재사용성**을 다룬다. 소프트웨어 재사용의 목표, 장애물, 해결책.

## 관련 항목

- [Ch 1: Software Quality](/blog/programming/design/oosc/chapter01-software-quality) — 확장성, 재사용성
- [Ch 4: Approaches to Reusability](/blog/programming/design/oosc/chapter04-approaches-to-reusability) — 재사용
- [Ch 7: The Static Structure: Classes](/blog/programming/design/oosc/chapter07-the-static-structure-classes) — 클래스 상세
- [Clean Architecture Ch 8: OCP](/blog/programming/design/clean-architecture/chapter08-ocp-the-open-closed-principle) — Open-Closed 원칙
