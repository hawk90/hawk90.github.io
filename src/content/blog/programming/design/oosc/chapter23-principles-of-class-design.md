---
title: "Ch 23: Principles of Class Design"
date: 2026-05-19T23:00:00
description: "클래스 설계 원칙 — 응집도, 일관성, 최소 인터페이스."
series: "Object-Oriented Software Construction"
seriesOrder: 23
tags: [oop, meyer, class-design, cohesion, interface-design]
draft: false
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> 좋은 클래스는 **응집력** 있고, **일관성** 있으며, **최소한의 인터페이스**를 가진다. 클라이언트 관점에서 설계한다.

## 클래스 설계의 목표

| 좋은 클래스의 특성 | 설명 |
|------------------|------|
| 명확한 추상화 | 하나의 개념을 표현 |
| 높은 응집도 | 관련된 것들만 모음 |
| 낮은 결합도 | 다른 클래스에 덜 의존 |
| 완전성 | 필요한 기능을 모두 제공 |
| 최소성 | 불필요한 기능 없음 |
| 일관성 | 일관된 추상화 수준 |

## 응집도 (Cohesion)

### 응집도란

**응집도(Cohesion)**: 클래스 내부 요소들이 얼마나 밀접하게 관련되어 있는가?

| 구분 | 높은 응집도 | 낮은 응집도 |
|------|-----------|-----------|
| 피처 | 모든 피처가 같은 개념에 기여 | 관련 없는 피처가 섞임 |
| 책임 | 하나의 책임에 집중 | 여러 책임이 뒤섞임 |
| 변경 | 변경 이유가 하나 | 여러 이유로 변경됨 |

### 응집도 수준

응집도 높음 → 낮음 순서:

| 수준 | 유형 | 설명 | 예 |
|------|------|------|-----|
| 1 | 기능적 응집 | 하나의 잘 정의된 기능 수행 | STACK의 push, pop, top |
| 2 | 순차적 응집 | 한 피처의 출력이 다른 피처의 입력 | PARSER의 tokenize → parse → evaluate |
| 3 | 통신적 응집 | 같은 데이터를 다루는 피처들 | EMPLOYEE의 name, salary, department |
| 4 | 절차적 응집 | 순서대로 실행되어야 하는 피처들 | FILE의 open → read → close |
| 5 | 시간적 응집 | 같은 시점에 실행되는 피처들 | 초기화 코드들 |
| 6 | 논리적 응집 | 비슷해 보이지만 다른 일을 함 | UTILITY 클래스 |
| 7 | 우연적 응집 | 관련 없는 것들의 모음 (최악) | MISC_FUNCTIONS |

### 응집도 높이기

```eiffel
-- 낮은 응집도 (나쁜 예)
class EMPLOYEE_MANAGER
feature
    -- 직원 정보
    employee_name: STRING
    employee_salary: INTEGER

    -- 부서 정보
    department_name: STRING
    department_budget: INTEGER

    -- 프린터 제어
    print_report
    configure_printer
end
```

```eiffel
-- 높은 응집도 (좋은 예)
class EMPLOYEE
feature
    name: STRING
    salary: INTEGER
    department: DEPARTMENT

    give_raise (amount: INTEGER)
        do
            salary := salary + amount
        end
end

class DEPARTMENT
feature
    name: STRING
    budget: INTEGER
    employees: LIST [EMPLOYEE]
end

class REPORT_PRINTER
feature
    print (report: REPORT)
        do
            -- 인쇄
        end
end
```

## 일관성 (Consistency)

### 추상화 수준의 일관성

**일관성 원칙**: 한 클래스의 모든 피처는 같은 추상화 수준에 있어야 한다.

| 위반 예: ACCOUNT 클래스 | 문제 |
|----------------------|------|
| `balance` | 추상적 (비즈니스) |
| `disk_sector_number` | 구현 세부 (물리적) |
| → 섞으면 안 됨! | 추상화 수준 불일치 |

### 일관된 인터페이스

```eiffel
-- 일관성 없음 (나쁜 예)
class COLLECTION
feature
    add (item: G)
        -- 추가
    remove_by_index (i: INTEGER)
        -- 인덱스로 삭제
    delete_item (item: G)
        -- 항목으로 삭제
    put_at_end (item: G)
        -- 끝에 추가
end
-- 이름이 일관되지 않음: add vs put, remove vs delete
```

```eiffel
-- 일관성 있음 (좋은 예)
class COLLECTION
feature
    put (item: G)
        -- 추가
    put_last (item: G)
        -- 끝에 추가

    remove (item: G)
        -- 항목 삭제
    remove_at (i: INTEGER)
        -- 인덱스로 삭제
end
-- 이름이 일관됨: put vs put_last, remove vs remove_at
```

### 명명 일관성

