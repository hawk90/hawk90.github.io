---
title: "Ch 7: The Static Structure: Classes"
date: 2026-05-19T07:00:00
description: "클래스 — 객체지향의 핵심 구성 단위, 속성과 루틴."
series: "Object-Oriented Software Construction"
seriesOrder: 7
tags: [oop, meyer, class, attributes, routines]
draft: false
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> 클래스는 객체지향의 **유일한 모듈 단위**다. 데이터(속성)와 연산(루틴)을 통합하고, 정보 은닉으로 내부를 보호한다.

## 클래스의 역할

Chapter 6에서 ADT를 정의했다. 클래스는 **ADT의 프로그래밍 언어 구현**이다. Meyer는 클래스가 세 가지 역할을 동시에 수행한다고 강조한다:

| 역할 | 설명 |
|------|------|
| **모듈** | 시스템 분해의 단위 |
| **타입** | 변수가 가질 수 있는 값의 집합 |
| **구현** | ADT 명세의 실제 코드 |

| 구성 요소 | 전통적 언어 | Eiffel (OO) |
|----------|------------|-------------|
| 모듈 | 파일, 패키지 | 클래스 |
| 타입 | struct, typedef | 클래스 |
| 구현 | 함수 | 클래스 |

이 통합이 객체지향의 핵심 아이디어다.

## 클래스의 구조

Eiffel 클래스는 다음 구조를 가진다:

```eiffel
class ACCOUNT

create
    make

feature -- 초기화
    make (initial: INTEGER)
        -- 초기 잔고로 계좌 생성
        require
            non_negative: initial >= 0
        do
            balance := initial
        ensure
            balance_set: balance = initial
        end

feature -- 접근
    balance: INTEGER
        -- 현재 잔고

    owner: STRING
        -- 계좌 소유자

feature -- 상태 변경
    deposit (amount: INTEGER)
        -- 입금
        require
            positive: amount > 0
        do
            balance := balance + amount
        ensure
            increased: balance = old balance + amount
        end

    withdraw (amount: INTEGER)
        -- 출금
        require
            positive: amount > 0
            sufficient: amount <= balance
        do
            balance := balance - amount
        ensure
            decreased: balance = old balance - amount
        end

invariant
    non_negative_balance: balance >= 0

end
```

### 클래스의 구성 요소

![클래스 구조](/images/blog/oosc/diagrams/ch07-class-structure.svg)

## 피처(Feature)

**피처**는 클래스가 제공하는 서비스다. 두 종류가 있다:

### 속성(Attribute)

데이터를 저장한다:

```eiffel
class POINT
feature
    x: REAL
        -- x 좌표

    y: REAL
        -- y 좌표
end
```

속성은 **저장된 값**이다. 메모리를 차지한다.

### 루틴(Routine)

연산을 수행한다. 두 종류로 나뉜다:

```eiffel
class POINT
feature
    -- 함수(Function): 값을 반환
    distance (other: POINT): REAL
        do
            Result := sqrt ((x - other.x)^2 + (y - other.y)^2)
        end

    -- 프로시저(Procedure): 상태를 변경
    translate (dx, dy: REAL)
        do
            x := x + dx
            y := y + dy
        end
end
```

| 루틴 종류 | 반환값 | 부작용 | 예 |
|----------|--------|--------|-----|
| **함수** | 있음 | 없어야 함 | `distance`, `is_empty` |
| **프로시저** | 없음 | 있음 | `translate`, `deposit` |

### 명령-질의 분리

Meyer는 **Command-Query Separation** 원칙을 강조한다:

| 종류 | 반환 | 부작용 | 구현 | 특성 |
|------|------|--------|------|------|
| 질의 | 있음 | 없음 | 함수 | 여러 번 호출해도 결과 같음 |
| 명령 | 없음 | 있음 | 프로시저 | 호출마다 상태가 달라짐 |

**위반하면 안 되는 이유**:

```eiffel
-- 나쁜 설계: 질의가 상태를 변경
pop: G
    -- 최상위 요소를 반환하고 제거
    do
        Result := data[count]
        count := count - 1  -- 부작용!
    end

-- 문제: 같은 호출이 다른 결과
x := stack.pop  -- 첫 번째 요소
y := stack.pop  -- 두 번째 요소 (x와 다름)
```

```eiffel
-- 좋은 설계: 질의와 명령 분리
top: G
    -- 최상위 요소 반환 (상태 변경 없음)
    do
        Result := data[count]
    end

remove
    -- 최상위 요소 제거 (반환값 없음)
    do
        count := count - 1
    end
```

