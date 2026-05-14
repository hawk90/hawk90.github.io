---
title: "Tip 16: Make It Easy to Reuse"
date: 2026-05-13T16:00:00
description: "재사용을 쉽게 하라 — 재사용이 어려우면 사람들은 — 다시 짠다(중복 발생)."
series: "The Pragmatic Programmer"
seriesOrder: 16
tags: [pragmatic-programmer, design]
draft: true
---

## 이 팁의 메시지

> **Make It Easy to Reuse** — 재사용이 어려우면 — DRY는 깨진다.

DRY와 짝. 재사용이 어려운 코드는 — 사람들이 **다시 짠다**. 결과 = 중복.

## 핵심 내용

- 재사용 가능 ≠ 재사용 쉬움.
- 어려우면 = 사람들이 — 안 쓴다.
- 안 쓰면 = 새 자리에서 — 다시 짠다.
- DRY를 지키려면 — **재사용을 쉽게** 만들라.

## 재사용을 어렵게 하는 자리

- 모듈이 — 검색 못 함.
- 의존성이 — 무겁다.
- 설정이 — 복잡.
- 문서가 — 없거나 부패.
- 인터페이스가 — 직관적이지 X.

## 재사용을 쉽게 하는 자리

- **발견** — 검색·인덱스.
- **설치** — 한 줄(`npm install`, `cargo add`).
- **사용** — 명확한 예제.
- **문서** — 빠른 출발 가이드.

## 팀 안에서

- 공통 유틸리티 — 한 자리.
- 패키지화 — 다른 프로젝트에서 임포트 쉽게.
- 발표 — 새 유틸이 생기면 알린다.

## 정리

- 재사용 가능 + 쉬움 = 둘 다 필요.
- 어려우면 — 사람들이 다시 짠다.
- DRY와 짝 — 재사용을 쉽게.

## 관련 항목

- [Tip 15: DRY](/blog/programming/engineering/pragmatic-programmer/tip15)
- [Tip 17: Orthogonality](/blog/programming/engineering/pragmatic-programmer/tip17)
- [Code Complete Ch 6: Working Classes](/blog/programming/engineering/code-complete/ch06-Working-Classes)
