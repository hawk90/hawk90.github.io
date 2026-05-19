---
title: "Ch 7: parametrize"
date: 2026-05-10T07:00:00
description: "@pytest.mark.parametrize — 매개변수화, indirect, stacking, ID 만들기."
series: "pytest 심화"
seriesOrder: 7
tags: [pytest, parametrize, indirect, stacking]
draft: true
---

> Outline — `@pytest.mark.parametrize("x,y", [(1,2),(3,4)])`로 *데이터 기반 테스트*. 여러 데코레이터를 *stacking*하면 곱집합. `indirect=True`로 *fixture 통한 매개변수화*. `ids=` 또는 `pytest.param(..., id="case_a")`로 *읽기 좋은 test 이름*.
