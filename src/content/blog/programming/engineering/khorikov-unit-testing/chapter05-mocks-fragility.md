---
title: "Ch 5: Mocks and Test Fragility"
date: 2026-10-16T02:00:00
description: "Mock 종류 — Dummy / Stub / Spy / Mock / Fake. 4 communications + observable / 비-observable."
tags: [TDD, Mock, Stub, Fake]
series: "Khorikov Unit Testing"
seriesOrder: 5
draft: true
---

## 예정 내용
- 5 종류 — Dummy / Stub / Spy / Mock / Fake (Meszaros)
- 의존 분류 — observable vs non-observable
- Mock — 결과를 외부에 알리는 동작에만
- Stub — 입력 데이터 제공
- 책의 규칙 — Don't mock managed deps (DB, files), mock unmanaged (HTTP, queue)
