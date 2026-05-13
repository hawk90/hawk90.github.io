---
title: "UML 3: Hello, World — 가장 작은 클래스 다이어그램"
date: 2026-04-01T12:00:00
description: "이름·속성·연산 세 칸짜리 직사각형 — UML 클래스 표기법은 여기서 시작한다."
tags: [UML, Class Diagram, Notation, Fundamentals]
series: "UML User Guide"
seriesOrder: 3
draft: true
---

## 한 줄 요약

> **"세 칸 직사각형"** — 이름·속성·연산. UML 클래스 다이어그램은 이 한 박스에서 출발한다.

## 어떤 문제를 푸는가

프로그래밍을 처음 배울 때 "Hello, World!"를 찍어보듯, UML도 가장 작은 모델 하나를 그려보며 시작합니다.

```java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
```

이 코드를 UML로는 어떻게 표현할까요?

## 한눈에 보는 구조

![Hello World 클래스](/images/blog/uml/diagrams/item03-hello-world.svg)

UML 클래스는 **수직으로 3칸**짜리 직사각형으로 그립니다.

| 칸 | 내용 |
| --- | --- |
| 맨 위 | 클래스 이름 (굵게) |
| 가운데 | 속성 (attributes) — 필드 |
| 맨 아래 | 연산 (operations) — 메서드 |

`HelloWorld`엔 속성이 없으니 가운데 칸이 비어있습니다. 칸이 비어도 **칸 자체는 남겨둡니다** — 속성이 없음을 명시적으로 보여주는 것.

## 가시성 표기

연산 앞의 `+`는 **public**입니다. UML이 표준화한 4가지 가시성:

| 기호 | 의미 |
| --- | --- |
| `+` | public — 누구나 |
| `-` | private — 같은 클래스만 |
| `#` | protected — 자기 + 자식 |
| `~` | package — 같은 패키지만 |

C++/Java/C#이 다르더라도 이 4개 기호로 통일됩니다.

## 연산 시그너처

```
+ main(args : String[]) : void
```

UML의 연산 형식은 `[가시성] 이름(매개변수) : 반환타입`입니다.

- 매개변수는 `이름 : 타입`
- 반환 타입은 `:` 뒤에
- 생성자나 `void`도 동일 형식

언어별 차이(예: Java는 `void main(String[])`, C++는 `void main(int, char**)`)는 모두 UML로 옮길 때 표준 형식으로 통일됩니다.

## 같은 클래스, 다른 추상화 수준

UML 클래스는 보여주고 싶은 만큼만 보여줄 수 있습니다.

### 1) 이름만

상위 설계 단계 — "이런 게 있다"만 표현.

<img src="/images/blog/uml/diagrams/item03-hello-world-name-only.svg" alt="HelloWorld 클래스 — 이름만" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

### 2) 시그너처까지

설계 회의에서 인터페이스를 합의할 때.

<img src="/images/blog/uml/diagrams/item03-hello-world-with-ops.svg" alt="HelloWorld 클래스 — 시그너처까지" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

### 3) 구현 디테일까지

이미 짜놓은 코드를 역공학할 때 등.

<img src="/images/blog/uml/diagrams/item03-hello-world.svg" alt="HelloWorld 클래스 — 구현 디테일까지" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

> 💡 같은 클래스를 다른 다이어그램에서 다른 상세도로 그려도 됩니다 — 보고 싶은 면만 보여주는 게 UML의 원칙.

## 텍스트 명세

다이어그램에 안 보이는 것들은 **텍스트 명세**에 들어갑니다.

- 메서드 본문 동작 설명
- 사전·사후 조건
- 불변 조건 (invariants)
- 동시성 제약
- 예외

UML 도구는 보통 다이어그램 옆에 명세 패널을 띄워 보여줍니다. **그림은 일부, 명세가 전부**.

## 자주 하는 실수

> ⚠️ 가시성을 생략

가시성 기호 없이 그리면 표준상 의미가 정해지지 않습니다. 굳이 모두 public이라 가정하지 말고 `+`를 붙이세요.

> ⚠️ 코드의 모든 메서드를 다 적기

`getX()`, `setX()`, `toString()` 같은 자명한 것까지 다 적으면 핵심이 묻힙니다. **다이어그램은 보여주고 싶은 것만**.

> ⚠️ 매개변수 타입 누락

`+ login(id, pw)`가 아니라 `+ login(id : String, pw : Password)`. 타입을 적어야 UML 명세로 쓸 만합니다.

## 정리

- UML 클래스는 **이름·속성·연산** 3칸 직사각형이다.
- 가시성은 **`+ - # ~`** 네 기호로 통일.
- 연산은 **`이름(매개변수 : 타입) : 반환타입`** 형식.
- 다이어그램은 **추상화 수준을 골라** 그릴 수 있다 — 이름만, 시그너처까지, 풀 디테일까지.
- 그림에 없는 디테일은 **텍스트 명세**가 든다.

다음 편(Part 2)부터는 클래스를 본격적으로 다룹니다 — 속성/연산/책임/스테레오타입까지.