| 피처 유형 | 명명 규칙 | 예 |
|----------|----------|-----|
| 쿼리 | 명사 또는 형용사 | `balance`, `is_empty` |
| 명령 | 동사 | `deposit`, `withdraw` |
| 팩토리 | `make_`, `create_` 접두사 | `make_from_string` |
| 불리언 | `is_`, `has_`, `can_` 접두사 | `is_empty`, `has_item` |

| 일관된 예 | 비일관적 예 |
|----------|-----------|
| `is_empty`, `is_full`, `is_valid` | `is_empty`, `full`, `valid_p` |

## 최소 인터페이스

### 필요한 것만 노출

**최소 인터페이스 원칙**: 클라이언트가 필요로 하는 것만 공개하고, 그 외는 모두 숨긴다.

| 이점 | 설명 |
|------|------|
| 이해하기 쉬움 | 공개 인터페이스가 작아 학습 용이 |
| 오용 가능성 감소 | 잘못 사용할 여지가 줄어듦 |
| 변경 영향 최소화 | 내부 변경이 클라이언트에 영향 없음 |
| 캡슐화 강화 | 구현 세부사항 숨김 |

### export 절 활용

```eiffel
class ACCOUNT
feature {NONE}
    -- 완전히 비공개
    encryption_key: STRING
    internal_balance: INTEGER

feature {BANK}
    -- BANK 클래스에만 공개
    adjust_balance (amount: INTEGER)
        do
            internal_balance := internal_balance + amount
        end

feature
    -- 모두에게 공개
    balance: INTEGER
        do
            Result := internal_balance
        end

    deposit (amount: INTEGER)
        require
            positive: amount > 0
        do
            adjust_balance (amount)
        ensure
            increased: balance = old balance + amount
        end
end
```

### 인터페이스 최소화

```eiffel
-- 과도한 인터페이스 (나쁜 예)
class STACK [G]
feature
    push (item: G)
    pop
    top: G
    is_empty: BOOLEAN

    -- 정말 필요한가?
    peek_second: G
    remove_nth (n: INTEGER)
    reverse
    sort
    to_list: LIST [G]
    from_list (l: LIST [G])
end
```

```eiffel
-- 최소 인터페이스 (좋은 예)
class STACK [G]
feature
    push (item: G)
    pop
    top: G
    is_empty: BOOLEAN
    count: INTEGER
end
-- 필요하면 확장 클래스에서 추가
```

## 완전성 (Completeness)

### 충분한 기능

**완전성 원칙**: 클라이언트가 클래스의 목적을 달성하는 데 필요한 모든 연산을 제공한다.

| 문제 | 예 |
|------|-----|
| 불완전한 클래스 | LIST에 `add`는 있는데 `remove`가 없음 |
| 결과 | 클라이언트가 삭제할 방법 없음 |

| 균형 | 의미 |
|------|------|
| 완전성 ↔ 최소성 | 필요한 것은 모두, 불필요한 것은 제외 |

### 충분한 접근자

```eiffel
-- 불완전 (나쁜 예)
class RECTANGLE
feature
    width: INTEGER
    height: INTEGER

    set_dimensions (w, h: INTEGER)
        do
            width := w
            height := h
        end
    -- width만 바꾸고 싶으면?
    -- height만 바꾸고 싶으면?
end
```

```eiffel
-- 완전 (좋은 예)
class RECTANGLE
feature
    width: INTEGER
    height: INTEGER

    set_width (w: INTEGER)
        do
            width := w
        end

    set_height (h: INTEGER)
        do
            height := h
        end

    set_dimensions (w, h: INTEGER)
        do
            set_width (w)
            set_height (h)
        end
end
```

## 클라이언트 관점 설계

### 서비스 제공자로서의 클래스

| 관점 전환 | 질문 |
|----------|------|
| ❌ 공급자 관점 | "이 클래스에 무엇을 넣을까?" |
| ✓ 클라이언트 관점 | "클라이언트에게 어떤 서비스가 필요한가?" |

| 설계 시 질문 |
|-------------|
| 이 클래스의 클라이언트는 누구인가? |
| 클라이언트가 어떤 작업을 하려 하는가? |
| 어떤 계약이 클라이언트에게 유용한가? |

### 사용 시나리오 먼저

```eiffel
-- 클라이언트 코드 먼저 작성 (사용 시나리오)
local
    account: ACCOUNT
do
    create account.make ("Kim", 1000)

    if account.can_withdraw (200) then
        account.withdraw (200)
    end

    print (account.balance)
end

-- 이 시나리오를 지원하도록 클래스 설계
class ACCOUNT
feature
    make (owner_name: STRING; initial_balance: INTEGER)
    balance: INTEGER
    can_withdraw (amount: INTEGER): BOOLEAN
    withdraw (amount: INTEGER)
end
```

## 선택적 피처

### 기본값 제공

