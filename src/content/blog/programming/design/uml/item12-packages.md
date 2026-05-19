---
title: "UML 12: 패키지 — 모델의 폴더, 가시성, 의존 관리"
date: 2026-05-03T12:00:00
description: "모델이 커지면 폴더가 필요하다 — 패키지로 가시성·의존·이름공간을 관리."
tags: [UML, Package, Modularity, Architecture]
series: "UML 2.5.1"
seriesOrder: 12
draft: false
---

## 한 줄 요약

> **"모델의 폴더"** — 패키지는 클래스를 묶고, 이름공간을 만들고, 의존 관계를 그릴 단위가 된다.

## 어떤 문제를 푸는가

클래스 30개를 한 다이어그램에 다 그릴 수 없습니다. 묶고 줄여야 합니다.

자바의 `package`, C++의 `namespace`, C#의 `namespace`처럼 UML도 **패키지(Package)**라는 그루핑 단위를 가집니다.

## 한눈에 보는 구조

![Package dependency](/images/blog/uml/diagrams/item12-packages.svg)

위 그림은 4계층 아키텍처를 패키지로 표현한 예. **의존 방향이 한쪽**(UI → App → Domain)이라는 것이 한눈에 보입니다.

## 패키지 표기

폴더 탭 모양 — 위에 작은 탭, 아래 큰 박스.

<img src="/images/blog/uml/diagrams/item12-package-symbol.svg" alt="UML 패키지 기호 — Sales 패키지 안의 멤버들" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

박스 안에 클래스 이름을 직접 적거나, 박스 안에 또 다른 클래스 박스를 그릴 수 있습니다.

## 패키지 가시성

패키지의 멤버에도 가시성이 있습니다.

- `+` public — 다른 패키지에서 import 가능
- `-` private — 같은 패키지 안에서만 사용
- `#` protected — 자식 패키지에서 사용
- `~` package — 같은 패키지 안 (가장 기본)

API/구현 분리를 표현하는 핵심 도구.

## 패키지 의존

```
[Sales] ──┈┈▶ [Common]
```

점선 화살표(`<<use>>`, `<<import>>`)로 의존을 표현. 의존은 다음을 만들지 말아야 합니다.

- **순환** — A → B → A 는 안 됨. 한 단위로 합치거나 인터페이스를 빼서 끊는다.
- **거꾸로** — 하위 계층이 상위 계층을 알면 안 됨 (Dependency Inversion).

### Import vs Access

- `<<import>>` — 가져오는 쪽이 그 패키지의 **public 멤버를 자기 이름공간**으로 들임 (Java `import a.b.*`).
- `<<access>>` — 사용만 하고 이름공간엔 안 들임 (full-qualified name 사용).

## 모델 구조화 패턴

### 1. Layered

```
[UI] → [App] → [Domain] → [Infrastructure]
                ↑__________|
```

상위 → 하위 단방향 의존. Infrastructure는 Domain의 인터페이스만 구현.

### 2. Hexagonal (Ports & Adapters)

<img src="/images/blog/uml/diagrams/item12-hexagonal-arch.svg" alt="Hexagonal Architecture — Driving · Core · Driven" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

Domain이 가운데, 양쪽에서 어댑터가 들어옴.

### 3. Onion / Clean

<img src="/images/blog/uml/diagrams/item12-onion-layers.svg" alt="레이어드 아키텍처 — Domain(최내곽) 향한 의존" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

내곽 → 외곽 방향으로 의존 금지. UML 패키지 다이어그램으로 이 규칙을 시각화합니다.

## 패키지 머지·결합

UML은 패키지 간 합성도 지원합니다.

- `<<merge>>` — 두 패키지의 정의를 합쳐 새 정의 생성
- `<<import>>` — 가져옴
- `<<access>>` — 접근

대규모 모델에서 변종(variant)을 관리할 때 유용.

## 자주 하는 실수

> ⚠️ 패키지가 하나의 거대한 상자

100개 클래스를 한 패키지에 넣으면 패키지 의미가 없습니다. **응집도** 높은 단위로 쪼개세요.

> ⚠️ 순환 의존

UI ↔ App ↔ UI 같은 순환은 코드를 따라 자라기 쉽지만 모델에서 잡아야 합니다. 한 방향으로 정리하세요.

> ⚠️ 의존 화살표 없이

패키지만 그리고 의존을 안 그리면 그건 폴더 구조도일 뿐입니다. **의존 방향**이 핵심.

## 정리

- 패키지는 **모델의 폴더 + 이름공간 + 가시성 단위**.
- 멤버 가시성 `+ - # ~`은 클래스와 같다.
- 의존은 **단방향**, 순환 금지.
- `<<import>>`, `<<access>>`, `<<merge>>`로 패키지 간 결합을 표현.
- 계층/육각형/온더로 구조화한 다음 패키지 다이어그램으로 시각화.

다음 편은 **인스턴스** — 클래스가 아니라 특정 시점의 객체.
