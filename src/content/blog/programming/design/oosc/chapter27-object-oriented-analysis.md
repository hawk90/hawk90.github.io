---
title: "Ch 27: Object-Oriented Analysis"
date: 2026-05-19T03:00:00
description: "객체지향 분석 — 요구사항에서 클래스 도출, 시스템 모델링."
series: "Object-Oriented Software Construction"
seriesOrder: 27
tags: [oop, meyer, analysis, requirements, modeling]
draft: false
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> 객체지향 분석(OOA)은 요구사항에서 **핵심 추상화**를 발견하고, 그것을 **클래스**로 모델링하는 과정이다. 분석과 설계의 경계는 생각보다 유동적이다.

## 분석의 목표

### 분석이란 무엇인가

| 단계 | 초점 | 설명 |
|------|------|------|
| 분석 (Analysis) | WHAT | 문제 영역(Problem Domain) 이해, 시스템이 무엇을 해야 하는지 파악 |
| 설계 (Design) | HOW | 해결 영역(Solution Domain) 구성, WHAT을 HOW로 변환 |
| 구현 (Implementation) | 실현 | 설계를 코드로 실현, 실행 가능한 시스템 완성 |

### Meyer의 Seamless 접근

| 접근 | 흐름 |
|------|------|
| 전통적 폭포수 | 분석 → 설계 → 구현 (단절) |
| Meyer의 접근 | 분석 ↔ 설계 ↔ 구현 (연속체) |

| 핵심 아이디어 |
|-------------|
| 분석 모델 = 추상적 설계 모델 |
| 같은 언어(클래스)로 표현 |
| 경계가 아닌 추상화 수준 차이 |

## 분석 vs 설계

### 구분이 어려운 이유

| 단계 | 예 |
|------|-----|
| 분석 | "고객이 계좌에서 돈을 인출할 수 있다" → ACCOUNT 클래스, withdraw 피처 |
| 설계 | "ACCOUNT는 해시 테이블에 저장된다" → HASH_TABLE 사용 |

**문제**: ACCOUNT는 분석인가 설계인가? withdraw의 전조건은 분석인가 설계인가?

**답**: 둘 다일 수 있다. 추상화 수준의 스펙트럼에 있다.

### Meyer의 관점

**"분석과 설계를 구분하려는 시도는 종종 시간 낭비다."**

| 이유 |
|------|
| 같은 개념적 도구 (클래스) 사용 |
| 점진적 정제가 자연스러움 |
| 조기 결정이 분석에도 필요 |

| 대신 추상화 수준을 의식 | 예 |
|----------------------|-----|
| 높은 수준 | 비즈니스 개념 |
| 낮은 수준 | 구현 세부사항 |

## 분석 클래스 발견

### 문제 영역 클래스

| 분석 클래스 유형 | 예 | 특징 |
|-----------------|-----|------|
| 비즈니스 엔티티 | ACCOUNT, CUSTOMER, ORDER | 도메인 전문가가 아는 용어 |
| 개념적 관계 | LOAN, SUBSCRIPTION | 고객과 계좌의 관계 |
| 규칙과 정책 | INTEREST_CALCULATION_POLICY, WITHDRAWAL_RULE | 비즈니스 규칙 |

### 분석에서 배제할 것

| 너무 이른 결정 (분석에서 배제) |
|------------------------------|
| 데이터베이스 스키마 |
| UI 위젯 |
| 네트워크 프로토콜 |
| 알고리즘 세부 |

| 경고 신호 | 진단 |
|----------|------|
| "이 클래스는 성능 때문에 필요합니다" | 분석이 아니라 설계 |
| "사용자가 버튼을 클릭하면..." | UI 설계, 비즈니스 분석 아님 |

### 분석 클래스의 예

```eiffel
-- 은행 도메인 분석

deferred class ACCOUNT
    -- 도메인 개념: 계좌
feature
    holder: CUSTOMER
        deferred
        end

    balance: MONEY
        deferred
        end

    withdraw (amount: MONEY)
        require
            sufficient_funds: balance >= amount
            amount_positive: amount > 0
        deferred
        ensure
            balance_decreased: balance = old balance - amount
        end

    deposit (amount: MONEY)
        require
            amount_positive: amount > 0
        deferred
        ensure
            balance_increased: balance = old balance + amount
        end

invariant
    has_holder: holder /= Void
end
```

## 요구사항에서 클래스로

### 명사 추출법의 한계

**단순 명사 추출**: "고객이 계좌에서 돈을 인출한다" → 고객, 계좌, 돈

