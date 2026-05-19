---
title: "Ch 2: The Object Model"
date: 2026-05-19T02:00:00
description: "객체 모델 — OOP의 4대 요소: 추상화, 캡슐화, 모듈성, 계층."
series: "Object-Oriented Analysis and Design with Applications"
seriesOrder: 2
tags: [oop, booch, object-model, abstraction, encapsulation, modularity, hierarchy]
draft: false
type: book-review
bookTitle: "Object-Oriented Analysis and Design with Applications"
bookAuthor: "Grady Booch"
---

## 한 줄 요약

> 객체 모델은 **추상화**, **캡슐화**, **모듈성**, **계층**의 네 가지 핵심 요소와, **타이핑**, **동시성**, **영속성**의 세 가지 부가 요소로 구성된다.

## 객체지향 프로그래밍의 진화

### 프로그래밍 패러다임의 발전

| 세대 | 특징 |
|------|------|
| 1세대 (1950s-60s) | 기계어, 어셈블리. 하드웨어 직접 제어. 추상화 거의 없음 |
| 2세대 (1960s-70s) | FORTRAN, COBOL, ALGOL. 절차적 추상화. 서브루틴, 함수 |
| 3세대 (1970s-80s) | Pascal, C, Ada. 구조적 프로그래밍. 데이터 타입, 모듈 |
| 4세대 (1980s-) | Smalltalk, C++, Java. 객체지향. 클래스, 상속, 다형성 |

### 객체지향의 기원

| 기여자 | 공헌 |
|--------|------|
| Simula 67 (Dahl & Nygaard) | 클래스, 객체 개념 도입. 시뮬레이션 목적 |
| Smalltalk (Kay) | "모든 것이 객체". 메시지 전송 개념. GUI, 바이트코드 VM |
| CLU (Liskov) | 추상 데이터 타입. 캡슐화 강조 |
| C++ (Stroustrup) | OO + 효율성. 대중화 |

## 핵심 요소 (Major Elements)

### 추상화 (Abstraction)

**정의**: 객체의 본질적 특성을 포착하여 다른 객체와 구별하는 것.

> "An abstraction denotes the essential characteristics of an object that distinguish it from all other kinds of objects and thus provide crisply defined conceptual boundaries, relative to the perspective of the viewer." — Booch

| 핵심 |
|------|
| 관점에 따라 달라짐 |
| 경계가 명확해야 함 |
| 본질에 집중 |

```java
// 추상화 예시 — 무엇이 본질인가?

// 저수준 (낮은 추상화)
void drawPixel(int x, int y, int color);
void drawLine(int x1, int y1, int x2, int y2);

// 고수준 (높은 추상화)
class Shape {
    void draw();
    void move(Point delta);
    boolean contains(Point p);
}

// 도메인 수준 (가장 높은 추상화)
class SalesOrder {
    void submit();
    void cancel();
    BigDecimal getTotal();
}
```

### 캡슐화 (Encapsulation)

**정의**: 구현 세부사항을 숨기고 인터페이스만 노출하는 것.

| 목적 | 설명 |
|------|------|
| 정보 은닉 | 내부 표현 숨김. 변경 영향 국소화 |
| 계약 정의 | 무엇을 하는지 노출. 어떻게 하는지 숨김 |
| 모듈 독립성 | 구현 변경 자유. 클라이언트 코드 불변 |

```java
// 캡슐화 예시

// 나쁜 예 — 구현 노출
public class Account {
    public double balance;  // 직접 접근
    public ArrayList<Transaction> transactions;
}

// 좋은 예 — 인터페이스만 노출
public class Account {
    private BigDecimal balance;
    private List<Transaction> transactions;

    public BigDecimal getBalance() {
        return balance;
    }

    public void deposit(BigDecimal amount) {
        // 검증, 로깅, 이벤트 발생 등
        balance = balance.add(amount);
        transactions.add(new DepositTransaction(amount));
    }

    public void withdraw(BigDecimal amount) {
        if (balance.compareTo(amount) < 0) {
            throw new InsufficientFundsException();
        }
        balance = balance.subtract(amount);
        transactions.add(new WithdrawalTransaction(amount));
    }
}
```

