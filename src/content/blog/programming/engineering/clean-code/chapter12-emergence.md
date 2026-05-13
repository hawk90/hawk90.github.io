---
title: "Ch 12: 창발 (Emergence)"
date: 2025-06-15T12:00:00
description: "Kent Beck의 네 가지 단순한 규칙 — 테스트 통과, 중복 없음, 의도 표현, 클래스/메서드 최소화. 좋은 디자인이 창발한다."
tags: [CleanCode, Design, Simple Design, Kent Beck, Robert Martin]
series: "Clean Code"
seriesOrder: 12
---

## 이 챕터의 메시지

Kent Beck이 제안한 **단순한 디자인의 네 규칙**(Four Rules of Simple Design)이 있다. Martin은 이 규칙들을 따르면 — **좋은 디자인이 의도적으로 설계되는 게 아니라 창발한다**고 주장한다.

> 디자인은 위에서 아래로 결정되는 게 아니라, 아래에서 위로 자라난다.

네 규칙은 순서가 중요하다. 위에서 아래로 우선순위가 떨어진다.

## 네 가지 단순한 디자인 규칙

> Beck, "Extreme Programming Explained" (1999)

다음 네 규칙을 모두 만족하는 디자인이 "단순한 디자인"이다.

### 1. 모든 테스트를 실행한다 (Runs All the Tests)

> 테스트로 검증할 수 없는 디자인은 디자인이라 부를 수 없다.

테스트를 통과하지 못하는 시스템은 — 신뢰할 수 없다. 어떤 설계 이론도, 어떤 추상도, 테스트 없이는 종이 위의 그림일 뿐이다.

테스트를 짤 수 있는 코드는 — 자연스럽게 좋은 설계를 가진다.

- **SRP**: 한 가지 일만 하는 클래스가 테스트하기 쉽다.
- **DIP**: 추상에 의존하면 mock을 주입할 수 있다.
- **DI**: 의존성을 외부에서 주입하면 테스트에서 교체 가능.

테스트가 어려운 코드는 — 거의 항상 설계의 문제다. **테스트를 짜기 위한 리팩토링이 자연스럽게 좋은 설계를 만든다**.

### 2. 중복이 없다 (No Duplication)

중복은 좋은 디자인의 가장 큰 적이다.

```java
// 중복
public void renderHeader() {
    print("<html>");
    print("<body>");
    print("<h1>Header</h1>");
    print("</body>");
    print("</html>");
}

public void renderFooter() {
    print("<html>");
    print("<body>");
    print("<p>Footer</p>");
    print("</body>");
    print("</html>");
}
```

`<html><body>...</body></html>` 패턴이 중복된다. 추출하면 더 깔끔.

```java
// 추출 후
public void renderHeader() { renderInPage("<h1>Header</h1>"); }
public void renderFooter() { renderInPage("<p>Footer</p>"); }

private void renderInPage(String body) {
    print("<html><body>");
    print(body);
    print("</body></html>");
}
```

중복 제거는 **공통점을 추상화**하는 결과를 낳는다. 추상화 후엔 의미가 더 분명해지고, 변경 비용도 줄어든다.

### 더 미묘한 중복 — Pattern 중복

표면 코드가 다르더라도 **같은 패턴**이 반복되면 — 그것도 중복이다.

```java
// 다른 함수, 같은 패턴
public Integer findById(int id) {
    for (User u : users) if (u.id == id) return u.id;
    return null;
}

public String findNameById(int id) {
    for (User u : users) if (u.id == id) return u.name;
    return null;
}
```

두 함수 본문이 거의 같다. **Template Method**나 **Strategy**로 묶을 수 있다.

```java
public <T> T findFieldById(int id, Function<User, T> extractor) {
    for (User u : users) if (u.id == id) return extractor.apply(u);
    return null;
}
```

### 3. 의도를 표현한다 (Expressive)

코드가 **무엇을 하는지** 다음 사람에게 즉시 전달되어야 한다.

