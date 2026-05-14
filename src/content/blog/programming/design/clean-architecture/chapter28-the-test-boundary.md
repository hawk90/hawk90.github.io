---
title: "Ch 28: 테스트 경계"
date: 2025-06-02T04:00:00
description: "테스트도 시스템의 일부다. Fragile test 문제 — 시스템 변경에 테스트가 무너지지 않게 경계를 설계한다."
tags: [Architecture, Testing, TestBoundary]
series: "Clean Architecture"
seriesOrder: 28
draft: true
---

## 이 챕터의 메시지

대부분의 책이 테스트를 별도 활동으로 다룬다. Martin은 다른 시각을 제시한다.

> **테스트는 시스템 컴포넌트다.**

즉 22장의 동심원 다이어그램에서 테스트도 한 자리를 차지한다. 가장 바깥쪽 — Frameworks & Drivers와 같은 층에.

이 시각이 중요한 이유는 — **테스트도 의존성 규칙을 따라야 한다**는 것이다.

## 테스트의 위치

```
                        ┌────────────────────────┐
                        │  Frameworks & Drivers   │
                        │  + Tests                │  ← 테스트가 여기
                        │                        │
                        │   ┌──────────────────┐ │
                        │   │ Interface Adapters│ │
                        │   │                  │ │
                        │   │   ┌────────────┐ │ │
                        │   │   │ Use Cases   │ │ │
                        │   │   │             │ │ │
                        │   │   │  ┌────────┐ │ │ │
                        │   │   │  │Entities │ │ │ │
                        │   │   │  └────────┘ │ │ │
                        │   │   └────────────┘ │ │
                        │   └──────────────────┘ │
                        └────────────────────────┘
```

테스트는 시스템의 어떤 부분이든 호출할 수 있다 (가장 바깥). 그러나 다른 어떤 컴포넌트도 테스트에 의존하지 않는다 (단방향).

## Fragile Test 문제

테스트가 시스템의 구조에 강하게 결합되면 다음이 발생한다.

```
시스템의 작은 변경 → 100개 테스트가 깨짐
```

이게 fragile test 문제다. 테스트가 너무 fragile하면 두 가지 결과가 생긴다.

1. **테스트를 안 고침** — 시스템 변경 시 테스트는 그냥 무시. 결국 테스트 가치 0.
2. **시스템을 안 바꿈** — 테스트 깨질까 봐 변경을 피함. 시스템이 고착됨.

둘 다 나쁘다. 좋은 테스트는 시스템 변경에 **둔감**해야 한다.

## 왜 Fragile하나

흔한 원인 — **테스트가 시스템의 구체 구현에 너무 가깝게 짜여 있다**.

```java
// 너무 fragile한 테스트
@Test
public void test() {
  // 비공개 메서드 호출
  ReflectionUtil.invoke(service, "privateMethod", ...);
  
  // 구체 클래스 타입 검사
  assertTrue(result instanceof MyConcreteClass);
  
  // 내부 필드 접근
  assertEquals(42, ReflectionUtil.getField(service, "internalCounter"));
}
```

이 테스트는 시스템의 **내부 디테일**에 결합되어 있다. 그 디테일이 바뀌면 테스트가 깨진다 — 시스템의 동작이 그대로여도.

## 좋은 테스트 — 인터페이스를 통한 호출

해법은 **공개 인터페이스만 사용**하는 테스트.

```java
@Test
public void test() {
  // 공개 API 호출
  Result result = service.process(input);
  
  // 공개 동작 검증
  assertEquals(expected, result);
}
```

이 테스트는 시스템의 행동만 검증한다. 내부 구현이 어떻게 바뀌든 동일한 입력에 같은 출력이 나오면 통과.

이게 가능하려면 시스템에 **테스트하기 적합한 API**가 있어야 한다.

## Testing API

Martin은 **Testing API**라는 별도 컨셉을 권한다.

```
[Application]
   ↑
   │ Testing API (테스트 전용 인터페이스)
   │
[Tests]
```

Application과 Tests 사이에 명시적인 인터페이스를 두고, 테스트는 그 인터페이스만 사용한다. 시스템 내부는 자유롭게 변경 가능.

Testing API의 책임:
- 테스트하기 쉬운 형태로 시스템 접근 제공
- 부수 효과 격리 (DB, 외부 API mock)
- 테스트별 상태 setup / teardown

이 API가 잘 정의되면 테스트의 안정성이 높아진다.

## 구조적 결합 회피

Martin이 강조하는 두 가지 결합 종류.

**1. 구조적 결합 (Structural Coupling)**

테스트가 시스템의 클래스 구조, 메서드 시그니처 등에 직접 결합.

```
ServiceA → AHelper → ALowLevel
   ↑           ↑          ↑
   │           │          │
TestA      TestHelper  TestLowLevel
```

시스템 안 모든 클래스마다 대응되는 테스트. 시스템 구조가 바뀌면 테스트 구조도 바뀌어야 한다.

**2. 행동적 결합 (Behavioral Coupling)**

테스트가 시스템의 **행동**(공개 API의 입출력)에만 결합.

```
[System] (구조는 자유)
   ↑
   │ public API
   │
[Tests]
```

시스템 구조가 바뀌어도 행동이 같으면 테스트는 그대로.

좋은 테스트는 **행동적 결합**을 추구한다. 구조적 결합은 피한다.

## 테스트도 SOLID

테스트 자체도 코드다. SOLID를 적용한다.

- **SRP** — 한 테스트는 한 시나리오만
- **OCP** — 새 테스트 케이스 추가가 기존 테스트를 안 바꿔야
- **DRY 신중** — 7장의 우발적 중복 vs 진짜 중복 (같은 actor 변경 → 합치고, 다른 actor → 분리)
- **DIP** — 테스트가 추상에 의존

테스트 코드를 잘 짜면 시스템 코드보다 더 오래 가치를 유지한다. 시스템은 리팩터링되어도 테스트의 행동 기대는 같다.

## 정리

- **테스트는 시스템 컴포넌트** — 가장 바깥쪽 층
- 의존 단방향 — 테스트가 시스템에, 그 반대 아님
- **Fragile test 문제** — 시스템의 구체에 강하게 결합되면 발생
- 해법 — **공개 인터페이스만 사용**, **행동적 결합** 추구
- **Testing API** — 시스템과 테스트 사이의 명시적 인터페이스
- 테스트도 SOLID, 테스트도 리팩터링

## 다음 장 예고

다음 장은 **Clean Embedded Architecture** — 임베디드 시스템에서 Clean Architecture의 적용.

## 관련 항목

- [Ch 22: The Clean Architecture](/blog/programming/design/clean-architecture/chapter22-the-clean-architecture)
- [Refactoring Ch 4: 테스트 구축](/blog/programming/design/refactoring/ch04)
- [C++ Software Design 가이드라인 4: 테스트성](/blog/programming/cpp/cpp-software-design/guideline04-design-for-testability)
