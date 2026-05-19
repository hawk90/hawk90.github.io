---
title: "Ch 18: 실전 — CI·pre-commit·coverage gate"
date: 2026-05-10T18:00:00
description: "GitHub Actions·pre-commit·flaky test 감지 — pytest를 양산 환경에."
series: "pytest 심화"
seriesOrder: 18
tags: [pytest, ci, pre-commit, github-actions, flaky]
draft: true
---

> Outline — GitHub Actions의 *matrix 빌드* (`strategy.matrix.python-version`). `--junitxml=report.xml`로 *결과 시각화*. *pre-commit*에 `pytest --quick`로 빠른 단위만. coverage 게이트 (`--cov-fail-under`). flaky test — `pytest-rerunfailures` + `pytest-randomly`로 *감지하고 분리*. 시리즈 마무리.
