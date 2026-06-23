---
title: "Ch 3: 함수"
date: 2026-05-11T03:00:00
description: "함수는 작아야 한다. 한 가지 일을 해야 한다. 한 추상 수준을 유지해야 한다. 클린 코드의 가장 압축된 규칙."
tags: [CleanCode, Functions, Robert Martin]
series: "Clean Code"
seriesOrder: 3
draft: true
---

## 이 챕터의 메시지

Martin이 책에서 가장 단호한 챕터다. 함수에 관한 규칙은 사실상 두 줄로 압축된다.

> **함수는 작아야 한다.**
>
> **그리고 그보다 더 작아야 한다.**

농담처럼 들리지만 진심이다. Kent Beck의 코드를 본 후 Martin이 받은 충격이 이 챕터의 출발점이다 — 모든 함수가 2~4줄이고, 각 함수가 명확한 한 가지 일만 했다.

큰 함수는 클린 코드의 가장 큰 적이다. 인지 부담, 중복, 책임 혼재, 테스트 어려움이 모두 함수 크기와 연결된다. 작게 쪼개는 것이 거의 모든 문제의 첫 단계다.

## 핵심 내용

- 함수는 **작아야 한다** — 가능하면 5줄 이하, 가급적 한 화면 안
- 한 가지 일만 한다 — **Single Responsibility**의 함수 버전
- 한 추상 수준만 사용한다 — **내려가기(Stepdown) 규칙**
- 인자는 적게 — **0개가 이상적**, 3개를 넘기지 말 것
- **부작용을 만들지 마라** — 이름이 약속한 일만 해라
- **명령과 질문을 분리**하라 — `setAndCheck()`는 거짓말이다
- 예외가 에러 코드보다 낫다 — **try/catch 본문은 빼라**
- **DRY** — 중복은 모든 악의 뿌리

## 작게, 더 작게

Martin은 함수의 적정 크기에 대해 단호하다.

> 함수의 첫 번째 규칙은 작아야 한다는 것이다. 두 번째 규칙은 **더 작아야 한다**는 것이다.

구체 기준은 이렇다.

- **5줄 이하**가 이상적이다.
- **20줄**을 넘으면 거의 항상 분할이 가능하다.
- **80~100줄** 함수는 거의 항상 잘못 설계됐다.
- if, else, while 본문은 **한 줄짜리 함수 호출**이어야 한다.

이 기준은 극단적으로 보인다. 실제로 80년대 코드는 함수 하나가 한 화면(24×80)을 넘는 일이 흔했다. 그러나 클린 코드의 함수는 그보다 훨씬 작다.

### 블록과 들여쓰기

if/else/while 본문이 한 줄이어야 한다는 규칙은 **들여쓰기 깊이가 1~2를 넘지 않아야 한다**는 결과를 낳는다. 깊은 중첩은 함수가 너무 많은 일을 한다는 신호다.

```java
// 깊은 중첩 — 분할 신호
public void processOrder(Order order) {
    if (order.isValid()) {
        for (Item item : order.getItems()) {
            if (item.isInStock()) {
                if (item.getDiscount() > 0) {
                    // ...
                }
            }
        }
    }
}

// 분할 후
public void processOrder(Order order) {
    if (!order.isValid()) return;
    order.getItems().forEach(this::processItemIfInStock);
}

private void processItemIfInStock(Item item) {
    if (!item.isInStock()) return;
    if (item.getDiscount() > 0) {
        applyDiscount(item);
    }
}
```

각 함수가 들여쓰기 1단계 이하다. 다음 사람의 인지 부담이 크게 줄어든다.

## 한 가지 일만

> **함수는 한 가지 일만 해야 한다. 그 일을 잘 해야 한다. 그것만 해야 한다.**

"한 가지 일"이 정확히 무엇인가? Martin의 기준은 이렇다.

> 함수의 본문을 같은 추상 수준의 단계들로 풀어 적을 수 있고, 그 단계들이 한 문장의 "TO" 문단으로 읽힌다면 — 그 함수는 한 가지 일을 한다.

```
TO RenderPageWithSetupsAndTeardowns, we check to see whether the page
is a test page and if so, we include the setups and teardowns. In either
case we render the page in HTML.
```

이 한 문단이 함수의 본문이고, 함수의 이름이 그 문단의 주어다.

### 함수 안의 함수 — 추출 신호

함수에서 **다른 의미 있는 함수를 추출할 수 있다면**, 그 함수는 한 가지 일 이상을 하고 있다.

```java
// 두 가지 일
public void payEmployees(List<Employee> employees) {
    for (Employee e : employees) {
        if (e.isPayDay()) {
            Money pay = e.calculatePay();
            e.deliverPay(pay);
        }
    }
}

// 추출 후
public void payEmployees(List<Employee> employees) {
    for (Employee e : employees) {
        payIfNecessary(e);
    }
}

private void payIfNecessary(Employee e) {
    if (e.isPayDay()) {
        deliverPay(e, e.calculatePay());
    }
}
```

