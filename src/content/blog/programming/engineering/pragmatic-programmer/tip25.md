---
title: "Tip 25: Keep Knowledge in Plain Text"
date: 2026-05-11T01:00:00
description: "지식을 평문으로 유지하라 — 바이너리 형식은 미래에 안 읽힌다."
series: "The Pragmatic Programmer"
seriesOrder: 25
tags: [pragmatic-programmer, tools]
draft: true
---

## 이 팁의 메시지

> **Keep Knowledge in Plain Text** — 지식은 — 평문(plain text)으로 저장.

## 핵심 내용

- 평문 = **영구**.
- 바이너리 = 도구에 묶임. 10년 후 — 못 읽음.
- 도구가 — 평문에 풍부.
- 사람이 — 읽고 쓸 수 있다.

## 평문의 이점

- **영구성** — 10년·20년 후에도 읽힘.
- **도구 다양성** — `grep`, `awk`, `sed`, `git`.
- **버전 관리** — diff·merge가 — 동작.
- **사람** — 직접 읽기·쓰기.

## 바이너리의 함정

- 특정 도구 — 폐기되면 — 못 연다.
- 버전 호환 — 깨질 수 있다.
- 검색 X.
- 부분 수정 X.

## 적용

- 설정 — JSON/YAML/TOML (평문).
- 문서 — Markdown.
- 데이터 — CSV/JSON (큰 데이터는 다른 형식 OK).
- 빌드 — Makefile/Gradle.

## "다 평문으로!" X

- 큰 이미지 — 평문 X (바이너리 OK).
- 영상·오디오 — 평문 X.
- 데이터베이스 — 평문 형식 X (export는 평문으로).

핵심 = **지식**(설정·문서·데이터 메타). 평문으로.

## 정리

- 지식 = 평문.
- 영구성·도구·버전 관리.
- 큰 미디어 데이터는 — 예외.

## 관련 항목

- [Tip 24: Iterate the Schedule](/blog/programming/engineering/pragmatic-programmer/tip24)
- [Tip 26: Power of Command Shells](/blog/programming/engineering/pragmatic-programmer/tip26)
- [Tip 28: Always Use Version Control](/blog/programming/engineering/pragmatic-programmer/tip28)
