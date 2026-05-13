---
title: "Ch 15: JUnit 내부 들여다보기"
date: 2026-06-15T15:00:00
description: "JUnit의 ComparisonCompactor 코드 리팩토링 — 이미 잘 쓰여진 코드도 더 깨끗하게 만들 자리가 있다."
tags: [CleanCode, Refactoring, JUnit, Robert Martin]
series: "Clean Code"
seriesOrder: 15
---

## 이 챕터의 메시지

두 번째 사례 연구다. 이번엔 **Martin이 짠 코드가 아니라**, 거장들(Kent Beck, Erich Gamma 등)이 짠 **JUnit**의 한 부분 — `ComparisonCompactor`다.

> 잘 알려진 좋은 코드도 — **다시 들여다보면 더 다듬을 자리가 있다**.

이 챕터의 메시지는 두 가지다. **누구의 코드든 항상 개선의 여지가 있다**는 것, 그리고 **보이스카우트 규칙**(발견한 자리보다 더 깨끗하게)이 거장의 코드에도 적용된다는 것.

## 핵심 내용

- **거장의 코드도 완벽하지 않다** — 시간이 지나면 다시 보고 다듬을 자리가 보인다.
- 같은 원칙 적용: SRP, 이름, 작은 함수, 의도 표현.
- 가장 큰 개선은 **이름과 함수 추출**.
- "이미 좋은 코드"를 다듬는 일이 — 가장 좋은 학습이다.

## ComparisonCompactor의 일

JUnit의 어서션이 실패할 때 — 두 문자열을 비교해 **다른 부분만** 보여 주는 도구가 `ComparisonCompactor`다.

```
Expected: "abc...xyz"
Actual:   "abc...xyy"
```

긴 문자열에서 차이만 강조해 사용자에게 보여 준다. 입력이 길면 공통 부분을 `...`으로 잘라낸다.

원본 코드는 약 70줄. Martin은 이 코드의 동작을 유지하면서 — **여러 가지 개선**을 적용한다.

## 적용한 개선들

### 1. 멤버 변수 이름

`f_expected`, `f_actual` 같은 헝가리안식 접두사를 떼어 `expected`, `actual`로.

```java
// Before
private String f_expected;
private String f_actual;
private int    f_contextLength;
private int    f_prefix;
private int    f_suffix;

// After
private String expected;
private String actual;
private int    contextLength;
private int    prefixLength;
private int    suffixLength;
```

`f_` 접두사는 멤버임을 알리려는 헝가리안 컨벤션이었지만, 현대 IDE는 멤버를 색으로 구분한다. 노이즈가 사라진다.

### 2. 큰 함수 분할

원본 `compact` 함수가 너무 많은 일을 한다. 동작별로 작은 함수로 추출.

```java
// Before — 한 함수가 모두 처리
public String compact(String message) {
    if (expected == null || actual == null || areStringsEqual())
        return Assert.format(message, expected, actual);
    findCommonPrefix();
    findCommonSuffix();
    String expected = compactString(this.expected);
    String actual = compactString(this.actual);
    return Assert.format(message, expected, actual);
}

// After — 추출 + 명확한 흐름
public String formatCompactedComparison(String message) {
    if (canBeCompacted()) {
        compactExpectedAndActual();
        return Assert.format(message, compactExpected, compactActual);
    } else {
        return Assert.format(message, expected, actual);
    }
}

private boolean canBeCompacted() {
    return expected != null && actual != null && !areStringsEqual();
}

private void compactExpectedAndActual() {
    findCommonPrefixAndSuffix();
    compactExpected = compactString(expected);
    compactActual = compactString(actual);
}
```

각 함수가 한 책임만 가진다. 호출 흐름이 명확.

### 3. 의도가 드러나는 이름

함수 이름을 다시 살핀다.

- `compact` → `formatCompactedComparison` (메시지 포맷팅까지 한다는 의도)
- `canBeCompacted` (`if`를 명확한 질문으로)
- `compactExpectedAndActual` (두 값을 함께 처리한다는 의도)

### 4. 임시 변수와 책임 분리

코드를 들여다보면 — **공통 접두/접미사 탐색**이 두 메서드(`findCommonPrefix`, `findCommonSuffix`)에 흩어져 있다. 한 메서드로 합쳐 의도 명확화.

또한 — `compact` 결과가 멤버 변수에 저장되는 부작용도 깔끔하게 정리한다.

### 5. 매직 넘버 → 상수

```java
private static final String ELLIPSIS = "...";
private static final String DELTA_END = "]";
private static final String DELTA_START = "[";
```

리터럴 `"..."`, `"["`, `"]"`가 코드 곳곳에 등장한다. 상수로 빼면 — 의미가 명확해지고, 변경 시 한 자리만 수정한다.

## 사례에서 배우는 것

이 리팩토링은 **코드를 망가뜨리지 않으면서** 점진적으로 진행된다. JUnit의 자체 테스트가 통과하는지 매 단계 확인한다.

### 거장의 코드도 변한다

JUnit은 거장이 짠 매우 잘 다듬어진 라이브러리다. 그런데도 — Martin이 발견한 개선 자리가 여러 곳 있다. 이게 무엇을 의미하는가?

> **"완벽한" 코드는 없다.** 다만 더 좋게 만들 수 있는 코드만 있다.

코드를 매번 다시 들여다보면 — 시간이 지난 만큼 새 시각이 보인다. 그것이 보이스카우트 규칙의 본질이다.

### 누적된 작은 개선

이 챕터의 모든 개선은 **개별로는 작은 일**이다.

- 변수 이름 하나 바꾸기.
- 함수 하나 추출.
- 매직 넘버 하나 상수로.

각각의 변경이 분 단위로 가능하다. 그러나 **누적되면 코드의 가독성이 크게 달라진다**.

> 좋은 코드는 한 큰 결단이 아니라, 매일 매 커밋의 작은 선택들의 합이다.

## 거장에게서 배우는 자세

JUnit 코드를 리뷰할 때 Martin이 보여 주는 자세도 — **이 사례의 일부**다.

- **존중**: 원본 작가들의 결정을 비난하지 않는다. "당시엔 좋은 선택이었다."
- **명확성**: 왜 바꾸는지를 정확히 적는다. "왜냐하면 ..."
- **검증**: 매 변경마다 테스트 통과를 확인한다.

이런 태도가 — 다른 사람의 코드를 리뷰하거나, 자기 옛 코드를 다시 들여다볼 때도 유용하다.

## 정리

- 거장의 코드도 — **다시 보면 다듬을 자리가 있다**.
- 이름, 함수 추출, 매직 넘버 상수화 — 작은 개선들의 누적.
- **보이스카우트 규칙**이 거장의 코드에도 적용된다.
- 변경은 매번 작게, **테스트로 검증**.
- 코드 리뷰의 자세 — 존중, 명확성, 검증.

다음 챕터는 마지막 사례 연구 — `SerialDate` 클래스의 좀 더 큰 리팩토링.

## 관련 항목

- [Ch 1: 클린 코드](/blog/programming/engineering/clean-code/chapter01-clean-code) — 보이스카우트 규칙
- [Ch 14: 점진적 개선](/blog/programming/engineering/clean-code/chapter14-successive-refinement) — 첫 사례
- [Ch 16: SerialDate](/blog/programming/engineering/clean-code/chapter16-refactoring-serialdate) — 다음 챕터
