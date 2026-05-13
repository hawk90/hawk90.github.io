---
title: "Ch 9: Mocking Best Practices"
date: 2026-10-17T03:00:00
description: "Mock — system 경계에서만. 단일 entry point. 자체 wrapper."
tags: [Testing, Mock, Best Practices]
series: "Khorikov Unit Testing"
seriesOrder: 9
draft: true
---

## 예정 내용
- Mock — 항상 시스템 경계에서
- Use mocks on the edge — 깊은 내부 X
- 한 객체에 mock 너무 많음 = 디자인 신호
- IDomainEvents / Result 패턴 — communication 줄임
- 자체 wrapper 만들어 자체 인터페이스 mock
