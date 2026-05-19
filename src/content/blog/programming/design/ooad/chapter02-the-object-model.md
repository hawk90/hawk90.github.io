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

객체지향은 하루아침에 등장한 것이 아닙니다. 프로그래밍 패러다임은 *추상화 수준을 높이는 방향*으로 진화해왔고, 객체지향은 그 여정의 한 단계입니다.

### 프로그래밍 패러다임의 발전

| 세대 | 언어 | 핵심 추상화 | 한계 |
|------|------|-----------|------|
| 1세대 (1950s-60s) | 기계어, 어셈블리 | 없음 (하드웨어 직접) | 이식성 없음, 유지보수 불가 |
| 2세대 (1960s-70s) | FORTRAN, COBOL | 서브루틴, 함수 | 데이터와 함수가 분리 |
| 3세대 (1970s-80s) | Pascal, C, Ada | 데이터 타입, 모듈 | 타입 재사용 어려움 |
| 4세대 (1980s-) | Smalltalk, C++, Java | 클래스, 상속, 다형성 | — |

**왜 이 진화가 중요한가?** 각 세대는 *이전 세대의 한계를 극복*하려고 등장했습니다. 어셈블리의 기계 종속성 → 고급 언어로 해결. 함수와 데이터의 분리 → 구조체로 묶음. 구조체의 행동 없음 → 클래스로 데이터와 행동을 통합. 객체지향은 이 흐름의 자연스러운 귀결입니다.

### 객체지향의 기원

객체지향의 핵심 아이디어는 여러 언어에서 독립적으로 발전했습니다.

| 언어/연구자 | 시기 | 핵심 공헌 | 현대적 영향 |
|------------|------|----------|-----------|
| Simula 67 (Dahl & Nygaard) | 1967 | 클래스, 객체, 상속 개념 도입 | 모든 OO 언어의 조상 |
| Smalltalk (Kay) | 1970s | "모든 것이 객체", 메시지 전송, 동적 타이핑 | Ruby, Python의 철학 |
| CLU (Liskov) | 1975 | 추상 데이터 타입(ADT), 캡슐화 강조 | 인터페이스 개념의 기반 |
| C++ (Stroustrup) | 1983 | OO + 시스템 프로그래밍 효율성 | 산업계 대중화 |

Simula는 시뮬레이션을 위해 만들어졌습니다. 실제 세계의 객체(배, 손님, 창구)를 모델링하려다 보니 자연스럽게 "클래스"와 "객체"라는 개념이 필요했습니다. 이것이 OOP의 출발점입니다.

## 핵심 요소 (Major Elements)

Booch는 객체 모델의 요소를 *핵심(Major)*과 *부가(Minor)*로 나눕니다. 핵심 요소 네 가지는 어떤 OO 언어든 반드시 지원해야 하는 것입니다. 부가 요소 세 가지는 유용하지만 필수는 아닙니다.

이 구분이 중요한 이유는 **"OO"라고 불리는 것들이 다르기 때문**입니다. Python과 Java는 둘 다 OO지만, 타이핑 방식이 다릅니다. Go는 상속이 없지만 인터페이스와 합성으로 다형성을 지원합니다. 핵심 4가지를 이해하면, 언어 간 차이를 넘어 OO의 본질을 볼 수 있습니다.

### 추상화 (Abstraction)

> "An abstraction denotes the essential characteristics of an object that distinguish it from all other kinds of objects and thus provide crisply defined conceptual boundaries, relative to the perspective of the viewer." — Booch

**핵심 통찰**: 추상화는 *관점에 따라 달라집니다*. 같은 "자동차"도 운전자에게는 "핸들, 페달, 계기판"이고, 정비사에게는 "엔진, 트랜스미션, 서스펜션"입니다. 어느 쪽이 맞는 게 아니라, *목적에 맞는 추상화*를 선택해야 합니다.

| 원칙 | 설명 | 위반 시 문제 |
|------|------|------------|
| 관점 의존성 | 누가 이 객체를 사용하는가? | 사용자가 불필요한 세부사항에 노출됨 |
| 명확한 경계 | 이 클래스의 책임은 어디까지인가? | 책임이 흐릿해서 중복 발생 |
| 본질에 집중 | 이 객체의 핵심 특성은 무엇인가? | 부수적 세부사항으로 인터페이스가 비대해짐 |

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

추상화가 "무엇을 보여줄 것인가"라면, 캡슐화는 "무엇을 숨길 것인가"입니다. 둘은 동전의 양면입니다.

**왜 숨겨야 하는가?** 모든 것이 노출되면 *어디서든 수정 가능*합니다. 그러면 변경의 영향을 예측할 수 없습니다. `account.balance = -1000`처럼 직접 수정하면, 잔고 규칙(음수 금지)을 우회합니다. 반면 `account.withdraw(1000)`을 강제하면, 검증 로직을 한 곳에서 관리할 수 있습니다.

