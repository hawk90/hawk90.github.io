---
title: "Ch 13: Coverage"
date: 2026-05-22T13:00:00
description: "pytest-cov·branch coverage·--cov-fail-under — coverage 측정과 게이트."
series: "pytest 심화"
seriesOrder: 13
tags: [pytest, coverage, pytest-cov, branch]
draft: true
---

> Outline — `pytest --cov=mypkg --cov-report=term-missing`. *branch coverage*는 `--cov-branch` 옵션. `.coveragerc` 또는 `pyproject.toml [tool.coverage.run]`로 *exclude·context·plugins*. `--cov-fail-under=80`으로 CI 게이트. *namespace packages* 함정.