| 문제 |
|------|
| "돈"은 클래스인가? 속성인가? |
| "인출"은 클래스인가? 메서드인가? |
| 문서의 언어적 우연에 의존 |

**해결**: 명사 추출 + 개념적 분석

### 추상화 기준

```eiffel
-- 질문: "돈"은 클래스인가?

-- 옵션 1: 속성으로
class ACCOUNT
feature
    balance: REAL  -- 돈을 실수로
end

-- 옵션 2: 클래스로
class MONEY
feature
    amount: REAL
    currency: CURRENCY

    plus (other: MONEY): MONEY
        require
            same_currency: currency = other.currency
        do
            create Result.make (amount + other.amount, currency)
        end
end

class ACCOUNT
feature
    balance: MONEY  -- 돈을 객체로
end

-- 선택 기준:
-- 연산이 있는가? 불변식이 있는가?
-- 여러 곳에서 재사용되는가?
-- 도메인에서 독립적 개념인가?
```

### 행위 중심 발견

**유스케이스 UC-1: 고객이 돈을 인출한다**

| 단계 | 행위 |
|------|------|
| 1 | 고객이 카드를 넣는다 |
| 2 | PIN을 입력한다 |
| 3 | 금액을 선택한다 |
| 4 | 시스템이 잔고를 확인한다 |
| 5 | 현금이 나온다 |

| 클래스 후보 | 역할 |
|------------|------|
| CUSTOMER | 행위자 |
| CARD | 식별 |
| ACCOUNT | 잔고 확인 |
| TRANSACTION | 기록 |
| CASH_DISPENSER | 현금 출력 (설계 영역?) |

## 관계 모델링

### 연관 (Association)

```eiffel
-- 고객은 여러 계좌를 가질 수 있다
class CUSTOMER
feature
    accounts: LIST [ACCOUNT]
end

-- 계좌는 한 고객에게 속한다
class ACCOUNT
feature
    holder: CUSTOMER
end
```

### 상속 관계

| 분석에서 상속 |
|--------------|
| 개념적 분류 |
| is-a 관계 |
| 전문화/일반화 |

```text
ACCOUNT
├── CHECKING_ACCOUNT
├── SAVINGS_ACCOUNT
└── INVESTMENT_ACCOUNT
```

**주의**: 구현 편의를 위한 상속은 분석이 아니다.

```eiffel
deferred class ACCOUNT
feature
    withdraw (amount: MONEY)
        deferred
        end
end

class SAVINGS_ACCOUNT
inherit
    ACCOUNT

feature
    interest_rate: REAL

    withdraw (amount: MONEY)
        -- 인출 제한 있을 수 있음
        do
            -- 구현
        end
end
```

### 집합 (Aggregation)

| 전체-부분 관계 예 |
|-----------------|
| COMPANY has DEPARTMENT |
| ORDER has ORDER_LINE |
| DOCUMENT has PARAGRAPH |

| 유형 | 설명 |
|------|------|
| 합성 | 부분이 전체 없이 존재 불가 |
| 집합 | 부분이 독립적으로 존재 가능 |

```eiffel
class ORDER
feature
    lines: LIST [ORDER_LINE]
        -- ORDER 없이 ORDER_LINE 무의미 (합성)

    customer: CUSTOMER
        -- CUSTOMER는 ORDER 없이도 존재 (연관)
end
```

## 계약 기반 분석

### 전조건과 후조건

```eiffel
-- 분석 단계에서도 계약 명시

class LIBRARY
feature
    borrow_book (member: MEMBER; book: BOOK)
        -- 회원이 책을 대출
        require
            -- 비즈니스 규칙을 전조건으로
            member_valid: member.is_registered
            book_available: book.is_available
            member_can_borrow: member.current_loans < member.loan_limit
        do
            -- 상세 구현은 설계에서
        ensure
            book_borrowed: not book.is_available
            member_has_book: member.borrowed_books.has (book)
        end
end
```

### 불변식으로 비즈니스 규칙

```eiffel
class ACCOUNT
feature
    balance: MONEY
    credit_limit: MONEY
    holder: CUSTOMER

invariant
    -- 도메인 규칙을 불변식으로 포착
    balance_within_limit: balance >= -credit_limit
    has_holder: holder /= Void
    holder_owns_this: holder.accounts.has (Current)
end
```

### 규칙의 발견

| 비즈니스 규칙 | 계약으로 변환 |
|-------------|-------------|
| "잔고가 0 미만이면 인출 불가" | withdraw 전조건: `balance >= amount` |
| "인출 후 잔고는 신용한도 이상" | ACCOUNT 불변식: `balance >= -credit_limit` |
| "한 회원은 최대 5권까지 대출" | borrow_book 전조건: `loans < 5`, MEMBER 불변식: `current_loans <= max_loans` |

