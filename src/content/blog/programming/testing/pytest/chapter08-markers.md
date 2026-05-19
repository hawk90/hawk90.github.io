---
title: "Ch 8: Markers"
date: 2026-05-10T08:00:00
description: "built-in markers·custom·skip·xfail·skipif — test에 의미 라벨 붙이기."
series: "pytest 심화"
seriesOrder: 8
tags: [pytest, marker, skip, xfail]
draft: true
---

> Outline — built-in — `skip`(절대 안 돌림), `skipif`(조건), `xfail`(실패 예상), `parametrize`. Custom marker — `pyproject.toml`의 `markers` 항목에 등록. `pytest -m "slow and not network"`로 선택 실행. `@pytest.mark.tryfirst`/`trylast`로 hook 순서.
