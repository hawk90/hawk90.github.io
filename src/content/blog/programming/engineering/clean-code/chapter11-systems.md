---
title: "Ch 11: 시스템"
date: 2026-06-15T11:00:00
description: "시스템 수준의 클린함 — 구성과 사용의 분리, DI, 도메인-특화 언어로 추상 수준 일관성."
tags: [CleanCode, Systems, DI, Robert Martin]
series: "Clean Code"
seriesOrder: 11
---

## 이 챕터의 메시지

함수, 클래스의 다음 층위가 **시스템**이다. 시스템 수준에서 클린함은 한 가지 큰 결정에서 나온다.

> **구성(construction)과 사용(use)을 분리하라.**

객체를 만드는 일과 그 객체를 사용하는 일은 서로 다른 관심사다. 둘이 섞이면 — 시스템의 주요 변경(예: 데이터베이스 교체)이 모든 코드에 영향을 준다.

이 챕터는 시스템 수준 설계의 도구들 — **의존성 주입**, **AOP**, **도메인-특화 언어** — 을 소개한다.

## 핵심 내용

- 시스템 수준의 클린함 = **구성과 사용의 분리**.
- `main`이 객체를 만들고 — 비즈니스 로직은 만들어진 객체를 받아 쓴다.
- **의존성 주입**(DI)이 표준 도구.
- **AOP**(Aspect-Oriented Programming)로 횡단 관심사 분리.
- **점진적 확장** — 처음부터 거대한 아키텍처 X. 필요할 때 추가.
- 시스템을 **도메인 언어**로 표현하면 추상 수준이 일관된다.

## 도시의 비유

큰 도시는 어떻게 동작하는가? 한 사람이 모든 디테일(수도관 압력, 신호등 타이밍, 쓰레기 수거 일정)을 머리에 담지 못한다. 그런데 도시는 돌아간다.

이유는 **각 부서가 자기 추상 수준에서 책임을 가지기 때문**이다. 시장은 전략을, 부서장은 정책을, 작업자는 구체 작업을 한다. 각자가 자기 층위의 결정만 한다.

소프트웨어 시스템도 마찬가지다.

- **고수준 정책** — 비즈니스 로직.
- **중수준 코디네이션** — 어플리케이션 흐름.
- **저수준 디테일** — DB, 네트워크, UI.

각 층위가 자기 책임에 집중하고, **층위 간 의존성이 명확**해야 시스템이 자란다.

## 구성과 사용의 분리

가장 큰 시스템 수준 결정이 이것이다.

### 안티패턴 — 사용처에서 만든다

```java
public class Service {
    private DatabaseConnection conn;

    public Service() {
        conn = new MySqlConnection("jdbc:mysql://localhost/db");   // 직접 만듦
    }

    public void process() {
        conn.execute(...);
    }
}
```

`Service`가 자기가 쓸 객체를 직접 만든다. 문제는 다음이다.

- 테스트에서 `MySqlConnection`을 mock으로 바꿀 수 없다.
- DB를 PostgreSQL로 바꾸려면 `Service` 코드를 변경.
- `Service`의 책임이 **두 가지**가 됐다 (비즈니스 로직 + 자원 생성).

### 패턴 — 외부에서 주입

```java
public class Service {
    private DatabaseConnection conn;

    public Service(DatabaseConnection conn) {     // 받기만
        this.conn = conn;
    }

    public void process() {
        conn.execute(...);
    }
}

// main 또는 DI 컨테이너에서
DatabaseConnection conn = new MySqlConnection("jdbc:...");
Service service = new Service(conn);
```

`Service`는 만들어진 객체를 **받기만** 한다. 누가 어떻게 만드는지는 모른다. 이게 **DI(Dependency Injection)** 다.

### Main과 도메인의 분리

가장 일반적 형태는 `main`이 모든 객체를 만들고, 도메인 코드에 주입하는 것이다.

```
main
 ├── DatabaseConnection 만듦
 ├── Logger 만듦
 ├── Cache 만듦
 └── Service 만들고 위 객체들 주입
      └── Service.process()  ← 비즈니스 로직 (만든 것 받아서 씀)
```

**main**과 **나머지 시스템**의 의존 방향이 한쪽으로만 흐른다. 도메인 코드는 main을 모른다 — `main`이 도메인 객체를 알 뿐이다.

이게 [Clean Architecture의 핵심 의존성 규칙](/blog/programming/design/clean-architecture/chapter22-the-clean-architecture)이다.

## 의존성 주입의 형태

### 1) 생성자 주입

```java
public class Service {
    private final DatabaseConnection conn;

    public Service(DatabaseConnection conn) {
        this.conn = conn;
    }
}
```

가장 명확. 필수 의존성을 컴파일러가 강제. 권장.

