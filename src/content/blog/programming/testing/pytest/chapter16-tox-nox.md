---
title: "Ch 16: tox / nox — 환경 매트릭스"
date: 2026-05-10T16:00:00
description: "Python 버전·의존성·OS 매트릭스로 격리된 환경에서 테스트 돌리기."
series: "pytest 심화"
seriesOrder: 16
tags: [pytest, tox, nox, matrix]
draft: true
---

> Outline — `tox.ini` 또는 `pyproject.toml`의 `[tool.tox]`. `envlist = py39,py310,py311,py312`. *parallel*(`tox -p auto`)·*reuse*(`--develop`). `nox`는 Python 코드로 환경 정의 (더 유연). uv 통합 추세. CI에서 *환경 캐싱* 전략.