| 목적 | 설명 | 효과 |
|------|------|------|
| 정보 은닉 | 내부 표현(자료구조, 알고리즘)을 숨김 | 구현 변경해도 클라이언트 코드 불변 |
| 계약 정의 | "무엇을 하는가"만 노출, "어떻게"는 숨김 | 사용법이 명확해짐 |
| 불변식 보호 | 객체 상태의 규칙을 내부에서 강제 | 잘못된 상태 진입 방지 |

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

캡슐화가 *클래스 수준*의 숨김이라면, 모듈성은 *시스템 수준*의 분리입니다. 클래스가 수십, 수백 개가 되면 어떻게 조직할 것인가의 문제입니다.

**핵심 질문**: "이 클래스들은 왜 같은 모듈에 있는가?" 답이 명확해야 합니다. "주문과 관련된 것들"처럼.

| 원칙 | 설명 | 검증 질문 |
|------|------|----------|
| 높은 응집도 | 모듈 내 요소가 밀접하게 관련됨 | "이 클래스가 여기 있는 이유를 한 문장으로 설명할 수 있는가?" |
| 낮은 결합도 | 모듈 간 의존성 최소화 | "이 모듈을 다른 프로젝트에 그대로 가져갈 수 있는가?" |
| 정보 은닉 | 모듈 내부 결정을 숨김 | "모듈 외부에서 내부 클래스를 직접 참조하는가?" |

**모듈화 예시** (전자상거래 시스템):

| 모듈 | 책임 | 포함 클래스 | 외부 의존 |
|------|------|-----------|----------|
| catalog | 상품 정보 관리 | Product, Category, CatalogService | 없음 |
| order | 주문 생성/관리 | Order, OrderItem, OrderService | catalog |
| payment | 결제 처리 | Payment, PaymentGateway, PaymentService | order |
| shipping | 배송 관리 | Shipment, Carrier, ShippingService | order |

의존 방향이 한쪽으로만 흐릅니다: catalog ← order ← payment. 순환 의존이 없습니다. 이것이 좋은 모듈화의 징후입니다.

### 계층 (Hierarchy)

추상화들 사이에는 관계가 있습니다. 계층은 이 관계를 *위아래로* 조직하는 방법입니다.

**두 종류의 "위아래"가 있습니다:**

| 계층 종류 | 관계 | 핵심 질문 | 예 |
|----------|------|----------|-----|
| 클래스 계층 (is-a / 상속) | 일반화-특수화 | "A는 B의 일종인가?" | Circle is-a Shape |
| 객체 계층 (part-of / 합성) | 전체-부분 | "A가 B를 가지고 있는가?" | Car has-a Engine |

**왜 구분이 중요한가?** 잘못된 계층을 선택하면 설계가 경직됩니다. 흔한 실수:

```java
// 잘못된 상속 — Stack is-a ArrayList?
class Stack extends ArrayList {  // ❌ Stack은 ArrayList의 "일종"이 아님
    void push(Object o) { add(o); }
    Object pop() { return remove(size() - 1); }
}
// 문제: stack.get(0), stack.add(5, obj) 같은 메서드가 노출됨

// 올바른 합성 — Stack has-a List
class Stack {                     // ✓ Stack은 List를 "사용"함
    private List storage = new ArrayList();
    void push(Object o) { storage.add(o); }
    Object pop() { return storage.remove(storage.size() - 1); }
}
// 내부 구현이 숨겨짐, 인터페이스가 깔끔함
```

**원칙**: "상속보다 합성을 선호하라" (Favor composition over inheritance). 상속은 부모-자식 간 강한 결합을 만듭니다. 부모가 변하면 모든 자식이 영향받습니다. 합성은 더 유연합니다.

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

부가 요소는 "있으면 좋지만 필수는 아닌" 것들입니다. 어떤 언어는 강하게 지원하고, 어떤 언어는 라이브러리로 제공합니다. 하지만 실무에서는 종종 핵심 요소만큼 중요합니다.

### 타이핑 (Typing)

"이 변수에 어떤 타입의 값이 들어갈 수 있는가?"를 언제 검사하느냐의 문제입니다.

| 유형 | 검사 시점 | 예 | 트레이드오프 |
|------|----------|-----|-------------|
| 정적 타이핑 | 컴파일 타임 | Java, C++, TypeScript | 안전하지만 장황 |
| 동적 타이핑 | 런타임 | Python, Ruby, JavaScript | 유연하지만 런타임 에러 위험 |

**현대적 경향**: 정적 타이핑 언어가 *타입 추론*을 도입해 장황함을 줄이고(Java의 `var`, Kotlin의 타입 추론), 동적 타이핑 언어가 *옵션 타입 힌트*를 도입해 안전성을 높입니다(Python의 type hints, TypeScript).

### 동시성 (Concurrency)

"여러 일이 동시에 일어날 때 어떻게 조율하는가?"의 문제입니다. OO와 동시성의 조합은 어렵습니다. 객체는 *상태*를 갖고, 동시 접근 시 상태가 망가질 수 있기 때문입니다.

