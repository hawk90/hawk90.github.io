---
title: "Ch 9: 단위 테스트"
date: 2025-06-15T09:00:00
description: "TDD 세 법칙, 깨끗한 테스트의 다섯 가지 F.I.R.S.T 속성. 테스트 코드도 프로덕션 코드만큼 중요하다."
tags: [CleanCode, Unit Test, TDD, Robert Martin]
series: "Clean Code"
seriesOrder: 9
draft: true
---

## 이 챕터의 메시지

테스트 코드는 프로덕션 코드만큼 중요하다. **테스트가 더러우면 프로덕션 코드를 깨끗하게 유지할 자유를 잃는다**. 더러운 테스트는 변경을 두려워하게 하고, 결국 테스트 자체를 버리게 된다.

Martin은 이 챕터에서 두 가지를 주장한다.

- **TDD 세 법칙**으로 테스트와 프로덕션을 함께 자라게 한다.
- **F.I.R.S.T 속성**을 만족하는 테스트가 깨끗한 테스트다.

## 핵심 내용

- 테스트 코드는 **프로덕션 코드만큼 중요**하다 — 가독성, 유지보수성 동등.
- **TDD 세 법칙**: 실패하는 테스트 전 프로덕션 코드 X, 컴파일만 실패해도 테스트 작성 중단, 통과시키는 최소 코드만 추가.
- **F.I.R.S.T**: Fast, Independent, Repeatable, Self-Validating, Timely.
- **테스트당 한 개념** — 한 어서션 또는 한 시나리오만.
- **빌드-운영-검사**(BUILD-OPERATE-CHECK) 패턴으로 테스트 가독성.

## 깨끗한 테스트의 가치

> 더러운 테스트는 테스트가 없는 것보다 못하다.

이 주장이 단호하게 들리지만 — Martin이 본 현장의 결과다. 더러운 테스트는 프로덕션 코드 변경을 두려워하게 만들고, 결국 다음 일이 일어난다.

1. 프로덕션 코드를 바꾸면 테스트가 깨진다.
2. 테스트를 고치는 시간이 점점 늘어난다.
3. "잠시" 테스트를 꺼 둔다.
4. 다시는 켜지 않는다.
5. 코드 품질이 빠르게 떨어진다.

**테스트가 없는 코드는 변경할 자유가 없다**. 변경할 때마다 무엇이 깨졌는지 모른다. 테스트는 그 자유를 보장하는 비계다 — 만약 테스트 자체가 더러우면 그 비계가 무너진다.

## TDD의 세 법칙

Martin이 정리한 세 법칙이다.

### 법칙 1
실패하는 단위 테스트를 작성하기 전에는 프로덕션 코드를 작성하지 마라.

### 법칙 2
컴파일은 되지만 실패하는 테스트가 있다면 — 더 많은 테스트를 작성하지 마라.

### 법칙 3
현재 실패하는 테스트를 통과시키는 데 필요한 만큼만 프로덕션 코드를 작성하라.

이 세 법칙이 만드는 사이클은 30초 단위다.

```
1. 실패하는 작은 테스트 작성 (30초)
2. 통과시키는 최소 코드 작성 (30초)
3. 리팩토링 (필요 시)
4. 반복
```

매 30초마다 시스템이 동작한다. 매 30초마다 그동안 짠 코드의 일부가 테스트로 검증된다. **프로덕션 코드와 테스트가 같은 속도로 자란다**.

## 깨끗한 테스트 — 가독성

다음 두 테스트를 비교해 보자.

### Bad — 디테일이 노출됨

```java
public void testGetPageHieratchyAsXml() throws Exception {
    crawler.addPage(root, PathParser.parse("PageOne"));
    crawler.addPage(root, PathParser.parse("PageOne.ChildOne"));
    crawler.addPage(root, PathParser.parse("PageTwo"));

    request.setResource("root");
    request.addInput("type", "pages");
    Responder responder = new SerializedPageResponder();
    SimpleResponse response =
        (SimpleResponse) responder.makeResponse(
            new FitNesseContext(root), request);
    String xml = response.getContent();

    assertEquals("text/xml", response.getContentType());
    assertSubString("<name>PageOne</name>", xml);
    assertSubString("<name>PageTwo</name>", xml);
    assertSubString("<name>ChildOne</name>", xml);
}
```

준비 코드가 많고, 어떤 도메인 개념을 테스트하는지 묻혀 있다.

### Good — 도메인 의도 명확

```java
public void testGetPageHierarchyAsXml() throws Exception {
    makePages("PageOne", "PageOne.ChildOne", "PageTwo");

    submitRequest("root", "type:pages");

    assertResponseIsXML();
    assertResponseContains("<name>PageOne</name>",
                           "<name>PageTwo</name>",
                           "<name>ChildOne</name>");
}
```

같은 테스트가 도메인 언어로 표현된다. **무엇을 테스트하는지** 한눈에 보인다. 헬퍼 함수들이 디테일을 숨긴다.

## 도메인 특화 테스트 언어

깨끗한 테스트의 비밀은 — **테스트만을 위한 작은 DSL**을 만든다는 점이다. `makePages`, `submitRequest`, `assertResponseContains` 같은 도메인 함수들이 테스트의 어휘가 된다.

이 DSL은 **테스트 코드 안에 점진적으로 자란다**. 처음엔 헬퍼 함수가 없다. 두 번째 테스트를 짤 때 첫 테스트와 비슷한 패턴이 보이면 추출한다. 시간이 지나면서 풍부한 어휘가 만들어진다.

