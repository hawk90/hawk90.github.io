---
title: "Ch 9: LSP — 리스코프 치환 원칙"
date: 2025-06-03T03:00:00
description: "서브타입은 부모타입의 자리에 그대로 대체 가능해야 한다. 어기면 특수 케이스의 폭발이 시작된다."
tags: [Architecture, SOLID, LSP]
series: "Clean Architecture"
seriesOrder: 9
---

## 이 챕터의 메시지

LSP는 Barbara Liskov가 1988년에 정식화한 원칙이다. 원래 정의는 다음과 같다.

> "What is wanted here is something like the following substitution property: If for each object o1 of type S there is an object o2 of type T such that for all programs P defined in terms of T, the behavior of P is unchanged when o1 is substituted for o2 then S is a subtype of T."

수학적 정의지만 의미는 단순하다.

> **서브타입은 부모타입의 자리에 그대로 대체할 수 있어야 한다.**

부모타입을 기대하는 모든 코드에 서브타입을 넣어도 정상 작동해야 한다는 것이다.

## 고전 예 — Square is-a Rectangle

가장 유명한 LSP 위반 예제.

```java
class Rectangle {
  private int width, height;
  public void setWidth(int w) { width = w; }
  public void setHeight(int h) { height = h; }
  public int area() { return width * height; }
}

class Square extends Rectangle {
  // Square는 가로 = 세로
  public void setWidth(int w) { super.setWidth(w); super.setHeight(w); }
  public void setHeight(int h) { super.setHeight(h); super.setWidth(h); }
}
```

수학적으로 Square는 Rectangle의 특수 케이스다. 그래서 상속이 자연스러워 보인다.

LSP 위반은 다음 코드에서 드러난다.

```java
void process(Rectangle r) {
  r.setWidth(5);
  r.setHeight(4);
  assert r.area() == 20;  // Rectangle이면 항상 참
}
```

이 코드에 `Square`를 넘기면 `r.area() == 16`이 된다. `setWidth(5)`가 `height`도 5로 바꾸고, `setHeight(4)`가 다시 `width`도 4로 바꿔서 4×4가 되니까.

`process` 함수의 가정 — "width를 5로 바꾸면 height에 영향이 없다" — 이 Square에서 깨진다.

따라서 **Square는 Rectangle의 LSP 서브타입이 아니다**. 수학적 is-a 관계와 LSP 서브타입 관계는 다르다.

## LSP는 단순한 상속 규칙이 아니다

이 정도까지는 OO 강의에서 자주 다루는 내용이다. Martin은 한 단계 더 나아간다.

LSP는 **클래스 상속에만 적용되는 원칙이 아니다.** 인터페이스 계약을 따르는 모든 상황에 적용된다.

- 클래스 계층
- 인터페이스 구현
- 두 REST API 엔드포인트 ("이건 저거와 호환이라며")
- 두 라이브러리 ("같은 일을 한다며")

부모의 자리에 자식을 넣을 때, **자식이 부모의 모든 가정을 만족하지 않으면 LSP 위반**이다.

## 아키텍처 차원의 LSP — 택시 디스패치

Martin은 아키텍처 차원 예를 든다. 택시 디스패치 서비스를 짓는다고 하자.

```
[디스패처]  ←──  여러 택시 회사
              - Acme Taxi (REST API 1)
              - Yellow Cab (REST API 2)
              - Lyft (REST API 3)
              ...
```

디스패처는 회사에 무관하게 같은 방식으로 호출하길 원한다. 따라서 모든 회사가 같은 인터페이스를 따라야 한다.

```
PUT /driver/{id}/pickup
  body: {customer, location, ...}
```

대부분의 회사가 이 인터페이스를 잘 따른다. 그런데 한 회사 — Acme — 만 약간 다르다.

```
PUT /driver/{id}/pickupAddress  // 약간 다름
```

이걸 단순히 "Acme는 좀 다른 endpoint" 정도로 처리한다 해 보자. 디스패처는 다음과 같이 짜진다.

```java
if (company == "Acme") {
  endpoint = "pickupAddress";
} else {
  endpoint = "pickup";
}
```

LSP 위반이다. **부모의 자리에 자식(Acme)을 넣을 때 정상 동작 안 한다**.

문제는 거기서 끝나지 않는다. 다른 회사가 또 다른 차이를 보이면, 또 다른 if-else가 추가된다. 시간이 지나면 디스패처는 회사별 특수 케이스의 덩어리가 된다.

이게 LSP 위반의 진짜 비용 — **특수 케이스의 폭발**.

## 인터페이스 + 구현, 둘 다 검증

LSP를 보장하려면 두 가지를 검증한다.

**1. 인터페이스 호환** — 시그니처가 같은가? (메서드 이름, 파라미터, 반환 타입)

**2. 행동 호환** — 부모의 가정(precondition, postcondition, invariant)을 자식이 만족하는가?

(1)은 컴파일러가 자동으로 잡아 준다. (2)는 컴파일러가 잡지 못한다 — **사람이 검증해야 한다**. 그래서 LSP 위반이 자주 발생한다.

## LSP를 어기는 가장 흔한 패턴

**1. 부모의 precondition을 강화한다**

부모는 0 이상의 입력을 받는데, 자식은 양수만 받는다. 부모를 기대하던 코드가 0을 보내면 자식에서 깨진다.

**2. 부모의 postcondition을 약화한다**

부모는 결과가 정렬된다고 보장하는데, 자식은 정렬을 보장하지 않는다. 부모를 기대하던 코드가 정렬을 가정하면 자식에서 깨진다.

**3. 부모의 invariant를 깬다**

부모는 어떤 상태도 유지하는데, 자식은 그 invariant를 깰 수 있다.

**4. 부모는 던지지 않는 예외를 자식이 던진다**

부모를 기대하던 코드가 그 예외를 처리하지 못한다.

## "is-a" 보다 "behaves-like-a"

전통적인 OO 가르침 — "is-a 관계면 상속이다". Martin은 이 가르침이 위험하다고 본다.

is-a는 종종 직관적이지만, LSP 관점에서는 **behaves-like-a**가 더 정확하다.

- Square is-a Rectangle (수학적)
- 그러나 Square가 Rectangle처럼 **행동하지 않는다** (setWidth 등에서)
- 따라서 LSP 서브타입 관계는 아니다

"이 자식이 부모의 모든 행동 가정을 만족하는가?"가 진짜 질문이다.

## 정리

- LSP — **서브타입은 부모타입의 자리에 대체 가능해야**
- Square / Rectangle 안티 예 — 수학적 is-a ≠ LSP 서브타입
- 클래스 상속뿐 아니라 **인터페이스 계약을 따르는 모든 곳**에 적용
- 위반의 비용 — **특수 케이스의 폭발**
- 흔한 위반 — precondition 강화 / postcondition 약화 / invariant 위반 / 새 예외
- is-a보다 **behaves-like-a**가 정확한 기준

## 다음 장 예고

다음 장은 **ISP** — Interface Segregation Principle. 클라이언트가 안 쓰는 메서드에 의존하게 두지 마라.

## 관련 항목

- [C++ Software Design 가이드라인 6: 기대 행동 준수](/blog/programming/cpp/cpp-software-design/guideline06-adhere-to-the-expected-behavior-of-abstractions) — LSP의 다른 표현
- [Refactoring Ch 12: 상속](/blog/programming/design/refactoring/ch12) — Replace Subclass with Delegate
- [Effective C++ 항목 32-40](/blog/programming/cpp/effective-cpp/) — 상속과 OO 디자인
