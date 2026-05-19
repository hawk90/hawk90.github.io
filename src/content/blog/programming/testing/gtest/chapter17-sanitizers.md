---
title: "Ch 17: Sanitizers와 gtest"
date: 2026-05-10T17:00:00
description: "ASan·TSan·UBSan을 gtest와 결합 — 메모리·동시성·UB 검출."
series: "gtest 심화"
seriesOrder: 17
tags: [gtest, sanitizer, asan, tsan, ubsan]
draft: true
---

> Outline — `-fsanitize=address,undefined`로 빌드된 테스트가 *실행 시* 위반을 검출. TSan은 별도 빌드(다른 sanitizer와 충돌). gtest의 `death test`와 sanitizer 상호작용 함정. CI에서 *세 가지 빌드*(normal / asan+ubsan / tsan)를 돌리는 표준 패턴.
