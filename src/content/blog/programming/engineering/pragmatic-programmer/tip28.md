---
title: "Tip 28: Always Use Version Control"
date: 2026-05-13
description: "항상 버전 관리를 써라 — 코드만이 아니라, 글·설정·문서까지."
series: "The Pragmatic Programmer"
seriesOrder: 28
tags: [pragmatic-programmer, tools]
---

## 이 팁의 메시지

> **Always Use Version Control** — 항상. 모든 것을.

## 핵심 내용

- 모든 텍스트 자산 — 버전 관리.
- 코드 + 설정 + 문서 + 빌드 스크립트.
- 한 명 프로젝트도 — 버전 관리.
- 히스토리 = **시간 여행**.

## 모든 것에

- **코드** — 당연.
- **설정** — `.env`(시크릿 제외).
- **문서** — Markdown.
- **빌드** — Makefile, CI 설정.
- **인프라** — Terraform, IaC.
- **데이터 스키마** — migration.

## 버전 관리의 이점

- **시간 여행** — 옛 버전 복원.
- **누가·왜·언제** — `git blame`/`git log`.
- **분기** — 위험한 실험을 — 분기에서.
- **협업** — 변경의 충돌 해결.

## 한 명 프로젝트도

> "혼자 작업하니까 — 버전 관리 X." → 함정.

미래의 자기가 — 옛 결정의 맥락을 모른다. 버전 관리는 — **자기와의 협업** 도구.

## Git

가장 보편적. 다른 옵션(Mercurial, SVN)도 있지만 — Git이 사실상의 표준.

## 정리

- 모든 텍스트 — 버전 관리.
- 한 명도 — 필수.
- 히스토리 = 시간 여행.

## 관련 항목

- [Tip 25: Plain Text](/blog/programming/engineering/pragmatic-programmer/tip25)
- [Tip 27: Editor Fluency](/blog/programming/engineering/pragmatic-programmer/tip27)
- [Tip 29: Fix the Problem](/blog/programming/engineering/pragmatic-programmer/tip29)
- [Code Complete Ch 30: Programming Tools](/blog/programming/engineering/code-complete/ch30-Programming-Tools)
