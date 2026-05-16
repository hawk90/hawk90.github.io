---
title: "Ch 9: Death tests"
date: 2026-05-21T09:00:00
description: "EXPECT_DEATH·ASSERT_DEATH — 의도된 종료(assert/abort/exit) 검증."
series: "gtest 심화"
seriesOrder: 9
tags: [gtest, death-test, abort, regex]
draft: true
---

> Outline — *fork* 기반 death test와 *thread-safe* 모드. regex가 *플랫폼별*로 달라 함정. `EXPECT_DEBUG_DEATH`로 NDEBUG 처리. *왜 critical*인가 — `assert()` / `LOG(FATAL)` / contract 검증에 유일한 도구.
