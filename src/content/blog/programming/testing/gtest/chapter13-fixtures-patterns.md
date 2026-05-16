---
title: "Ch 13: Test fixtures 패턴"
date: 2026-05-21T13:00:00
description: "SetUp·TearDown·SetUpTestSuite·Global Environment의 lifecycle과 공유 패턴."
series: "gtest 심화"
seriesOrder: 13
tags: [gtest, fixture, setup, teardown, environment]
draft: true
---

> Outline — fixture 객체는 *각 테스트마다 새로* 생성. *비싼 resource* 공유 — `SetUpTestSuite`/`TearDownTestSuite`(suite 단위). `testing::Environment` 등록(`AddGlobalTestEnvironment`)으로 *프로세스 단위*. 함정 — suite-level state 변경의 *test 순서 의존* 위험.