## 한 추상 수준만

함수 안의 문장들은 **같은 추상 수준**이어야 한다. 고수준과 저수준이 섞이면 읽는 사람이 매번 층위를 바꿔야 한다.

```java
// 추상 수준 섞임 — 읽기 어려움
public String renderPage() {
    getPageData().getHtml();              // 고수준
    StringBuilder sb = new StringBuilder(); // 저수준
    sb.append("<html>");                    // 저수준
    appendContent(sb);                      // 고수준
    sb.append("</html>");                   // 저수준
    return sb.toString();                   // 저수준
}
```

이 함수는 "페이지 렌더링"(고수준)과 "HTML 문자열 조립"(저수준)을 한자리에서 한다. 두 수준 사이에 함수 한 층을 끼우면 분리된다.

### 내려가기 규칙 (Stepdown Rule)

코드는 위에서 아래로 읽혔을 때 **추상 수준이 한 층씩 내려가는** 형태여야 한다. 가장 위에 있는 함수가 가장 고수준이고, 호출당하는 함수가 그 다음 수준이고, 또 그 다음.

```
public renderPageWithSetupsAndTeardowns(...)
└── private renderPage(...)
    └── private includeSetupAndTeardownPages(...)
        ├── private includeSetupPages(...)
        │   └── private includePageContent(...)
        └── private includeTeardownPages(...)
```

이게 책을 읽듯이 코드를 읽을 수 있게 한다.

## switch 문

switch는 본질적으로 N가지 일을 한다. 함수에 직접 두면 "한 가지 일" 규칙을 깬다. **다형성 뒤로 숨겨야** 한다.

```java
// 나쁨 — 모든 곳에 같은 switch가 흩어진다
public Money calculatePay(Employee e) {
    switch (e.type) {
        case COMMISSIONED: return calculateCommissionedPay(e);
        case HOURLY:       return calculateHourlyPay(e);
        case SALARIED:     return calculateSalariedPay(e);
    }
}

// 좋음 — 다형성, switch는 팩토리에 단 한 자리
public abstract class Employee {
    public abstract Money calculatePay();
}

public class EmployeeFactory {
    public Employee makeEmployee(EmployeeRecord r) {
        switch (r.type) {
            case COMMISSIONED: return new CommissionedEmployee(r);
            case HOURLY:       return new HourlyEmployee(r);
            case SALARIED:     return new SalariedEmployee(r);
        }
    }
}
```

switch는 팩토리에 묻고, 나머지 코드는 추상 `Employee`만 본다. 새 타입이 추가될 때 변경할 자리는 팩토리 한 곳뿐이다.

## 함수 인자

**인자는 적을수록 좋다.** 인자가 많을수록 다음 두 가지가 늘어난다.

- 호출자가 인자를 준비하는 부담.
- 테스트가 인자 조합을 다 커버하는 부담.

| 인자 수 | Martin의 평가 |
| --- | --- |
| 0개 (niladic) | **이상적** |
| 1개 (monadic) | 좋음 |
| 2개 (dyadic) | 신중히 |
| 3개 (triadic) | 가능한 피하라 |
| 4개+ (polyadic) | **거의 항상 잘못됐다** |

### 인자 줄이는 패턴

```java
// Bad — 인자 3개
Circle makeCircle(double x, double y, double radius);

// Better — 의미 있는 그룹은 클래스로
Circle makeCircle(Point center, double radius);
```

### Flag 인자는 거의 항상 잘못

```java
// Bad — bool 인자는 함수가 두 가지 일을 한다는 신호
render(true);   // ??? — render what truthy thing?

// Good — 두 함수로 분리
renderForSuite();
renderForSingleTest();
```

`bool` 인자는 "함수 안에 if가 있다"는 약속이다. 두 가지 일을 하므로 두 함수로 나누는 게 낫다.

### 출력 인자는 피하라

```java
// Bad — 인자가 변경됨 (의도 불명확)
appendFooter(report);   // report에 footer를 추가? footer에 report를 추가?

// Good — 멤버 함수 또는 반환
report.appendFooter();
report = appendFooter(report);
```

## 부작용 없는 함수

**함수의 이름이 약속한 일만** 해야 한다. 약속 외의 일을 한다면 — 그게 **부작용**이다. 부작용은 함수의 신뢰를 깨뜨린다.

```java
// 부작용 — 비밀번호 검증인데 세션 초기화도 함
public boolean checkPassword(String userName, String password) {
    User user = UserGateway.findByName(userName);
    if (user != null && user.passwordMatches(password)) {
        Session.initialize();   // ⚠️ 부작용!
        return true;
    }
    return false;
}
```

호출자는 "비밀번호만 검증한다"고 생각하지만, 세션 상태가 조용히 바뀐다. 함수 이름을 `checkPasswordAndInitializeSession`으로 바꾸거나, 두 함수로 분리해야 한다.