### 모듈성 (Modularity)

**정의**: 시스템을 응집력 있고 느슨하게 결합된 모듈로 분해하는 것.

| 원칙 | 설명 |
|------|------|
| 높은 응집도 | 한 모듈 내 요소가 밀접하게 관련. 단일 책임 |
| 낮은 결합도 | 모듈 간 의존성 최소화. 인터페이스를 통한 상호작용 |
| 정보 은닉 | 모듈 내부 결정을 숨김. 변경 영향 차단 |

**모듈화 예시** (전자상거래 시스템):

| 모듈 | 클래스 |
|------|--------|
| catalog (상품 카탈로그) | Product, Category, CatalogService |
| order (주문) | Order, OrderItem, OrderService |
| payment (결제) | Payment, PaymentGateway, PaymentService |
| shipping (배송) | Shipment, Carrier, ShippingService |

각 모듈은 명확한 책임을 가지며, 독립적으로 발전 가능하고, 인터페이스로 연결된다.

### 계층 (Hierarchy)

**정의**: 추상화들의 순위 또는 순서.

| 계층 종류 | 관계 | 특징 |
|----------|------|------|
| 클래스 계층 ("is-a" / 상속) | 일반화-특수화 | 공통 특성 공유, 코드 재사용 |
| 객체 계층 ("part-of" / 합성) | 전체-부분 | 복잡한 객체 구성, 위임 |

| 비교 | 예 |
|------|-----|
| 상속 | "원이 도형이다" (Circle is-a Shape) |
| 합성 | "자동차가 엔진을 가진다" (Car has-a Engine) |

**원칙**: "상속보다 합성을 선호하라" (Favor composition over inheritance).

```java
// 계층 예시

// is-a 계층 (상속)
abstract class Employee {
    private String name;
    private BigDecimal salary;

    public abstract BigDecimal calculateBonus();
}

class Manager extends Employee {
    private List<Employee> reports;

    @Override
    public BigDecimal calculateBonus() {
        return getSalary().multiply(new BigDecimal("0.2"));
    }
}

class Engineer extends Employee {
    private String specialization;

    @Override
    public BigDecimal calculateBonus() {
        return getSalary().multiply(new BigDecimal("0.15"));
    }
}

// part-of 계층 (합성)
class Department {
    private String name;
    private Manager head;
    private List<Employee> members;

    public BigDecimal getTotalSalary() {
        return members.stream()
            .map(Employee::getSalary)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
```

## 부가 요소 (Minor Elements)

### 타이핑 (Typing)

**정의**: 객체가 클래스/인터페이스에 속함을 명시적으로 선언하는 것.

| 유형 | 특징 | 예 |
|------|------|-----|
| 강한 타이핑 | 컴파일 타임 타입 검사 | Java, C++, Eiffel |
| 약한 타이핑 | 런타임 타입 검사 | Smalltalk, Python, Ruby |

| 강한 타이핑 장점 | 약한 타이핑 장점 |
|-----------------|-----------------|
| 조기 오류 발견 | 유연성 |
| 코드 문서화 | 빠른 프로토타이핑 |
| IDE 지원 | — |

### 동시성 (Concurrency)

**정의**: 여러 객체가 동시에 활동하는 것.

| 과제 |
|------|
| 동기화 (Synchronization) |
| 상호 배제 (Mutual Exclusion) |
| 교착 상태 (Deadlock) 방지 |

| 접근법 | 특징 |
|--------|------|
| 액터 모델 | 객체 = 독립 실행 단위. 메시지로 통신 |
| 공유 메모리 | 락, 세마포어. 전통적 스레드 |
| 함수형 | 불변 객체. 부작용 없음 |