## 분석 문서화

### 클래스 명세

**클래스 ACCOUNT**

| 항목 | 내용 |
|------|------|
| 목적 | 금융 거래의 기록과 잔고를 관리하는 추상화 |
| 속성 | holder (CUSTOMER), balance (MONEY), transactions (LIST [TRANSACTION]) |
| 연산 | withdraw, deposit, transfer |
| 불변식 | 항상 소유자가 있음, 잔고가 신용한도 이상 |

| 관계 | 다중성 | 설명 |
|------|-------|------|
| CUSTOMER | 1:n | 한 고객이 여러 계좌 |
| TRANSACTION | 1:n | 계좌당 여러 거래 |

### Short Form 활용

```eiffel
-- Eiffel의 Short Form: 구현 없이 인터페이스만

class interface ACCOUNT
feature
    holder: CUSTOMER
    balance: MONEY

    withdraw (amount: MONEY)
        require
            sufficient_funds: balance >= amount
        ensure
            balance_decreased: balance = old balance - amount

    deposit (amount: MONEY)
        require
            positive: amount > 0
        ensure
            balance_increased: balance = old balance + amount

invariant
    has_holder: holder /= Void
end
```

## 분석의 검증

### 완전성 검사

| 완전성 검사 체크리스트 |
|---------------------|
| □ 모든 비즈니스 엔티티가 클래스로 있는가? |
| □ 모든 비즈니스 규칙이 계약으로 있는가? |
| □ 모든 유스케이스를 지원하는가? |
| □ 도메인 전문가가 이해할 수 있는가? |

### 일관성 검사

| 일관성 검사 체크리스트 |
|---------------------|
| □ 클래스 간 책임이 중복되지 않는가? |
| □ 계약이 서로 모순되지 않는가? |
| □ 상속 관계가 의미론적으로 올바른가? |
| □ 용어가 일관되게 사용되는가? |

### 도메인 전문가 검토

**분석의 최종 검증자: 도메인 전문가**

| 검토 방법 |
|---------|
| Short Form을 보여줌 (코드 없이 계약만) |
| "이것이 맞습니까?" 확인 |
| 누락된 규칙 발견 |
| 잘못된 가정 수정 |

| 효과 |
|------|
| 요구사항 오해 조기 발견 |
| 비즈니스 규칙 누락 방지 |
| 공통 어휘 확립 |

## 분석에서 설계로

### 점진적 전환

| 분석 → 설계 전환 | 활동 |
|-----------------|------|
| deferred를 effected로 | 추상 클래스에 구현 추가, 또는 구체 하위 클래스 생성 |
| 설계 결정 추가 | 데이터 구조 선택, 알고리즘 선택, 의존성 주입 방식 |
| 기술 클래스 도입 | DATABASE_CONNECTION, UI_CONTROLLER, NETWORK_ADAPTER |

### Seamless의 이점

| 접근 | 흐름 | 문제 |
|------|------|------|
| 전통적 | 분석 모델 (UML) → 설계 모델 (UML) → 코드 | 각 전환마다 정보 손실 |
| Seamless | 분석 클래스 (Eiffel) → 설계/구현 클래스 (Eiffel) | 같은 형식, 점진적 정제 |

| Seamless의 이점 |
|---------------|
| 추적성 (분석 ↔ 코드) |
| 일관성 유지 |
| 문서가 코드와 동기화 |

## 정리

- **분석 목표**: 문제 영역의 핵심 추상화 발견
- **Seamless**: 분석과 설계의 연속성, 같은 언어 사용
- **클래스 발견**: 명사 추출 + 개념적 분석 + 행위 분석
- **계약 기반**: 비즈니스 규칙을 전조건/후조건/불변식으로
- **검증**: 도메인 전문가가 Short Form 검토
- **전환**: 분석에서 설계로 점진적 정제

## 다음 장 예고

Chapter 28에서는 **소프트웨어 구축 프로세스**를 다룬다. 클러스터 모델, 반복적 개발, 팀 조직.

## 관련 항목

- [Ch 22: How to Find the Classes](/blog/programming/design/oosc/chapter22-how-to-find-the-classes) — 클래스 발견
- [Ch 11: Design by Contract](/blog/programming/design/oosc/chapter11-design-by-contract) — 계약
- [Ch 19: On Methodology](/blog/programming/design/oosc/chapter19-on-methodology) — 방법론