## 정보 은닉과 내보내기

클래스는 어떤 피처를 외부에 공개할지 결정한다.

### 내보내기 상태(Export Status)

```eiffel
class ACCOUNT
feature {NONE}  -- 비공개
    internal_id: INTEGER

feature {BANK}  -- BANK 클래스에만 공개
    audit_log: LIST [STRING]

feature  -- 모든 클라이언트에 공개 (기본)
    balance: INTEGER

    deposit (amount: INTEGER)
        do
            balance := balance + amount
            internal_id := internal_id + 1
            audit_log.extend ("Deposit: " + amount.out)
        end
end
```

| 내보내기 수준 | 의미 |
|--------------|------|
| `feature {NONE}` | 완전 비공개 |
| `feature {A}` | A에게만 공개 |
| `feature {A, B}` | A, B에게만 공개 |
| `feature {ANY}` | 모든 클래스에 공개 |
| `feature` | = `feature {ANY}` |

### 선택적 내보내기

Java나 C++의 `public`/`private`/`protected`보다 세밀한 제어가 가능하다:

```eiffel
class EMPLOYEE
feature {PAYROLL_SYSTEM}
    salary: INTEGER
        -- 급여: 급여 시스템만 접근 가능

feature {HR_SYSTEM, PAYROLL_SYSTEM}
    personal_id: STRING
        -- 개인 정보: HR과 급여 시스템만 접근 가능

feature
    name: STRING
        -- 이름: 누구나 접근 가능
end
```

## 속성과 함수의 균일 접근

Meyer의 중요한 원칙: **Uniform Access Principle**.

클라이언트는 피처가 속성인지 함수인지 알 필요가 없다:

```eiffel
class RECTANGLE
feature
    width: REAL   -- 속성 (저장됨)
    height: REAL  -- 속성 (저장됨)

    area: REAL    -- 함수? 속성?
        do
            Result := width * height
        end
end
```

클라이언트 코드:

```eiffel
r: RECTANGLE
...
print (r.width)   -- 속성 접근
print (r.height)  -- 속성 접근
print (r.area)    -- 함수 호출? 속성 접근?
                  -- 클라이언트는 모름, 알 필요 없음
```

**왜 중요한가?**

| 버전 | area 구현 | 특성 |
|------|----------|------|
| v1 | 속성 (저장) | width/height 변경 시 area도 갱신 필요 |
| v2 | 함수 (계산) | 호출할 때마다 계산 |

구현이 바뀌어도 클라이언트 코드는 변경 불필요!

## 클래스 관계

### 클라이언트 관계

한 클래스가 다른 클래스를 **사용**하는 관계:

```eiffel
class PERSON
feature
    account: ACCOUNT  -- PERSON은 ACCOUNT의 클라이언트

    deposit_salary (amount: INTEGER)
        do
            account.deposit (amount)  -- ACCOUNT 피처 사용
        end
end
```

PERSON → ACCOUNT (uses 관계)

### 상속 관계

한 클래스가 다른 클래스를 **확장**하는 관계 (Chapter 14에서 상세히):

```eiffel
class SAVINGS_ACCOUNT
inherit
    ACCOUNT

feature
    interest_rate: REAL

    add_interest
        do
            deposit ((balance * interest_rate).truncated_to_integer)
        end
end
```

SAVINGS_ACCOUNT → ACCOUNT (inherits 관계)

## 클래스 vs 객체

혼동하기 쉬운 개념을 명확히 구분한다:

| 측면 | 클래스 | 객체 |
|------|--------|------|
| **존재 시점** | 컴파일 타임 | 런타임 |
| **개수** | 시스템에 하나 | 여러 인스턴스 가능 |
| **역할** | 틀, 설계도 | 실체, 인스턴스 |
| **메모리** | 코드 영역 | 힙 영역 |

| 구분 | 예 |
|------|-----|
| 클래스 ACCOUNT (하나) | deposit, withdraw 코드, balance 선언 |
| 객체들 (여러 개) | alice_account (1000), bob_account (500), company_account (100000) |

## 클래스 텍스트의 역할

Meyer는 클래스가 세 가지 문서 역할을 한다고 강조한다:

### 1. 구현 (Implementation)

실제 동작하는 코드:

```eiffel
deposit (amount: INTEGER)
    do
        balance := balance + amount
    end
```

### 2. 인터페이스 (Interface)

클라이언트가 보는 계약:

```eiffel
deposit (amount: INTEGER)
    require
        positive: amount > 0
    ensure
        increased: balance = old balance + amount
```

