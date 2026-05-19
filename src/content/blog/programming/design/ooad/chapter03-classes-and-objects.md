---
title: "Ch 3: Classes and Objects"
date: 2026-05-19T03:00:00
description: "클래스와 객체 — 객체의 본질, 상태·행동·정체성."
series: "Object-Oriented Analysis and Design with Applications"
seriesOrder: 3
tags: [oop, booch, classes, objects, state, behavior, identity]
draft: false
type: book-review
bookTitle: "Object-Oriented Analysis and Design with Applications"
bookAuthor: "Grady Booch"
---

## 한 줄 요약

> 객체는 **상태(State)**, **행동(Behavior)**, **정체성(Identity)**의 세 가지 특성을 가진다. 클래스는 공통 구조와 행동을 공유하는 객체들의 **청사진**이다.

## 객체의 본질

### 객체란 무엇인가

> "An object has state, behavior, and identity; the structure and behavior of similar objects are defined in their common class." — Booch

| 구성 요소 | 설명 |
|----------|------|
| 상태 (State) | 객체의 속성과 그 값들. 시간에 따라 변할 수 있음 |
| 행동 (Behavior) | 객체가 할 수 있는 것. 다른 객체에 반응하는 방식 |
| 정체성 (Identity) | 객체를 유일하게 식별. 상태와 무관하게 존재 |

### 상태 (State)

**상태란**: 특정 시점에서 객체의 모든 속성 값의 집합.

| 특징 | 설명 |
|------|------|
| 속성 (Attribute) | 객체의 특성 |
| 값 (Value) | 속성의 현재 내용 |
| 변경 가능 vs 불변 | Mutable vs Immutable |

| 중요성 |
|--------|
| 상태가 행동에 영향 |
| 같은 메시지에 다른 응답 가능 |
| 객체의 "기억" |

```java
// 상태 예시
public class BankAccount {
    // 상태를 구성하는 속성들
    private String accountNumber;
    private BigDecimal balance;
    private AccountStatus status;
    private LocalDate openedDate;
    private Customer owner;

    // 상태 변경
    public void deposit(BigDecimal amount) {
        this.balance = this.balance.add(amount);
    }

    // 상태에 따른 행동 차이
    public void withdraw(BigDecimal amount) {
        if (status == AccountStatus.FROZEN) {
            throw new AccountFrozenException();
        }
        if (balance.compareTo(amount) < 0) {
            throw new InsufficientFundsException();
        }
        this.balance = this.balance.subtract(amount);
    }
}
```

### 행동 (Behavior)

**행동이란**: 객체가 수행할 수 있는 연산. 다른 객체의 요청에 응답하는 방식.

| 구성 | 설명 |
|------|------|
| 연산 (Operation) | 서비스로 요청 가능 |
| 메서드 (Method) | 연산의 구현 |
| 메시지 (Message) | 연산 호출 |

| 유형 | 역할 |
|------|------|
| 수정자 (Modifier) | 상태 변경 |
| 선택자 (Selector) | 상태 조회 |
| 반복자 (Iterator) | 순회 |
| 생성자 (Constructor) | 초기화 |
| 소멸자 (Destructor) | 정리 |

```java
// 행동 예시
public class ShoppingCart {
    private List<CartItem> items;
    private BigDecimal totalPrice;

    // 수정자 (Modifier)
    public void addItem(Product product, int quantity) {
        items.add(new CartItem(product, quantity));
        recalculateTotal();
    }

    // 수정자
    public void removeItem(Product product) {
        items.removeIf(item -> item.getProduct().equals(product));
        recalculateTotal();
    }

    // 선택자 (Selector)
    public BigDecimal getTotalPrice() {
        return totalPrice;
    }

    // 선택자
    public int getItemCount() {
        return items.size();
    }

    // 반복자 (Iterator)
    public Iterator<CartItem> items() {
        return items.iterator();
    }

    // 내부 헬퍼
    private void recalculateTotal() {
        totalPrice = items.stream()
            .map(CartItem::getSubtotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
```

### 정체성 (Identity)

**정체성이란**: 객체를 다른 모든 객체와 구별하는 속성.

| 특징 |
|------|
| 상태와 독립적 |
| 시간이 지나도 유지 |
| 객체 생성 시 부여 |

| 비교 | 의미 | 연산 |
|------|------|------|
| 동일성 (Identity) | 같은 객체인가? | `==` |
| 동등성 (Equality) | 같은 값인가? | `.equals()` |

