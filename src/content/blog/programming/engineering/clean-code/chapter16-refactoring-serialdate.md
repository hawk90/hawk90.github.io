---
title: "Ch 16: SerialDate 리팩토링"
date: 2026-05-11T16:00:00
description: "오픈소스 SerialDate 클래스의 본격 리팩토링 — 가장 긴 사례 연구. 코드 리뷰의 정석."
tags: [CleanCode, Refactoring, Code Review, Robert Martin]
series: "Clean Code"
seriesOrder: 16
draft: true
---

## 이 챕터의 메시지

세 번째이자 가장 긴 사례 연구다. **JCommon 라이브러리의 `SerialDate` 클래스**를 처음부터 끝까지 리뷰한다.

이 챕터는 다른 두 사례와 한 가지 점에서 다르다 — **저자(David Gilbert)는 이미 잘 알려진 개발자**고, 코드는 production-grade다. 그럼에도 Martin이 발견하는 개선 자리가 매우 많다.

> 이 챕터는 **코드 리뷰가 어떻게 진행되어야 하는가**의 정석이다.

## 핵심 내용

- **모든 코드는 개선의 여지가 있다** — production-grade도 예외 아님.
- 리뷰는 **위에서 아래로** 흐른다 — 큰 결정부터 작은 디테일까지.
- 모든 개선이 **테스트로 검증**된다 — 안전망 없이 리팩토링 X.
- 흔한 문제: 죽은 코드, 매직 넘버, 큰 함수, 모호한 이름, 부적절한 추상.
- **리뷰는 비판이 아니라 협업** — 존중하면서 명확하게.

## SerialDate가 하는 일

`SerialDate`는 자바 표준 `java.util.Date`의 시간 정보를 빼고 — **순수 날짜만** 다루는 클래스다. 1900-01-01을 0일로 잡고 정수로 표현한다.

```java
SerialDate d = SpreadsheetDate.createInstance(31, 12, 2024);
SerialDate next = d.plusDays(1);   // 2025-01-01
```

엑셀 같은 스프레드시트의 날짜 계산 방식이다.

## 발견된 문제들 — 분류별 정리

Martin이 책에서 페이지 단위로 짚는 문제들을 카테고리로 정리한다.

### 1. 헤더와 주석

- **저작권 헤더가 50줄** — 라이선스 자체가 길지만, 짧게 줄일 수도 있다.
- **JavaDoc이 일부 멤버에만 있다** — 일관성 없는 문서화.
- **주석이 코드 자체와 중복**되는 자리들.
- **TODO 주석이 오래된 채로 남아 있다**.

### 2. 죽은 코드

```java
public abstract class SerialDate implements Comparable, Serializable, MonthConstants {
    // 사용되지 않는 상수, private 메서드, 옛 버전 호환을 위한 코드
}
```

쓰지 않는 코드는 — **인지 부담**이다. 다음 사람이 "이게 왜 있는가?"를 묻는다. **지운다**. git이 기록을 보관한다.

### 3. 매직 넘버

```java
public abstract int getDayOfWeek();   // 1~7 반환? 0~6? 어느 게 일요일?
```

매직 넘버는 의미가 코드에 박혀 있어야 한다.

```java
public static final int SUNDAY    = 1;
public static final int MONDAY    = 2;
// ...
public abstract int getDayOfWeek();
```

또는 더 좋은 — `enum` 사용.

```java
public enum DayOfWeek {
    SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY
}
public abstract DayOfWeek getDayOfWeek();
```

`enum`이 타입 안전성을 더해 준다. 컴파일러가 "0~6"이 아닌 모든 값을 거부.

### 4. 추상 클래스 vs 인터페이스

`SerialDate`는 `abstract class`로 설계됐다. 그러나 — 모든 메서드가 abstract거나, 공통 구현이 없다. **인터페이스가 더 자연스럽다**.

```java
// 인터페이스로
public interface SerialDate extends Comparable<SerialDate>, Serializable {
    // 모든 메서드는 자동으로 public abstract
}
```

구현 클래스가 자유롭게 인터페이스 셋을 조합할 수 있고, 다중 상속의 제약이 사라진다.

### 5. 함수 크기와 책임

여러 함수가 너무 많은 일을 한다.

