---
title: "Ch 4: Assertions 깊이"
date: 2026-05-22T04:00:00
description: "assert rewriting 내부, pytest.approx, 자세한 실패 메시지 생성."
series: "pytest 심화"
seriesOrder: 4
tags: [pytest, assert, approx, rewriting]
draft: true
---

> Outline — pytest가 `assert` 문을 *AST 단계에서 재작성*해 실패 시 *각 부분의 값*을 출력. 동작 원리와 한계(*conftest.py 위치 의존*). `pytest.approx`로 부동소수점·시퀀스 근사 비교. `pytest.raises`로 예외 검증, `pytest.warns`로 경고 검증.