### 3. 문서 (Documentation)

주석과 헤더 주석:

```eiffel
feature -- 상태 변경
    deposit (amount: INTEGER)
        -- amount만큼 입금
        -- 사전조건: amount > 0
        -- 사후조건: 잔고가 amount만큼 증가
```

**단일 소스 원칙**: 이 세 가지가 한 곳(클래스 텍스트)에 있으므로 동기화 문제가 없다.

## Short Form과 Flat Form

Eiffel은 클래스의 다양한 **뷰**를 제공한다:

### Short Form

클라이언트에게 필요한 정보만 (구현 제외):

```eiffel
class interface ACCOUNT

create
    make

feature -- 초기화
    make (initial: INTEGER)
        require
            non_negative: initial >= 0
        ensure
            balance_set: balance = initial

feature -- 접근
    balance: INTEGER

feature -- 상태 변경
    deposit (amount: INTEGER)
        require
            positive: amount > 0
        ensure
            increased: balance = old balance + amount

    withdraw (amount: INTEGER)
        require
            positive: amount > 0
            sufficient: amount <= balance
        ensure
            decreased: balance = old balance - amount

invariant
    non_negative_balance: balance >= 0

end
```

`do ... end` 블록이 없다. 계약만 보인다.

### Flat Form

상속받은 피처까지 모두 펼친 뷰:

```eiffel
class SAVINGS_ACCOUNT

-- ACCOUNT에서 상속받은 피처들도 여기에 펼쳐짐
feature
    balance: INTEGER
    deposit (amount: INTEGER) ...
    withdraw (amount: INTEGER) ...

-- SAVINGS_ACCOUNT 고유 피처
feature
    interest_rate: REAL
    add_interest ...

end
```

## 자주 하는 실수

클래스 설계 시 흔히 빠지는 함정이다.

| 실수 | 증상 | 해결 |
|------|------|------|
| **명령-질의 혼합** | `pop()`이 값 반환 + 상태 변경 → 호출할 때마다 결과 다름 | CQS 적용. `top`(질의) + `remove`(명령)으로 분리 |
| **균일 접근 위반** | `r.get_area()` vs `r.width` → 구현 변경 시 클라이언트도 변경 | 속성이든 함수든 같은 구문. `r.area`, `r.width` |
| **내보내기 수준 과다** | 모든 피처가 `feature {ANY}` → 캡슐화 무너짐 | 최소 권한 원칙. 필요한 클래스에만 공개 |
| **God Class** | 피처 100개짜리 클래스 → 응집도 낮음, 변경 파급 큼 | 단일 책임. 역할별로 클래스 분리 |
| **클래스와 객체 혼동** | "클래스에 값을 저장한다" 같은 표현 → 개념 오류 | 클래스는 틀, 객체는 인스턴스. 값은 객체에 |
| **불변식 누락** | `invariant` 없이 `balance >= 0` 가정 → 런타임에 음수 잔고 | 클래스 불변식 명시. 모든 메서드가 유지해야 할 조건 |
| **Short Form 무시** | 구현 코드만 작성하고 인터페이스 문서화 안 함 | Short Form으로 클라이언트 뷰 확인. 계약이 명확해야 재사용 가능 |

## 정리

- **클래스 = 모듈 + 타입 + 구현**: OO의 유일한 구성 단위
- **피처 = 속성 + 루틴**: 데이터와 연산의 통합
- **루틴 = 함수 + 프로시저**: 질의와 명령의 분리
- **내보내기**: 세밀한 가시성 제어
- **균일 접근 원칙**: 속성과 함수의 구문적 동일성
- **클래스 vs 객체**: 설계도 vs 인스턴스
- **Short Form**: 클라이언트 뷰 (계약만)

## 다음 장 예고

Chapter 8에서는 **런타임 구조: 객체**를 다룬다. 클래스의 인스턴스인 객체가 어떻게 생성되고, 참조되고, 비교되는가.

## 관련 항목

- [Ch 6: Abstract Data Types](/blog/programming/design/oosc/chapter06-abstract-data-types) — ADT 명세
- [Ch 8: The Run-Time Structure: Objects](/blog/programming/design/oosc/chapter08-the-run-time-structure-objects) — 객체
- [Ch 11: Design by Contract](/blog/programming/design/oosc/chapter11-design-by-contract) — 계약
- [Ch 14: Introduction to Inheritance](/blog/programming/design/oosc/chapter14-introduction-to-inheritance) — 상속