## 명령과 질문을 분리하라

함수는 **무언가를 하거나(command) 무언가를 알려준다(query)** — 두 가지를 동시에 하면 안 된다.

```java
// 둘 다 — 헷갈림
public boolean set(String attribute, String value) {
    // 속성을 설정하고, 성공 여부를 반환
}

// 호출자
if (set("username", "alice")) { ... }   // "alice"로 설정됐다? 또는 "alice"였다?

// 명령과 질문 분리
if (attributeExists("username")) {
    setAttribute("username", "alice");
}
```

## 에러 코드 대신 예외

C 시절의 관습은 에러 코드 반환이었다. 함수가 호출자에게 검사를 강요하고, 호출 코드가 if로 도배된다.

```java
// 에러 코드
if (deletePage(page) == E_OK) {
    if (registry.deleteReference(page.name) == E_OK) {
        if (configKeys.deleteKey(page.name.makeKey()) == E_OK) {
            logger.log("page deleted");
        } else {
            logger.log("configKey not deleted");
        }
    } else {
        logger.log("deleteReference from registry failed");
    }
} else {
    logger.log("delete failed");
    return E_ERROR;
}

// 예외
try {
    deletePage(page);
    registry.deleteReference(page.name);
    configKeys.deleteKey(page.name.makeKey());
    logger.log("page deleted");
} catch (Exception e) {
    logger.log(e.getMessage());
}
```

예외는 정상 경로를 깔끔하게 두고 에러 경로를 한 자리에 모은다.

### try/catch 본문은 빼라

try/catch도 일종의 분기다. 함수가 한 가지 일을 하려면 try/catch 본문이 별도 함수여야 한다.

```java
public void delete(Page page) {
    try {
        deletePageAndAllReferences(page);
    } catch (Exception e) {
        logError(e);
    }
}

private void deletePageAndAllReferences(Page page) throws Exception {
    deletePage(page);
    registry.deleteReference(page.name);
    configKeys.deleteKey(page.name.makeKey());
}

private void logError(Exception e) {
    logger.log(e.getMessage());
}
```

`delete` 함수는 "에러 처리"라는 한 가지 일만 한다. 본문은 예외 가능 작업과 로깅에 위임된다.

## DRY — Don't Repeat Yourself

중복은 거의 모든 클린 코드 규칙의 적이다. 같은 코드가 두 곳에 있으면, 두 번 수정해야 하고, 두 번 테스트해야 하며, **불일치 가능성이 두 배**가 된다.

Martin은 중복을 모든 악의 뿌리로 본다. 함수 추출, 클래스 추출, 다형성, 템플릿 — 모든 도구가 결국 중복을 줄이기 위한 무기다.

## 구조화된 프로그래밍

Dijkstra의 구조화 프로그래밍 규칙 (단일 진입, 단일 출구)은 옛 규칙이다. 작은 함수에선 거의 영향이 없다.

> 작은 함수에선 `return`, `break`, `continue`를 두려워하지 마라.

`goto`는 여전히 피한다. 다만 `return`을 함수 중간에 두는 것은 **가독성을 올린다**.

## 함수는 어떻게 작성하나

> 처음 짤 때는 길고 복잡한 함수를 짠다. 들여쓰기가 깊고, 중복이 있고, 인자가 많고, 이름은 임의적이다.
>
> 그러나 **테스트**를 함께 짠다. 테스트가 통과되도록 한다. 그 다음 — 함수를 **다듬는다**. 추출하고, 이름을 바꾸고, 중복을 없앤다. 테스트가 계속 통과되도록 유지한다.

이게 핵심이다. **처음부터 클린한 함수가 나오지 않는다**. 작동하게 한 후, 깨끗하게 만든다. 테스트가 그 사이의 안전망이다.

## 정리

- 함수는 **작게**. 5줄 이하가 이상적, 20줄을 넘기지 마라.
- 한 **추상 수준**, 한 **가지 일**.
- **내려가기 규칙** — 위에서 아래로 추상 수준이 내려간다.
- 인자는 적을수록 좋다 — **0개가 이상적**, flag 금지, 출력 인자 피하기.
- **부작용 금지** — 이름이 약속한 일만.
- **명령과 질문 분리**, **에러 코드 대신 예외**.
- **DRY** — 중복은 적이다.
- 처음엔 길게 쓰고, **테스트와 함께 다듬어라**.

다음 챕터는 **주석** — 좋은 함수와 좋은 이름은 주석의 필요를 없앤다.

## 관련 항목

- [Ch 2: 의미 있는 이름](/blog/programming/engineering/clean-code/chapter02-meaningful-names) — 함수와 변수의 이름
- [Ch 4: 주석](/blog/programming/engineering/clean-code/chapter04-comments) — 주석 없이 함수를 설명하는 법
- [Ch 10: 클래스](/blog/programming/engineering/clean-code/chapter10-classes) — 함수의 다음 층위
- Refactoring: Extract Function — 함수 추출 패턴
