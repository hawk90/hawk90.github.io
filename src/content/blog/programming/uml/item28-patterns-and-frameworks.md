---
title: "UML 28: 패턴과 프레임워크 — 매개변수화된 협력"
date: 2026-07-06T13:00:00
description: "GoF 패턴을 UML로 — 매개변수화된 협력으로 디자인 솔루션 재사용."
tags: [UML, Design Pattern, Framework, Collaboration]
series: "UML User Guide"
seriesOrder: 28
draft: false
---

## 한 줄 요약

> **"패턴 = 이름을 가진 매개변수화된 협력"** — Observer, Strategy, MVC를 UML로 정확히 그릴 수 있다.

## 어떤 문제를 푸는가

GoF 23개 패턴을 그릴 때 매번 클래스 박스를 새로 그리고 싶지 않습니다. **이 시스템에 Observer를 적용했다**는 사실을 간결히 표현하고 싶습니다.

UML의 **매개변수화된 협력**이 그 답.

## 한눈에 보는 예시

![Pattern application](/images/blog/uml/diagrams/item28-pattern-application.svg)

- 점선 타원 = Observer 패턴
- StockTicker가 Subject 역할
- PriceChart가 Observer 역할

이 한 다이어그램만 봐도 "이 시스템에 Observer가 적용됐고, 두 클래스가 그 역할을 한다"가 명확.

## 패턴 정의

패턴은 두 부분으로 구성됩니다.

### 1. 매개변수 (Template Parameters)

협력 점선 타원의 우상단 박스에 표시.

```
[Subject, Observer]
   Observer 패턴
```

- 패턴 사용 시 채워야 할 자리.

### 2. 구조 + 행위

협력의 두 면(27편)을 패턴 정의 안에 담습니다.

```
Observer 패턴 정의:

  구조:
    :Subject ── notifies ─→ :Observer

  행위 (시퀀스):
    Subject.setState() 
       → Subject.notify()
          → for each obs:
             obs.update()
```

## 패턴 적용 (Binding)

```
StockTicker → Subject
PriceChart  → Observer
```

이 두 클래스가 점선 타원에 연결되며 역할을 채우면 "패턴 적용 완료".

## GoF 패턴 UML로 — 5가지 예

### 1. Singleton

```
[Instance]
  ┌─────────┐
  │ Logger  │ ← Instance 역할
  └─────────┘
```

매개변수는 보통 클래스 자체.

### 2. Strategy

```
[Context, Strategy]
   Strategy 패턴

OrderProcessor ──Context
ShippingCalc   ──Strategy 인터페이스
ExpressShip    ──Strategy 구현
StandardShip   ──Strategy 구현
```

### 3. Observer

위 예시와 동일.

### 4. Factory Method

```
[Creator, Product]
   Factory Method 패턴

DocumentApp  ──Creator
TextDocument ──Product
```

### 5. Composite

```
[Component, Leaf, Composite]
   Composite 패턴
```

## 프레임워크 = 큰 패턴 묶음

프레임워크는 본질적으로 **여러 협력을 미리 결정해 둔 코드**입니다.

```
Spring 프레임워크
  ┌── DI 협력 ─────────┐
  │ IoC Container...   │
  ├── AOP 협력 ─────────┤
  │ Pointcut, Advice...│
  ├── MVC 협력 ─────────┤
  │ Controller, View...│
  └────────────────────┘
```

UML로 프레임워크를 그릴 때 협력 집합으로 봅니다. 사용자는 빈자리(extension point)에 자기 코드를 채움.

## Hot Spot vs Frozen Spot

- **Frozen Spot** — 프레임워크가 다 만들어둔 부분 (고정)
- **Hot Spot** — 사용자가 채워야 하는 부분 (매개변수)

UML 협력의 매개변수 = 프레임워크의 hot spot.

## 자주 하는 실수

> ⚠️ 패턴을 다 그리고 다시 클래스 다이어그램에서 다 그리기

협력 점선 타원 하나로 충분할 때가 많습니다. **요약 표기**의 강점을 살리세요.

> ⚠️ 패턴 이름 안 적기

타원에 이름 없으면 그냥 추상 협력. **GoF 이름**(Observer, Strategy 등)을 정확히 적어야 의도가 전달됩니다.

> ⚠️ 매개변수 바인딩 누락

"이 시스템에 Observer를 적용했다"고 하려면 어떤 클래스가 어떤 역할인지 표시해야. 점선 화살표로 역할 매핑.

## 정리

- 패턴은 **매개변수화된 협력** — 이름 + 매개변수 + 구조 + 행위.
- 적용 시 **바인딩**으로 역할에 구체 클래스를 매핑.
- 프레임워크는 **여러 협력의 묶음** — frozen + hot spot.
- 다이어그램 가독성에 강력: 점선 타원 하나로 전체 디자인 의도를 전달.

다음 편은 **컴포넌트 다이어그램** — 컴포넌트와 인터페이스를 한 그림에.
