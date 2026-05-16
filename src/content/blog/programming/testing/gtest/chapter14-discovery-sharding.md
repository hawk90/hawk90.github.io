---
title: "Ch 14: Test discovery·sharding·필터링"
date: 2026-05-21T14:00:00
description: "--gtest_filter, sharding, parallel run — 큰 테스트 스위트를 빠르게."
series: "gtest 심화"
seriesOrder: 14
tags: [gtest, sharding, filter, parallel]
draft: true
---

> Outline — `--gtest_filter=Suite.*:-*Slow*` glob 패턴. `GTEST_SHARD_INDEX`/`GTEST_TOTAL_SHARDS`로 *CI 병렬화*. `ctest -j`와의 조합. `--gtest_list_tests`로 *목록만 출력*. `--gtest_repeat`로 flaky 감지.