```java
public boolean isValidWeekdayCode(int code) {
    if (code == SUNDAY || code == MONDAY || code == TUESDAY ||
        code == WEDNESDAY || code == THURSDAY || code == FRIDAY ||
        code == SATURDAY) {
        return true;
    }
    return false;
}
```

이런 함수는 — 검증 로직이 바뀌면(예: 새 요일 추가?) 함수 전체가 변경된다. 더 추상적 방법으로 다시 쓸 수 있다.

```java
public boolean isValidWeekdayCode(int code) {
    return code >= SUNDAY && code <= SATURDAY;
}
```

함수가 단순해진다. 의미도 더 명확.

### 6. 이름

- `weekInMonthToString` — 약어와 흐림 (`weekInMonth`이 무슨 정보를 반환?)
- `relativeToString` — 같음.
- 메서드 이름이 비대칭적: `weekInMonthToString`은 있는데 `dayOfWeekToString`은 다른 위치에 있다.

이름의 **일관성**을 정리한다.

### 7. 매개변수의 모호성

```java
public abstract int getOrdinalDay();        // 일자? 1년 내 일수?
public abstract int getDayOfYearForMonth(int month);
```

이름이 의도를 정확히 표현하지 못한다. 사용자가 매번 문서를 봐야.

```java
public abstract int getDayOfYear();         // 명확
```

## 리팩토링의 흐름

Martin은 이 모든 문제를 한 번에 고치지 않는다. **위에서 아래로** 흐른다.

1. **큰 결정 먼저** — `abstract class` → `interface`?
2. **클래스 구조** — 책임 분리, 죽은 코드 제거.
3. **메서드 단위** — 너무 큰 함수 분할, 모호한 함수 명확화.
4. **이름과 디테일** — 변수/매개변수 이름, 매직 넘버.

각 단계마다 **테스트가 통과되는지** 확인한다. 통과되지 않으면 — 그 단계는 폐기하고 다시 한다.

## 코드 리뷰의 자세

이 챕터의 진짜 가치는 — Martin이 보여 주는 **리뷰의 자세**다.

### 존중

원본 코드는 "잘못된 게 아니다". 시간과 함께 — 새 시각이 생긴 것이다.

> "이 코드는 나쁘다"가 아니라 "이 코드는 이렇게 더 좋아질 수 있다".

### 구체적

추상적 비판("이 코드는 더러워")은 의미가 없다. **무엇이 왜 문제인지** 정확히 적는다.

> "이 함수가 너무 크다 (40줄). 메서드 추출로 동작별로 분할하면 더 읽기 쉽다."

### 검증 가능

각 개선 후 **테스트가 통과되는지**를 확인한다. 없으면 — 리팩토링 전에 테스트를 먼저 짠다.

## 결과

Martin의 리팩토링 후 — `SerialDate`는 더 짧고 명확해진다. 정확한 줄 수는 책에 있지만, **30~50% 감소**가 일반적이다.

더 중요한 건 — **새 요구가 왔을 때 변경할 자리가 명확**하다는 점이다. 새 요일 표현(예: 8요일 시스템?)이 필요해도, 한 자리(`enum`)만 수정하면 된다.

## 정리

- 모든 코드는 **개선의 여지가 있다** — production-grade도.
- 리뷰는 **위에서 아래로** 흐른다 — 큰 결정부터.
- 흔한 문제: 죽은 코드, 매직 넘버, 큰 함수, 모호한 이름.
- **테스트로 검증**하며 점진적으로.
- 리뷰의 자세 — 존중, 구체성, 검증 가능성.

다음이자 마지막 챕터(Ch 17)는 — **코드 냄새와 휴리스틱**. 책 전체의 압축된 체크리스트다.

## 관련 항목

- [Ch 14: 점진적 개선](/blog/programming/engineering/clean-code/chapter14-successive-refinement) — 첫 사례
- [Ch 15: JUnit 내부](/blog/programming/engineering/clean-code/chapter15-junit-internals) — 둘째 사례
- [Ch 17: 냄새와 휴리스틱](/blog/programming/engineering/clean-code/chapter17-smells-and-heuristics) — 마지막 챕터, 체크리스트
- Refactoring: Code Smells — 냄새 카탈로그
