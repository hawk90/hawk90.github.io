---
title: "Ch 10: 클래스"
date: 2025-06-15T10:00:00
description: "클래스도 작아야 한다. SRP, 응집도, 책임 분리. 변경 격리를 위한 추상 설계."
tags: [CleanCode, Classes, SRP, Robert Martin]
series: "Clean Code"
seriesOrder: 10
---

## 이 챕터의 메시지

함수 다음의 단위가 **클래스**다. 함수에 적용했던 원칙이 한 층 위에서 다시 적용된다.

- 함수는 작아야 한다 → **클래스도 작아야 한다**.
- 함수는 한 가지 일을 한다 → **클래스도 한 가지 책임**을 가진다.
- 함수는 추상 수준이 일치 → **클래스의 모든 멤버가 한 책임을 공유**한다.

Martin이 이 챕터에서 가장 단호한 점은 **변경의 격리**다. 좋은 클래스 설계의 궁극적 기준은 — 변경 사유가 한 가지뿐이라는 것이다.

## 핵심 내용

- 클래스는 **작아야 한다** — 책임으로 측정.
- **Single Responsibility Principle**: 변경 사유가 단 하나.
- 클래스 이름은 책임을 묘사한다. "Manager", "Processor"는 책임 흐림 신호.
- **응집도가 높을수록** 좋은 클래스. 멤버가 멤버 변수를 많이 쓸수록 응집.
- 변경을 위한 **추상 의존** — 구체 구현이 아닌 인터페이스에 의존.

## 클래스 조직

자바의 표준 클래스 조직 순서다.

```java
public class Foo {
    // 1. public static 상수
    public static final int MAX_SIZE = 100;

    // 2. private static 변수
    private static int instanceCount;

    // 3. private 인스턴스 변수
    private String name;
    private List<Item> items;

    // (public 인스턴스 변수가 있다면 그것 — 보통 권장 안 함)

    // 4. public 함수 (고수준 → 저수준)
    public void doSomething() { ... }

    // 5. private 헬퍼
    private void helper() { ... }
}
```

이 순서가 **신문 기사식 내려가기**와 일치한다 ([Ch 5](/blog/programming/engineering/clean-code/chapter05-formatting)).

### 캡슐화 — 가능한 좁게

> 변수와 유틸 함수는 **가능한 한 좁은 스코프**로.

테스트를 위해 private을 protected나 package-private으로 풀어야 한다면 — 그것도 가능하다. 다만 **그 이전에 진짜로 캡슐화를 깨는 게 답인지** 한 번 더 묻는다. 보통은 테스트하기 좋게 코드를 재구성하는 게 낫다.

## 클래스는 작아야 한다

> 함수에 적용한 첫 번째 규칙은 "작아야 한다"다. 두 번째 규칙은 "더 작아야 한다"다. 클래스도 마찬가지다.

함수는 **줄 수**로 크기를 잰다. 클래스는 무엇으로? **책임**으로 잰다.

### 책임으로 측정

```java
// 152개의 public 메서드를 가진 신(God) 클래스
public class SuperDashboard extends JFrame implements MetaDataUser {
    public String getCustomizerLanguagePath() { ... }
    public void setSystemConfigPath(String systemConfigPath) { ... }
    public String getSystemConfigDocument() { ... }
    public void setSystemConfigDocument(String systemConfigDocument) { ... }
    // ... 148개 더
}
```

이런 클래스를 어떻게 책임으로 묘사할 수 있는가? "이 클래스는 무엇을 하는가"라는 질문에 한 문장으로 답할 수 없다면 — 책임이 너무 많다.

### 클래스 이름

**좋은 클래스 이름은 책임을 표현한다**. 25자 안에 묘사할 수 있어야 한다.

| 명확 | 흐릿 |
| --- | --- |
| `PaymentValidator` | `PaymentManager` |
| `OrderRepository` | `OrderHelper` |
| `EmailFormatter` | `EmailUtils` |

"Manager", "Processor", "Helper", "Utils", "Super", "Coordinator" 같은 단어는 보통 **여러 책임을 한 자리에 모은** 신호다.

### "그리고", "또는", "그러나"가 있으면 책임이 여러 개

설명에 접속사가 들어가면 책임이 여러 개일 가능성이 크다.

- "이 클래스는 사용자를 인증**하고** 로그를 남긴다" → 인증과 로깅, 두 책임.
- "이 클래스는 주문을 처리**하거나** 환불을 처리한다" → 두 책임.

## SRP — Single Responsibility Principle

SRP의 정확한 정의는 이렇다.

> **한 클래스가 변경되어야 할 사유는 단 하나여야 한다.**

여기서 "사유"는 **변경을 요구하는 사람의 종류**다. 인증 정책이 바뀌어서 변경되는가? 로깅 포맷이 바뀌어서 변경되는가? 두 가지 사유로 같은 클래스가 변경된다면 — 두 책임을 가진 것이다.

```java
// SRP 위반
public class Employee {
    public void calculatePay() { ... }     // 회계
    public void reportHours() { ... }      // HR
    public void save() { ... }             // DBA
}
// 세 부서가 모두 이 클래스를 수정해야 → 충돌·복잡도 폭발
```

분리하면 다음과 같다.

```java
public class Employee { /* 데이터만 */ }
public class PayCalculator { ... }
public class HourReporter { ... }
public class EmployeeRepository { ... }
```

각 클래스가 한 부서의 책임만 갖는다. 한 부서의 변경이 다른 부서에 영향을 주지 않는다.

