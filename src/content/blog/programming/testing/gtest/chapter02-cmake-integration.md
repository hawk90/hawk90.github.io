---
title: "Ch 2: 설치와 CMake 통합"
date: 2026-05-10T02:00:00
description: "gtest를 프로젝트에 붙이는 표준 워크플로 — FetchContent, gtest_discover_tests, version pinning."
series: "gtest 심화"
seriesOrder: 2
tags: [gtest, cmake, fetchcontent, build]
draft: true
---

> Outline — `FetchContent_Declare(googletest GIT_TAG v1.14.0)` 패턴. `enable_testing()` + `gtest_discover_tests(target)` 자동 등록. system-install vs source-build 비교. *version pinning*의 중요성. cross-compile 환경에서의 함정.
