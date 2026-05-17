---
title: "Pattern 2: Isolated Test"
date: 2026-07-01T02:00:00
description: "Test가 서로에게 의존하면 안 된다."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 2
tags: [tdd, beck, isolated-test, independence]
draft: true
---

> Outline — *각 test는 독립적*·order에 영향 받지 않게. *Shared state·global 회피*. *setUp·tearDown으로 fresh fixture*. *순서가 의미 있으면 separate suite*. *결과* — 부분 failure 분석 쉬움·flaky test 회피. ch25 §2.
