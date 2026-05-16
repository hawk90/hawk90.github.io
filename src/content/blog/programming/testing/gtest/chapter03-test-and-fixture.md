---
title: "Ch 3: TEST와 TEST_F — 기본 매크로와 fixture"
date: 2026-05-21T03:00:00
description: "gtest의 기본 단위 — TEST·TEST_F 매크로 확장과 등록 메커니즘."
series: "gtest 심화"
seriesOrder: 3
tags: [gtest, test, fixture, macro]
draft: true
---

> Outline — `TEST(SuiteName, TestName)` 매크로가 *전역 등록 객체*로 펴지는 모습. `TEST_F`가 fixture 클래스를 *상속*해 각 테스트마다 새 객체를 만드는 메커니즘. SuiteName naming 컨벤션 (`MyClassTest` 패턴).