**예**: 두 사람이 같은 이름, 같은 생년월일을 가져도 서로 다른 개인이다 (다른 정체성).

```java
// 정체성과 동등성
public class Person {
    private final UUID id;  // 정체성
    private String name;
    private LocalDate birthDate;

    public Person(String name, LocalDate birthDate) {
        this.id = UUID.randomUUID();  // 고유 정체성 부여
        this.name = name;
        this.birthDate = birthDate;
    }

    // 정체성 기반 동등성
    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (!(obj instanceof Person)) return false;
        Person other = (Person) obj;
        return this.id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return id.hashCode();
    }
}

// 값 객체의 경우 — 상태 기반 동등성
public class Money {
    private final BigDecimal amount;
    private final Currency currency;

    @Override
    public boolean equals(Object obj) {
        if (!(obj instanceof Money)) return false;
        Money other = (Money) obj;
        return this.amount.equals(other.amount)
            && this.currency.equals(other.currency);
    }
}
```

## 클래스의 본질

### 클래스란 무엇인가

> "A class is a set of objects that share a common structure and a common behavior." — Booch

| 역할 | 설명 |
|------|------|
| 청사진 (Blueprint) | 객체의 구조 정의. 객체의 행동 정의 |
| 팩토리 (Factory) | 객체 생성. 초기화 수행 |
| 타입 (Type) | 객체의 인터페이스 명세. 계약 정의 |

### 클래스 vs 객체

**비유**: 클래스 = 쿠키 틀, 객체 = 구워진 쿠키.

| 구분 | 클래스 | 객체 |
|------|--------|------|
| 시점 | 정적 (컴파일 타임) | 동적 (런타임) |
| 개수 | 하나만 존재 | 여러 개 존재 가능 |
| 역할 | 템플릿/청사진 | 인스턴스/실체 |

```java
// 클래스 정의
public class Dog {
    private String name;
    private String breed;
    private int age;

    public Dog(String name, String breed, int age) {
        this.name = name;
        this.breed = breed;
        this.age = age;
    }

    public void bark() {
        System.out.println(name + " says: Woof!");
    }
}

// 객체들 (인스턴스들)
Dog fido = new Dog("Fido", "Labrador", 3);
Dog buddy = new Dog("Buddy", "Golden Retriever", 5);
Dog max = new Dog("Max", "Beagle", 2);

// 같은 클래스, 다른 객체, 다른 상태, 같은 행동
fido.bark();   // "Fido says: Woof!"
buddy.bark();  // "Buddy says: Woof!"
```

## 객체 간 관계

### 연관 (Association)

**정의**: 두 클래스 간의 의미적 연결.

| 특성 | 설명 |
|------|------|
| 다중성 (Multiplicity) | 1:1, 1:n, n:m |
| 방향성 (Navigability) | 단방향, 양방향 |
| 역할 (Role) | 관계에서의 역할 |

**예**: Customer -- Order (1:n), Student -- Course (n:m).

```java
// 연관 예시
public class Customer {
    private String name;
    private List<Order> orders;  // 1:n 관계

    public void placeOrder(Order order) {
        orders.add(order);
        order.setCustomer(this);  // 양방향
    }
}

public class Order {
    private Customer customer;  // n:1 관계
    private List<OrderItem> items;

    public void setCustomer(Customer customer) {
        this.customer = customer;
    }
}
```

### 집합 (Aggregation)

**정의**: "has-a" 관계의 특별한 형태. 전체-부분 관계.

| 특징 |
|------|
| 부분이 전체와 독립적으로 존재 가능 |
| 약한 소유 관계 |
| 다이아몬드 빈 기호 (◇) |

**예**: Department ◇-- Employee (부서가 없어도 직원은 존재).

### 합성 (Composition)

**정의**: 강한 전체-부분 관계.

| 특징 |
|------|
| 부분이 전체에 종속 |
| 전체 소멸 시 부분도 소멸 |
| 채워진 다이아몬드 (◆) |

**예**: House ◆-- Room (집이 없어지면 방도 없어짐).

