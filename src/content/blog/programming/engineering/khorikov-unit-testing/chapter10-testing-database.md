---
title: "Ch 10: Testing the Database"
date: 2026-10-17T04:00:00
description: "DB 통합 테스트 — 실제 DB / 격리 / 결정성. 트랜잭션 / 스냅샷."
tags: [Testing, Database]
series: "Khorikov Unit Testing"
seriesOrder: 10
draft: true
---

## 예정 내용
- DB 실제 사용 (in-memory X)
- 테스트 격리 — DB 트랜잭션 rollback, 또는 매 테스트 reset
- 결정적 결과 보장
- 시드 데이터 빌더
- testcontainer / 도커
- 스키마 마이그레이션 테스트
