---
title: "Pattern 31: Exception Test"
date: 2026-07-02T07:00:00
description: "Exception·error 경로 검증."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 31
tags: [xunit, exception-test, error-path, beck]
draft: true
---

* Outline — *Exception이 *언제·왜* 던져지는지 test*. *assertRaises·@Test(expected=)·shouldThrow·pytest.raises*. *Error message 검증·exception type 정확*. *Common pitfall* — try/catch 손 코딩 vs framework 사용. *Negative path 강조 — robustness*. ch29 §5.