### 작은 클래스가 많은 게 나쁜가?

SRP를 따르면 클래스 수가 늘어난다. "큰 클래스 하나"와 "작은 클래스 여러 개" 중 어느 게 나은가?

> 큰 도구 상자 vs 정리된 서랍의 비유. 둘 다 같은 도구를 담지만, 정리된 서랍에서 찾는 시간이 훨씬 짧다.

작은 클래스가 많으면 머리에 한 번에 담는 부담이 줄어든다. 각 클래스가 명확한 책임을 가지므로, **필요한 자리만 들여다보면 된다**. 큰 클래스는 한 변경을 위해 전체를 이해해야 한다.

## 응집도

좋은 클래스는 **응집도**가 높다 — 멤버 함수들이 멤버 변수들을 **공유**해서 쓴다.

```java
// 응집도 높음
public class Stack {
    private int topOfStack = 0;
    private List<Integer> elements = new LinkedList<>();

    public int size()        { return topOfStack; }
    public void push(int e)  { elements.add(e); topOfStack++; }
    public int pop()         { return elements.remove(--topOfStack); }
}
```

모든 메서드가 `topOfStack`과 `elements`를 함께 쓴다. 응집도가 높다.

### 응집도가 낮은 클래스 — 분리 신호

```java
// 응집도 낮음
public class Bookkeeping {
    private List<Income>  incomes;   // 메서드 A, B만 씀
    private List<Expense> expenses;  // 메서드 C, D만 씀
    private List<Asset>   assets;    // 메서드 E, F만 씀

    public void addIncome() { /* incomes만 */ }
    public void totalIncome() { /* incomes만 */ }
    public void addExpense() { /* expenses만 */ }
    public void totalExpense() { /* expenses만 */ }
    public void addAsset() { /* assets만 */ }
    public void totalAsset() { /* assets만 */ }
}
```

세 그룹의 멤버가 각자 자기 변수만 만진다. **서로 무관**하다. 클래스 셋으로 나누는 게 자연스럽다.

응집도가 낮은 클래스는 **분리하라**는 신호다.

## 변경을 위한 설계

대부분의 시스템은 **계속 변한다**. 새 기능, 새 정책, 새 통합. 클래스 설계는 **변경의 충격을 어디에 가둘 것인가**의 결정이다.

### 변경 격리

```java
// 변경 위험 — Sql 구현이 코드 곳곳에 노출
public class Sql {
    public Sql(String table, Column[] columns) { ... }
    public String create() { ... }
    public String insert(Object[] fields) { ... }
    public String selectAll() { ... }
    public String find(Criteria c) { ... }
    public String findByKey(String keyColumn, String keyValue) { ... }
    public String preparedStatement() { ... }
}
```

새 SQL 종류 추가 → 이 클래스 전체를 변경. 다른 종류는 영향을 안 받아야 하는데, **하나가 깨지면 전부가 위험**.

### 추상으로 분리

```java
// 추상 — 변경 격리
abstract public class Sql {
    public Sql(String table, Column[] columns) { ... }
    abstract public String generate();
}

public class CreateSql extends Sql { ... }
public class InsertSql extends Sql { ... }
public class SelectAllSql extends Sql { ... }
// 새 SQL 종류는 새 클래스 추가만으로 — 기존 코드 변경 없음
```

이게 **개방-폐쇄 원칙**(Open-Closed Principle)이다. 새 기능에 대해 **확장은 열려 있고**, 기존 코드 변경에 대해 **닫혀** 있다.

### 구체에서 추상으로 의존

비즈니스 로직은 **구체 구현에 의존하지 마라**. 추상(인터페이스)에 의존하라.

```java
// Bad — 구체에 의존
public class Portfolio {
    private TokyoStockExchange exchange;
    public void calculateValue() { exchange.currentPrice(...); }
}

// Good — 추상에 의존
public class Portfolio {
    private StockExchange exchange;   // 인터페이스
    public Portfolio(StockExchange ex) { this.exchange = ex; }
    public void calculateValue() { exchange.currentPrice(...); }
}
```

추상에 의존하면 — 테스트에서 `FixedStockExchange` mock을 주입할 수 있다. 프로덕션에서 `TokyoStockExchange` 또는 `NyseStockExchange`로 교체 가능. 비즈니스 로직은 그대로다.

이게 [DIP(Dependency Inversion Principle)](/blog/programming/design/clean-architecture/chapter11-dip-the-dependency-inversion-principle)이다.

## 정리

- 클래스는 **작아야 한다** — 책임 한 가지.
- **SRP**: 변경 사유는 단 하나.
- 클래스 이름이 책임을 묘사한다. "Manager", "Helper"는 신호.
- **응집도 높게** — 멤버 함수가 멤버 변수를 함께 쓴다.
- **추상에 의존**하라 — 변경 격리, 테스트 가능성.

다음 챕터는 **시스템** — 클래스의 한 층 위, 시스템 전체의 구조.

## 관련 항목

- [Ch 3: 함수](/blog/programming/engineering/clean-code/chapter03-functions) — SRP의 함수 버전
- [Ch 11: 시스템](/blog/programming/engineering/clean-code/chapter11-systems) — 다음 챕터
- [Clean Architecture Ch 7: SRP](/blog/programming/design/clean-architecture/chapter07-srp-the-single-responsibility-principle) — SRP의 깊은 의미
- [Clean Architecture Ch 11: DIP](/blog/programming/design/clean-architecture/chapter11-dip-the-dependency-inversion-principle) — 의존성 역전