이게 [Ch 2 의미 있는 이름](/blog/programming/engineering/clean-code/chapter02-meaningful-names), [Ch 3 함수](/blog/programming/engineering/clean-code/chapter03-functions)의 모든 규칙의 목적이다.

- **좋은 이름** — 변수/함수/클래스가 의도를 드러냄.
- **작은 함수/클래스** — 한 개념을 머리에 담을 수 있게.
- **표준 단어** — 도메인 어휘 또는 디자인 패턴 이름 활용.
- **테스트** — 사용 예시이자 가장 좋은 문서.

작가의 의도가 즉시 전달되면, 다음 사람의 변경 비용이 극도로 낮아진다.

### 4. 클래스와 메서드 수를 최소화한다 (Minimal Classes/Methods)

위 세 규칙을 따르다 보면 — 클래스와 메서드 수가 폭증할 수 있다. 너무 많은 작은 단위가 오히려 인지 부담이 된다.

> **클래스와 메서드를 최소화**하라.

다만 이 규칙은 **다른 세 규칙보다 우선순위가 낮다**. 중복 제거나 의도 표현을 위해 더 많은 클래스가 필요하다면 — 클래스 수를 줄이려고 다른 규칙을 어기지 않는다.

이 규칙의 진짜 의미는 — **불필요한 추상**을 만들지 말라는 것이다. "혹시 모르니까" 만든 인터페이스, "유연성을 위해" 만든 옵션 객체는 거의 항상 잘못된 추상이 된다 (YAGNI).

## 우선순위가 중요한 이유

네 규칙의 순서는 절대적이다.

| 우선순위 | 규칙 |
| --- | --- |
| 1 | 모든 테스트를 실행한다 |
| 2 | 중복이 없다 |
| 3 | 의도를 표현한다 |
| 4 | 클래스와 메서드를 최소화 |

- 테스트가 안 돌면 **나머지가 의미 없다** — 검증 불가.
- 중복이 있으면 변경이 어렵다 — 의도와 단순함이 둘 다 깨진다.
- 의도가 흐리면 **유지 불가**.
- 단순함은 위 셋을 만족한 결과여야 한다 — 단순함을 위해 다른 셋을 희생하지 않는다.

## 디자인은 창발한다

이 네 규칙을 매일 매 커밋 따르면 — 좋은 디자인이 **위에서 강제되지 않고 아래에서 자연스럽게 자란다**.

처음 코드는 단순하다. 새 요구가 오면 — 테스트를 추가하고, 통과시키고, 중복을 제거하고, 의도를 드러내고, 단순함을 유지한다. 시스템은 **요구의 변화를 따라 점진적으로 더 좋은 모양**으로 자란다.

> 처음부터 거대한 아키텍처를 만들 필요가 없다. 네 규칙을 따라가면 — 필요한 추상이 필요한 시점에 자연스럽게 등장한다.

이게 XP, TDD, Clean Code 운동의 핵심 메시지다.

## 정리

- Kent Beck의 **네 가지 단순한 디자인 규칙**:
  1. 모든 테스트 통과
  2. 중복 없음
  3. 의도 표현
  4. 클래스/메서드 최소화
- 우선순위는 위에서 아래로. 위가 우선.
- 디자인은 **창발**한다 — 위에서 강제되지 않고 아래에서 자란다.
- 매 변경에서 네 규칙을 따르면 시스템이 시간과 함께 더 좋아진다.

다음 챕터는 **동시성** — 단일 스레드 단순함이 사라지는 영역.

## 관련 항목

- [Ch 1: 클린 코드](/blog/programming/engineering/clean-code/chapter01-clean-code) — 거장들의 정의
- [Ch 13: 동시성](/blog/programming/engineering/clean-code/chapter13-concurrency) — 다음 챕터
- [Refactoring](/blog/programming/engineering/refactoring/) — 중복 제거 + 의도 표현 = 리팩토링
