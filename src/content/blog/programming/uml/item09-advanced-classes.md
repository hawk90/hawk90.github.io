---
title: "UML 9: 고급 클래스 — 분류자, 인터페이스, 데이터타입, 시그널, 액티브 클래스"
date: 2026-04-03T10:00:00
description: "클래스가 전부가 아니다 — UML 분류자(classifier) 패밀리 전체를 정리."
tags: [UML, Class Diagram, Classifier, Active Class]
series: "UML User Guide"
seriesOrder: 9
draft: false
---

## 한 줄 요약

> **"클래스는 분류자(classifier) 패밀리의 한 종류일 뿐"** — UML엔 클래스 외에도 인터페이스·데이터타입·시그널·액티브 클래스가 있다.

## 어떤 문제를 푸는가

도메인을 그리다 보면 "이건 클래스가 아닌데?" 싶은 것이 나옵니다.

- `Comparable` — 인스턴스가 없는, 행동의 약속만
- `Money(amount, currency)` — 같은 값이면 같은 것, 정체성이 없는 값
- `OrderPlaced` — 데이터 + 발생 이벤트
- `Scheduler` — 자기 스레드로 도는 능동적 객체

UML은 이들을 **분류자(classifier)**라는 상위 개념으로 묶고, 각각을 스테레오타입으로 구별합니다.

## 한눈에 보는 구조

![Advanced classes](/images/blog/uml/diagrams/item09-advanced-classes.svg)

## 분류자 종류

### 1. 클래스 (Class)

가장 흔한 분류자. 속성·연산·상태·정체성을 가집니다. **기본**입니다.

### 2. 인터페이스 (Interface)

`<<interface>>` 스테레오타입. 이름·연산이 이탤릭. 연산만 약속하고 구현은 없음.

```
<<interface>>
   Comparable
+ compareTo(o) : int
```

### 3. 데이터타입 (Datatype)

`<<datatype>>`. **값 의미(value semantics)**를 가지는 분류자. 동일성이 아니라 **동등성**으로 비교됩니다.

```
<<datatype>>
   Money
+ amount : Decimal
+ currency : String
```

DDD의 Value Object와 동일한 개념. `Money(1000, "KRW")` 두 인스턴스는 같습니다.

### 4. 시그널 (Signal)

`<<signal>>`. **비동기 이벤트**의 명세. 상태 머신·통신 다이어그램에서 객체 사이로 전송되는 메시지.

```
<<signal>>
   OrderPlaced
+ orderId : Long
+ at : DateTime
```

도메인 이벤트와 매핑됩니다.

### 5. 액티브 클래스 (Active Class)

**자기 실행 스레드를 가진** 클래스. 박스 테두리가 **두 줄**로 그려집니다.

```
+============+
|  Scheduler |
+============+
|  + tick()  |
+============+
```

ActiveX, Erlang 액터, 별도 스레드를 가진 서비스 등을 모델링할 때.

## 추가 꾸밈

### {root}, {leaf}, {abstract}

- `{root}` — 더 이상 상속받을 수 없음 (최상위)
- `{leaf}` — 더 이상 자식을 가질 수 없음 (Java `final`)
- `{abstract}` — 인스턴스화 불가

### 정적 멤버

밑줄(`_`)로 표시하거나 `{static}`을 붙입니다.

```
+ <u>instance() : Singleton</u>
+ MAX_RETRY : int {static}
```

### Pure interface vs Type

- **인터페이스** — 연산만, 속성 없음
- **타입** — 연산 + 속성 + 상태 (Java의 abstract class)

UML 2.x는 둘을 구분합니다.

## 자주 하는 실수

> ⚠️ 모든 클래스를 그냥 `class`로

값 객체는 `<<datatype>>`, 인터페이스는 `<<interface>>`로 표시하면 의도가 분명해집니다.

> ⚠️ 액티브 클래스를 일반 클래스로

스레드를 가진 클래스를 일반 클래스로 그리면 동시성 모델이 안 보입니다. 두 줄 테두리로 명시하세요.

> ⚠️ 시그널과 클래스를 같은 다이어그램에서 같은 표기로

도메인 이벤트(시그널)는 데이터 클래스와 의미가 다릅니다. `<<signal>>` 표시는 가능하면 붙이세요.

## 정리

- UML은 **분류자(classifier)**라는 우산 개념 아래 여러 종류를 둔다.
- **클래스 · 인터페이스 · 데이터타입 · 시그널 · 액티브 클래스** 다섯이 대표.
- `{root}`/`{leaf}`/`{abstract}` 같은 꾸밈으로 상속 정책을 표시.
- 정적 멤버는 **밑줄** 또는 `{static}`.

다음 편은 **고급 관계** — composition vs aggregation, 한정자, n항 관계, 연관 클래스.