### 영속성 (Persistence)

**정의**: 객체의 상태가 프로그램 실행을 넘어서 유지되는 것.

| 수준 | 설명 |
|------|------|
| 일시적 객체 | 프로시저 로컬 변수. 함수 종료 시 소멸 |
| 세션 객체 | 프로그램 실행 동안 유지. 종료 시 소멸 |
| 영속 객체 | 프로그램 종료 후에도 유지. 데이터베이스, 파일 저장 |

| 방법 |
|------|
| 직렬화 (Serialization) |
| ORM (Object-Relational Mapping) |
| 객체 데이터베이스 |

## 객체지향 언어의 특성

### 언어별 지원 수준

| 특성 | Smalltalk | C++ | Java | Eiffel |
|------|-----------|-----|------|--------|
| 추상화 | ◯ | ◯ | ◯ | ◯ |
| 캡슐화 | ◯ | ◯ | ◯ | ◯ |
| 모듈성 | △ | ◯ | ◯ | ◯ |
| 계층 | ◯ | ◯ | ◯ | ◯ |
| 타이핑 | 동적 | 정적 | 정적 | 정적 |
| 동시성 | 라이브러리 | 라이브러리 | 언어 | SCOOP |
| 영속성 | 이미지 | 없음 | 직렬화 | STORABLE |

### OO 언어의 필수 조건

**진정한 OO 언어의 조건 (Booch)**:

| 조건 |
|------|
| 캡슐화 지원 |
| 상속 지원 |
| 다형성 지원 |

| 구분 | 지원 기능 | 예 |
|------|----------|-----|
| 객체 기반 | 캡슐화만 | Ada 83 |
| 객체지향 | 캡슐화 + 상속 + 다형성 | Ada 95 |

## 객체 모델의 적용

### 설계 원칙

| 객체 모델 적용 시 고려사항 | 세부 |
|--------------------------|------|
| 추상화 수준 선택 | 도메인에 맞는 개념. 이해관계자가 이해 가능 |
| 캡슐화 경계 결정 | 무엇을 숨길 것인가. 무엇을 노출할 것인가 |
| 모듈 분해 | 응집도 높이기. 결합도 낮추기 |
| 계층 구조 설계 | is-a vs has-a 구분. 상속 깊이 적절히 |

### 안티패턴 피하기

| 안티패턴 | 설명 |
|---------|------|
| 빈혈 도메인 모델 | 데이터만 있는 객체. 행동이 별도 서비스에 |
| 신 객체 (God Object) | 너무 많은 책임. 모든 것을 아는 객체 |
| 깊은 상속 | 5단계 이상의 상속. 이해와 유지보수 어려움 |
| 원시 타입 집착 | 도메인 개념을 기본 타입으로. Money를 double로, Email을 String으로 |

## 정리

핵심 요소:
- **추상화**: 본질적 특성 포착, 개념적 경계 정의
- **캡슐화**: 구현 숨김, 인터페이스 노출
- **모듈성**: 독립적 모듈로 분해, 높은 응집 + 낮은 결합
- **계층**: is-a(상속)와 part-of(합성) 관계

부가 요소:
- **타이핑**: 정적 vs 동적 타입 검사
- **동시성**: 여러 객체의 동시 활동
- **영속성**: 상태의 영구 보존

## 다음 장 예고

Chapter 3에서는 **클래스와 객체**를 깊이 다룬다. 객체의 세 가지 특성 — 상태, 행동, 정체성.

## 관련 항목

- [Ch 1: Complexity](/blog/programming/design/ooad/chapter01-complexity) — 복잡성
- [Ch 3: Classes and Objects](/blog/programming/design/ooad/chapter03-classes-and-objects) — 클래스와 객체
- [OOSC Ch 6: Abstract Data Types](/blog/programming/design/oosc/chapter06-abstract-data-types) — ADT
