---
title: "Ch 4: Assertions — ASSERT vs EXPECT"
date: 2026-05-10T04:00:00
description: "ASSERT_*와 EXPECT_*의 차이 — fatal vs non-fatal, predicate format, 사용 시점."
series: "gtest 심화"
seriesOrder: 4
tags: [gtest, assertion, expect, assert]
draft: true
---

> Outline — `ASSERT_*`(실패 시 즉시 return) vs `EXPECT_*`(계속 진행)의 의미와 함정. ASSERT를 *fixture 초기화 검증*에 쓰고 EXPECT를 *복수 검증*에 쓰는 패턴. `_THAT`(matcher) 변형. predicate format으로 *실패 메시지 자동 생성*.
