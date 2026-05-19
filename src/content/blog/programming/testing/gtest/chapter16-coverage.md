---
title: "Ch 16: Coverage — gcov·lcov·llvm-cov"
date: 2026-05-10T16:00:00
description: "line vs branch coverage, 도구 비교, CI 게이트 설정."
series: "gtest 심화"
seriesOrder: 16
tags: [gtest, coverage, gcov, lcov, llvm-cov]
draft: true
---

> Outline — `-fprofile-arcs -ftest-coverage` 또는 `--coverage` 플래그. gcov 생성 → lcov로 HTML 리포트, llvm-cov로 *source-based* coverage. *line vs branch vs region*의 차이. `--coverage-threshold` 같은 CI 게이트. 헤더 전용 라이브러리의 coverage 함정.