```java
// 합성 예시 — Room은 House와 함께 생성/소멸
public class House {
    private final List<Room> rooms;

    public House(int numberOfRooms) {
        rooms = new ArrayList<>();
        for (int i = 0; i < numberOfRooms; i++) {
            rooms.add(new Room(this));  // House가 Room 생성
        }
    }

    public void demolish() {
        rooms.clear();  // House 소멸 시 Room도 소멸
    }
}

public class Room {
    private final House house;

    Room(House house) {  // 패키지 프라이빗 — House만 생성
        this.house = house;
    }
}
```

### 의존 (Dependency)

**정의**: 한 요소가 다른 요소를 사용.

| 특징 |
|------|
| 일시적 관계 |
| 파라미터, 지역 변수, 반환 타입 |
| 점선 화살표 (---->) |

**예**: Controller ---> Service (Controller가 Service를 사용).

```java
// 의존 예시
public class OrderController {
    // 필드로 유지하지 않음 — 의존

    public OrderResponse createOrder(OrderRequest request) {
        // 지역 변수로 사용
        OrderValidator validator = new OrderValidator();
        validator.validate(request);

        // 반환 타입으로 사용
        return OrderResponse.from(/* ... */);
    }
}
```

### 상속 (Generalization)

**정의**: 일반화-특수화 관계. "is-a" 관계.

| 특징 |
|------|
| 코드 재사용 |
| 다형성 기반 |
| 삼각형 화살표 (△) |

| 주의 |
|------|
| 리스코프 치환 원칙 준수 |
| 깊은 상속 피하기 |
| "상속보다 합성" 원칙 |

## 객체의 생명주기

### 생성, 사용, 소멸

| 생명주기 | 내용 |
|----------|------|
| 생성 (Creation) | 메모리 할당, 초기화, 생성자 호출 |
| 사용 (Usage) | 메서드 호출, 상태 변경, 다른 객체와 협력 |
| 소멸 (Destruction) | 참조 해제, 정리 작업, 메모리 반환 (GC) |

```java
// 생명주기 예시
public class Connection {
    private final String url;
    private Socket socket;

    // 생성
    public Connection(String url) {
        this.url = url;
        this.socket = new Socket();
    }

    // 사용
    public void open() {
        socket.connect(url);
    }

    public void send(byte[] data) {
        socket.write(data);
    }

    // 소멸 전 정리
    public void close() {
        if (socket != null) {
            socket.close();
            socket = null;
        }
    }

    // try-with-resources 지원
    // AutoCloseable 구현
}
```

## 클래스 설계 원칙

### 좋은 클래스의 특징

| 특징 | 설명 |
|------|------|
| 단일 책임 | 한 가지 이유로만 변경. 명확한 목적 |
| 적절한 크기 | 너무 크지도 작지도 않게. 관련 기능의 응집 |
| 명확한 인터페이스 | 직관적인 메서드 이름. 일관된 추상화 수준 |
| 최소 의존성 | 필요한 것만 의존. 느슨한 결합 |
| 테스트 용이성 | 독립적으로 테스트 가능. 의존성 주입 가능 |

### 나쁜 클래스의 징후

| 징후 | 설명 |
|------|------|
| 신 클래스 (God Class) | 모든 것을 아는 클래스. 수백, 수천 줄의 코드 |
| 데이터 클래스 (Data Class) | 게터/세터만 있음. 행동 없음 |
| 기능 질투 (Feature Envy) | 다른 클래스의 데이터에 집착. 자기 데이터보다 남의 데이터 사용 |
| 긴 파라미터 목록 | 너무 많은 파라미터. 객체로 그룹화 필요 |

## 정리

객체의 세 가지 특성:
- **상태**: 속성과 그 값들, 시간에 따라 변화
- **행동**: 연산과 메서드, 요청에 응답
- **정체성**: 고유 식별, 상태와 독립

객체 간 관계:
- **연관**: 의미적 연결
- **집합**: 약한 전체-부분
- **합성**: 강한 전체-부분
- **의존**: 일시적 사용
- **상속**: 일반화-특수화

## 다음 장 예고

Chapter 4에서는 **분류**를 다룬다. 클래스를 어떻게 발견하고, 핵심 추상화를 어떻게 식별하는가.

## 관련 항목

- [Ch 2: The Object Model](/blog/programming/design/ooad/chapter02-the-object-model) — 객체 모델
- [Ch 4: Classification](/blog/programming/design/ooad/chapter04-classification) — 분류
- [OOSC Ch 7: The Static Structure: Classes](/blog/programming/design/oosc/chapter07-the-static-structure-classes) — 클래스 구조
