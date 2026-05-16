---
title: "Ch 18: 실전 — CI 통합, JUnit XML, 회귀 감지"
date: 2026-05-21T18:00:00
description: "GitHub Actions·GitLab CI에서 gtest 돌리기, 결과 시각화, flaky test 감지."
series: "gtest 심화"
seriesOrder: 18
tags: [gtest, ci, junit, github-actions, flaky]
draft: true
---

> Outline — `--gtest_output=xml:report.xml`로 JUnit XML 생성. GitHub Actions `mikepenz/action-junit-report`로 PR에 결과 표시. *flaky test* — `--gtest_repeat=N --gtest_shuffle`로 감지·격리. coverage 게이트와 결합. 시리즈 마무리.