| 접근법 | 핵심 아이디어 | 예 |
|--------|-------------|-----|
| 공유 메모리 + 락 | 접근 전에 락 획득 | Java synchronized, C++ mutex |
| 액터 모델 | 객체끼리 메시지로만 통신, 공유 상태 없음 | Erlang, Akka |
| 불변 객체 | 상태가 변하지 않으므로 동시 접근 안전 | 함수형 스타일, Java의 record |

**실무 권고**: 가능하면 *불변 객체*를 쓰세요. 공유 가변 상태(shared mutable state)가 동시성 버그의 90%입니다.

### 영속성 (Persistence)

"프로그램이 꺼져도 데이터가 살아남는가?"의 문제입니다.

| 수준 | 수명 | 예 |
|------|------|-----|
| 일시적 | 함수 종료 시 소멸 | 로컬 변수 |
| 세션 | 프로그램 종료 시 소멸 | 웹 세션의 사용자 정보 |
| 영속적 | 프로그램과 무관하게 유지 | DB에 저장된 주문 |

**ORM의 함정**: 객체-관계 매핑(ORM)은 객체를 DB에 저장하는 편리한 방법이지만, *객체 모델과 관계 모델은 다릅니다*. 상속, 다대다 관계, 지연 로딩 등에서 불일치가 생깁니다. 이를 "객체-관계 불일치(Object-Relational Impedance Mismatch)"라고 합니다.

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

| 안티패턴 | 설명 | 증상 | 해결 |
|---------|------|------|------|
| 빈혈 도메인 모델 | 데이터만 있고 행동은 서비스에 | getter/setter만 있는 엔티티 | 행동을 객체 안으로 이동 |
| 신 객체 (God Object) | 한 객체가 너무 많은 책임 | 2000줄 클래스, import 50개 | 책임별로 분리 |
| 깊은 상속 | 5단계 이상의 상속 트리 | 부모 변경 시 연쇄 영향 | 합성으로 전환 |
| 원시 타입 집착 | 도메인 개념을 기본 타입으로 | `double money`, `String email` | 값 객체(Money, Email) 도입 |

## 자주 하는 실수

객체 모델을 적용할 때 흔히 빠지는 함정입니다.

| 실수 | 설명 | 해결 |
|------|------|------|
| **추상화 없이 바로 구현** | 도메인 분석 없이 코드부터 작성 | 도메인 전문가와 대화, 용어 정리부터 |
| **과도한 캡슐화** | 모든 필드에 getter/setter → 사실상 노출 | "정말 외부에서 필요한가?" 자문 |
| **순환 의존 방치** | A→B→C→A 형태의 모듈 의존 | 의존 방향 단방향화, 인터페이스 분리 |
| **상속 남용** | is-a가 아닌데 상속 사용 | "진짜 '~의 일종'인가?" 검증, 합성 고려 |
| **불변식 미정의** | 객체가 "올바른 상태"가 무엇인지 모름 | 생성자에서 검증, 상태 전이 규칙 명시 |
| **모듈 경계 모호** | 어느 클래스가 어느 모듈인지 불명확 | 패키지/네임스페이스로 명시적 분리 |

## 정리

**핵심 요소 (Major Elements)** — 모든 OO 언어가 지원해야 하는 것:
- **추상화**: 관점에 따라 본질적 특성을 포착하고, 명확한 개념적 경계를 정의합니다.
- **캡슐화**: 구현을 숨기고 인터페이스만 노출해서, 변경 영향을 국소화합니다.
- **모듈성**: 높은 응집도 + 낮은 결합도로 시스템을 독립적 모듈로 분해합니다.
- **계층**: is-a(상속)와 part-of(합성)로 추상화를 조직합니다. 상속보다 합성을 선호합니다.

**부가 요소 (Minor Elements)** — 유용하지만 필수는 아닌 것:
- **타이핑**: 정적(컴파일 타임) vs 동적(런타임) 검사. 현대 언어는 양쪽의 장점을 취합니다.
- **동시성**: 공유 가변 상태가 문제. 불변 객체나 액터 모델이 안전합니다.
- **영속성**: 객체와 관계 DB 사이의 불일치에 주의해야 합니다.

**기억할 것**: 네 가지 핵심 요소는 *별개*가 아니라 *함께* 작동합니다. 추상화 없이 캡슐화할 수 없고, 모듈화 없이 대규모 시스템을 관리할 수 없습니다.

## 다음 장 예고

Chapter 3에서는 **클래스와 객체**를 깊이 다룬다. 객체의 세 가지 특성 — 상태, 행동, 정체성.

## 관련 항목

- [Ch 1: Complexity](/blog/programming/design/ooad/chapter01-complexity) — 복잡성
- [Ch 3: Classes and Objects](/blog/programming/design/ooad/chapter03-classes-and-objects) — 클래스와 객체
- [OOSC Ch 6: Abstract Data Types](/blog/programming/design/oosc/chapter06-abstract-data-types) — ADT