## 테스트당 한 개념

한 테스트는 **한 가지 개념만 검증**한다. 여러 어서션이 있더라도 모두 한 시나리오의 다른 면이어야 한다.

```java
// Bad — 두 개념을 한 테스트에서
@Test
public void testAddDaysAndCalculateDate() {
    Date date = SerialDate.createInstance(31, 5, 2004);
    Date afterAdd = SerialDate.addDays(5, date);    // 첫 개념 — 날짜 더하기
    assertEquals(5, afterAdd.getDay());

    Date prevMonth = SerialDate.previousMonth(date);  // 둘째 개념 — 이전 달
    assertEquals(4, prevMonth.getMonth());
}

// Good — 한 테스트당 한 개념
@Test
public void testAddDays() {
    Date date = SerialDate.createInstance(31, 5, 2004);
    Date afterAdd = SerialDate.addDays(5, date);
    assertEquals(5, afterAdd.getDay());
}

@Test
public void testPreviousMonth() {
    Date date = SerialDate.createInstance(31, 5, 2004);
    Date prevMonth = SerialDate.previousMonth(date);
    assertEquals(4, prevMonth.getMonth());
}
```

각 테스트가 무엇을 검증하는지 이름과 본문이 한눈에 일치한다. 실패 시에도 어떤 동작이 깨졌는지 정확히 안다.

## BUILD-OPERATE-CHECK 패턴

깨끗한 테스트는 세 단계로 구성된다.

```
BUILD    — 테스트 데이터 준비
OPERATE  — 테스트 대상 동작 호출
CHECK    — 결과 검증
```

이 패턴이 시각적으로도 분리되어 보여야 한다 (빈 줄로).

```java
@Test
public void testSomething() {
    // BUILD
    Account account = new Account("alice", 100);

    // OPERATE
    account.withdraw(50);

    // CHECK
    assertEquals(50, account.getBalance());
}
```

xUnit 패턴 중 가장 단순한 형태다. AAA(Arrange-Act-Assert)와 같은 뜻이다.

## F.I.R.S.T 속성

깨끗한 테스트는 다섯 가지 속성을 만족한다.

### Fast — 빠르다

테스트는 빨라야 한다. 빨라야 자주 돌리고, 자주 돌려야 문제를 조기에 잡는다.

- 단위 테스트는 **밀리초** 단위로.
- 느린 의존성(DB, 네트워크)은 mock 또는 격리.

테스트가 한 시간 돌아간다면 — 하루에 몇 번 못 돌린다. 결국 안 돌리게 된다.

### Independent — 독립적이다

테스트들이 **서로 의존하면 안 된다**. A가 먼저 돌고 B가 그 결과를 쓰면 — A가 실패할 때 B도 실패하고, 진짜 원인을 찾기 어렵다.

각 테스트는 자기만의 BUILD를 가지고, 독립적으로 실행 가능해야 한다.

### Repeatable — 반복 가능하다

같은 코드, 같은 결과. 어떤 환경에서든.

- 로컬에서 통과 → CI에서도 통과.
- 시간/날짜에 의존하지 않는다 (필요하면 inject).
- 외부 서비스에 의존하지 않는다.

시간대, 네트워크, 파일 시스템 등 — 외부 영향을 격리한다.

### Self-Validating — 자기 검증

테스트가 통과/실패를 **스스로 판단**해야 한다. 로그를 사람이 읽고 판단하는 게 아니라.

```java
// Bad — 사람이 로그를 봐야 한다
System.out.println("Balance: " + account.getBalance());

// Good — assertion으로 자동 판단
assertEquals(50, account.getBalance());
```

### Timely — 적절한 시점에 작성

테스트는 **프로덕션 코드를 짜기 직전**에 짠다. TDD 세 법칙의 핵심이다.

뒤늦게 테스트를 추가하면 — 프로덕션 코드가 이미 테스트하기 어렵게 짜여 있을 가능성이 크다. 처음부터 함께 짠다.

## 테스트가 가능하지 않은 코드

테스트를 짤 수 없는 코드는 **설계의 문제**다. 일반적으로 다음 신호다.

- **숨겨진 의존성** — 함수가 전역 상태나 외부 자원을 직접 다룬다.
- **너무 큰 단위** — 한 클래스/함수가 여러 책임을 가진다.
- **부작용** — 함수가 약속한 일 외의 일을 한다.

테스트를 짜기 위한 리팩토링이 — 자연스럽게 프로덕션 코드의 품질을 올린다.

## 정리

- 테스트 코드는 **프로덕션 코드만큼 중요**하다.
- **TDD 세 법칙**으로 테스트와 프로덕션을 함께 자라게.
- **테스트당 한 개념** — 한 시나리오, 한 결과.
- **BUILD-OPERATE-CHECK** 패턴으로 시각적 분리.
- **F.I.R.S.T** — Fast, Independent, Repeatable, Self-Validating, Timely.
- 도메인 특화 테스트 언어로 의도를 명확히.

다음 챕터는 **클래스** — 함수의 다음 층위.

## 관련 항목

- [Ch 3: 함수](/blog/programming/engineering/clean-code/chapter03-functions) — 함수가 작으면 테스트도 작다
- [Ch 10: 클래스](/blog/programming/engineering/clean-code/chapter10-classes) — SRP와 테스트 가능성
- [Refactoring Ch 4: 테스트 구축](/blog/programming/engineering/refactoring/chapter04-testing) — 안전망으로서의 테스트
