---
title: "Ch 8: Building on Third-Party Code"
date: 2026-10-12T01:00:00
description: "외부 라이브러리 — 직접 모킹 X. ACL / wrapper로 격리."
tags: [TDD, Third-Party, Wrapper]
series: "Growing Object-Oriented Software"
seriesOrder: 8
draft: true
---

## 예정 내용
- 외부 코드를 mock하지 말 것 (don't mock types you don't own)
- thin wrapper 작성
- wrapper만 단위 테스트
- 통합 테스트로 wrapper + 실제 외부 검증
- ACL (Anti-Corruption Layer) — DDD와 결합
