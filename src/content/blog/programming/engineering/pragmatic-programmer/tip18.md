---
title: "Tip 18: There Are No Final Decisions"
date: 2026-05-13
description: "최종 결정은 없다 — 모든 결정은 가역적이라 가정하고 설계하라."
series: "The Pragmatic Programmer"
seriesOrder: 18
tags: [pragmatic-programmer, design]
draft: true
---

## 이 팁의 메시지

> **There Are No Final Decisions** — 어제 영원한 결정이 — 오늘 안티 패턴.

## 핵심 내용

- 영원한 결정 = 신화.
- 가역 가능성 = 좋은 설계의 표시.
- 결정을 **격리**한다(추상·인터페이스).
- 변할 결정을 — 한 자리에 두라.

## 어제의 영원 → 오늘의 안티

- "MongoDB가 영원" → SQL로 다시 옮김.
- "REST가 영원" → GraphQL.
- "AngularJS가 영원" → React.
- "VMs가 영원" → 컨테이너.

영원하다 가정한 결정 = 가장 비싼 부채.

## 가역 가능성 설계

- 데이터베이스 → 리포지토리 패턴 뒤에.
- 외부 API → 어댑터 뒤에.
- 프레임워크 → 핵심 도메인 밖에.
- 클라우드 제공자 → 추상 계층 뒤에.

## "결정"의 비용

- 결정 자체의 비용.
- 결정을 — 바꾸는 비용.

두 비용 중 — 두 번째가 더 자주 무시된다.

## 정리

- 영원한 결정 = 신화.
- 가역 가능성 = 좋은 설계.
- 결정을 격리, 한 자리에.

## 관련 항목

- [Tip 17: Orthogonality](/blog/programming/engineering/pragmatic-programmer/tip17)
- [Tip 19: Forgo Following Fads](/blog/programming/engineering/pragmatic-programmer/tip19)
- [Clean Architecture: Dependency Rule](/blog/programming/design/clean-architecture/)
