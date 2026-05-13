---
title: "Chapter 29: Integration"
date: 2025-06-21T05:00:00
description: "통합 — 부분을 모아 전체로. 점진적 통합이 빅뱅 통합보다 우월. CI/CD의 본질."
series: "Code Complete"
seriesOrder: 29
tags: [code-complete, integration, CI, McConnell]
---

## 이 챕터의 메시지

부분을 다 만들었어도 — **합쳐서 동작해야** 시스템이 완성된다. 통합 단계가 어떻게 진행되느냐가 — 프로젝트의 운명을 결정.

> 좋은 통합 = **점진적, 자동화, 매일**.

## 핵심 내용

- **점진적 통합** — 빅뱅 통합보다 우월.
- **CI** — 매 커밋에 자동 통합·검증.
- 통합 순서 — 위에서 아래(top-down), 아래에서 위(bottom-up), 또는 중간에서.
- **데일리 빌드** — 매일 작동하는 빌드.

## 빅뱅 vs 점진적 통합

### 빅뱅 통합 — 옛 방식

모든 부분을 따로 개발 → **한 번에 합침**.

문제:

- 통합 시 — 모든 인터페이스 결함이 한꺼번에 노출.
- 원인 추적 어려움.
- 통합 단계가 거대.

### 점진적 통합

부분을 만들 때마다 — **즉시 통합**.

장점:

- 결함을 작은 단위로 발견.
- 작동하는 시스템이 — 매 단계 존재.
- 진척이 가시화.

> McConnell의 권고 — **항상 점진적 통합**.

## 통합 순서

### Top-Down

위(고수준)부터 시작 — 아래(저수준) 자리는 **stub**으로 채움.

```
main() → service() → impl()
  ↑       stub        stub
```

장점: 고수준 흐름이 일찍 작동.
단점: stub 작성 비용.

### Bottom-Up

아래(저수준)부터 — 위 자리는 **test driver**.

```
impl()  ← test driver
service() ← test driver
main()
```

장점: 저수준이 빨리 검증.
단점: 전체 흐름이 마지막에 보임.

### Sandwich

위와 아래를 동시에 — 중간에서 만남.

대부분의 실제 프로젝트는 **혼합**.

## CI — Continuous Integration

> 매 커밋에 — **자동 빌드 + 테스트**.

### 도구

- **Jenkins, GitHub Actions, GitLab CI, CircleCI** — CI 서버.
- **빌드 도구** — Make, CMake, Maven, npm.
- **테스트 러너** — 단위·통합 자동 실행.

### 효과

- 결함을 **분 단위**로 발견.
- 항상 작동하는 빌드.
- 통합 부담이 — **매 커밋**으로 분산.

## 데일리 빌드

CI의 약한 버전 — **최소 매일 한 번** 빌드.

옛 권고:

- 누구든 빌드를 깰 수 있다.
- 깬 사람이 즉시 고친다.
- 안 고치면 — 모두가 멈춤.

CI가 자동화한 것이 — 이 원칙.

## 통합 테스트

단위 테스트 외 — **부분들이 합쳐졌을 때**의 테스트.

- API 간 호환성.
- 데이터 흐름.
- 시간 의존.
- 동시성.

## 빌드 깨짐 — 즉시 수정

> 빌드가 깨졌으면 — **그 자리 모든 일을 멈추고 고친다**.

이유:

- 깨진 빌드에 새 변경을 쌓으면 — 깨진 원인 찾기 어려움.
- 깨진 빌드는 — 팀 전체의 진행을 막음.

CI 시대엔 — **머지 전에 검증**. 깨진 채로 머지되지 않음.

## 정리

- **점진적 통합**이 빅뱅보다 우월.
- **CI** — 매 커밋 자동 통합·검증.
- 통합 순서 — top-down, bottom-up, sandwich.
- 빌드 깨짐 = **즉시 수정**.
- 매일 작동하는 빌드를 유지.

## 관련 항목

- [Ch 28: Managing Construction](/blog/programming/engineering/code-complete/ch28-Managing-Construction)
- [Ch 30: Programming Tools](/blog/programming/engineering/code-complete/ch30-Programming-Tools)