```eiffel
class ACCOUNT
feature
    make (owner_name: STRING; initial_balance: INTEGER)
        do
            name := owner_name
            balance := initial_balance
            interest_rate := default_interest_rate  -- 기본값
        end

    make_default (owner_name: STRING)
        -- 초기 잔고 0으로 생성
        do
            make (owner_name, 0)
        end

feature {NONE}
    default_interest_rate: REAL = 0.02
end
```

### 선택적 동작

```eiffel
class LOGGER
feature
    log (message: STRING)
        do
            if is_enabled then
                do_log (message)
            end
        end

    is_enabled: BOOLEAN

    enable
        do
            is_enabled := True
        end

    disable
        do
            is_enabled := False
        end

feature {NONE}
    do_log (message: STRING)
        do
            -- 실제 로깅
        end
end
```

## 설계 원칙 요약

### 단일 책임 원칙 (SRP)

**원칙**: 한 클래스는 하나의 책임만. 책임 = 변경의 이유.

| 위반 | 해결 |
|------|------|
| EMPLOYEE가 급여 계산 + 리포트 출력 | EMPLOYEE + PAYROLL_CALCULATOR + REPORT_GENERATOR로 분리 |

### 개방-폐쇄 원칙 (OCP)

**원칙**: 확장에 열림, 수정에 닫힘

| 새 기능 추가 시 | 방법 |
|---------------|------|
| ❌ 잘못됨 | 기존 코드 수정 |
| ✓ 올바름 | 새 클래스 추가 (상속으로 달성) |

### 인터페이스 분리 원칙 (ISP)

**원칙**: 클라이언트가 사용하지 않는 것에 의존하지 않게 한다.

| 위반 | 해결 |
|------|------|
| WORKER = `work()` + `eat()` + `sleep()` | WORKABLE + EATABLE + SLEEPABLE로 분리 |

## 피해야 할 패턴

### God Class

| 특징 | 설명 |
|------|------|
| 너무 많은 책임 | 모든 것을 알고 있음 |
| 너무 많은 피처 | 50개 이상 |
| 모호한 이름 | "Manager", "Handler", "Processor" |

| 문제 | 해결 |
|------|------|
| 이해하기 어려움 | 책임별로 분리 |
| 테스트 어려움 | 위임 사용 |
| 변경 시 영향 범위 큼 | 작은 클래스 여러 개로 |
| 재사용 불가 | — |

### Feature Envy

**특징**: 다른 클래스의 데이터를 자주 사용

| 잘못된 설계 | 올바른 설계 |
|-----------|-----------|
| ORDER_CALCULATOR가 ORDER의 데이터 사용 | ORDER 클래스로 로직 이동 |

```eiffel
-- 잘못됨: Feature Envy
class ORDER_CALCULATOR
    calculate_total (order: ORDER): REAL
        do
            Result := order.item_price * order.quantity
                      + order.shipping_cost - order.discount
        end

-- 올바름: 데이터를 가진 클래스에 책임
class ORDER
    total: REAL
        do
            Result := item_price * quantity
                      + shipping_cost - discount
        end
```

### Data Class

| 특징 | 문제 |
|------|------|
| 데이터만 있고 행위가 없음 | 절차적 설계 (OO 아님) |
| getter/setter만 있음 | 로직이 외부에 흩어짐 |

| 해결 |
|------|
| 관련 행위를 클래스로 이동 |
| 데이터를 사용하는 로직 찾기 |
| 적절한 메서드 추가 |

## 설계 체크리스트

| 검증 질문 |
|----------|
| 클래스 이름이 단일 개념을 나타내는가? |
| 모든 피처가 이 개념에 관련되는가? |
| 추상화 수준이 일관되는가? |
| 명명 규칙이 일관되는가? |
| 꼭 필요한 피처만 공개되는가? |
| 클라이언트에게 필요한 기능이 모두 있는가? |
| 중복된 기능이 없는가? |
| 변경 이유가 하나인가? |
| 다른 클래스의 데이터에 과도하게 의존하지 않는가? |

## 정리

- **응집도**: 관련된 것만 한 클래스에, 기능적 응집 추구
- **일관성**: 추상화 수준, 명명 규칙, 인터페이스 스타일 통일
- **최소 인터페이스**: 필요한 것만 공개, export 활용
- **완전성**: 클라이언트가 필요한 기능은 모두 제공
- **클라이언트 관점**: 서비스 제공자로 설계
- **단일 책임**: 변경 이유가 하나

## 다음 장 예고

Chapter 24에서는 **상속의 올바른 사용**을 다룬다. 12가지 상속 분류, 상속 남용 방지, is-a 관계의 올바른 해석.

## 관련 항목

- [Ch 22: How to Find the Classes](/blog/programming/design/oosc/chapter22-how-to-find-the-classes) — 클래스 발견
- [Ch 3: Modularity](/blog/programming/design/oosc/chapter03-modularity) — 모듈성 원칙
- [Ch 24: Using Inheritance Well](/blog/programming/design/oosc/chapter24-using-inheritance-well) — 상속 활용