### 2) 세터 주입

```java
public class Service {
    private DatabaseConnection conn;

    public void setConnection(DatabaseConnection conn) {
        this.conn = conn;
    }
}
```

선택적 의존성에 쓰는 경우는 있지만, 일반적으로 권장하지 않는다 (객체가 "반쯤 만들어진" 상태로 존재 가능).

### 3) DI 컨테이너 (Spring, Guice 등)

```java
@Component
public class Service {
    @Autowired
    private DatabaseConnection conn;
}
```

컨테이너가 객체 생성·주입을 자동화. 큰 시스템에 유용. 단 — **명시적 의존성이 흐려진다**는 비용.

## 점진적 확장

시스템 설계의 큰 함정 하나는 **처음부터 완벽한 아키텍처를 짜려는** 시도다.

> Martin의 권고: **시작은 단순하게**. 시스템이 성장하면서 필요해질 때 아키텍처를 도입한다.

- 처음엔 main + 몇 개 클래스로 충분할 수 있다.
- 트래픽이 늘면 캐싱을 추가.
- 사용자가 늘면 인증을 추가.
- 팀이 커지면 모듈 경계를 그린다.

각 단계는 **그때 발견된 필요에 따라** 도입된다. "혹시 모르니까"로 추가한 추상은 거의 항상 잘못된 추상이 된다.

## 횡단 관심사 — AOP

로깅, 인증, 트랜잭션, 캐싱 같은 관심사는 **시스템의 여러 모듈에 흩어진다**. 매 함수에 같은 코드를 적으면 — 중복이 폭증한다.

```java
// 모든 함수에 흩어진 횡단 관심사
public void serviceMethod() {
    logger.info("entering serviceMethod");        // 로깅
    if (!auth.check()) throw new UnauthorizedException();  // 인증
    transaction.begin();                          // 트랜잭션
    try {
        // 실제 비즈니스 로직 (5줄)
        transaction.commit();
    } catch (Exception e) {
        transaction.rollback();
        throw e;
    }
    logger.info("exiting serviceMethod");
}
```

비즈니스 로직 5줄을 위해 보일러플레이트 20줄. 모든 함수에 같은 패턴.

### AOP — Aspect-Oriented Programming

AOP는 횡단 관심사를 **별도 모듈(aspect)** 로 분리하고, 컴파일 시점 또는 런타임에 코드에 짜 넣는다.

```java
@Service
@Transactional         // 트랜잭션 aspect 적용
@Authenticated         // 인증 aspect
public class MyService {
    @Loggable          // 로깅 aspect
    public void doWork() {
        // 비즈니스 로직 5줄만
    }
}
```

비즈니스 코드는 깨끗하다. 횡단 관심사는 어노테이션으로 적용된다.

대표 구현:
- **Spring AOP** — proxy 기반, 자바.
- **AspectJ** — 컴파일 시점 weaving.
- **데코레이터** — 언어 수준 패턴.

## 도메인-특화 언어 (DSL)

시스템 설계의 정점은 — **시스템을 도메인 언어로 표현**하는 것이다.

```java
// 일반 코드 — 보일러플레이트
Order order = new Order(123);
order.addItem(new Item("Widget", 2));
order.addItem(new Item("Gadget", 1));
order.setShipping(ShippingType.EXPRESS);
order.process();

// DSL — 도메인 언어 직접 표현
order(123)
    .items(item("Widget", 2), item("Gadget", 1))
    .shipping(EXPRESS)
    .process();
```

DSL은 코드를 **도메인 전문가가 읽을 수 있는 형태**로 만든다. 비즈니스 로직이 자연어에 가까워진다.

DSL의 두 종류:

- **내부 DSL** — 일반 언어의 문법 안에서 메서드 체이닝으로 (위 예시).
- **외부 DSL** — 자체 문법 (SQL, regex, GraphQL).

## 정리

- 시스템 수준의 클린함 = **구성과 사용의 분리**.
- **DI**가 표준 도구. 생성자 주입이 가장 명확.
- **점진적 확장** — 처음부터 큰 아키텍처 X.
- **AOP**로 횡단 관심사 분리.
- **DSL**로 도메인 언어 직접 표현.

다음 챕터는 **창발(emergence)** — 단순한 규칙에서 좋은 디자인이 자연스럽게 자라난다.

## 관련 항목

- [Ch 10: 클래스](/blog/programming/engineering/clean-code/chapter10-classes) — 추상 의존
- [Ch 12: 창발](/blog/programming/engineering/clean-code/chapter12-emergence) — 다음 챕터
- [Clean Architecture Ch 22: Clean Architecture](/blog/programming/design/clean-architecture/chapter22-the-clean-architecture) — 시스템 구조
