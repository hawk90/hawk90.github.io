---
title: "Pattern 20: Crash Test Dummy"
date: 2026-07-01T20:00:00
description: "Error 처리를 test — 던지는 fake로 강제."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 20
tags: [tdd, beck, crash-test-dummy, error-handling]
draft: true
---

> Outline — *Error path 테스트 시 *exception을 던지는 fake collaborator* 사용*. *예* — disk full·network down·DB connection lost. *Production은 가끔만 일어남* — fake가 *결정적으로* 재현. *Robustness 검증의 표준 기법*. ch27 §5.
