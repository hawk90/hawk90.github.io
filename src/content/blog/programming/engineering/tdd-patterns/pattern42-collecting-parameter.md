---
title: "Pattern 42: Collecting Parameter"
date: 2026-07-02T18:00:00
description: "Collect 결과를 parameter로 전달 — visitor·report."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 42
tags: [tdd, beck, collecting-parameter, builder]
draft: true
---

> Outline — *결과를 누적할 *컬렉터 객체를 parameter로 전달*·각 recursive call·collaborator가 add. *Return value 대신 mutate parameter*. *Tree·graph traversal·report 생성*. *xUnit의 TestResult가 collecting parameter*. *StringBuilder도 같은 정신*. ch30 §10.
