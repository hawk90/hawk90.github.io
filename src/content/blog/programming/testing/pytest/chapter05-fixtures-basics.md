---
title: "Ch 5: Fixtures 기초"
date: 2026-05-22T05:00:00
description: "scope·autouse·yield — fixture의 lifecycle과 DI 원리."
series: "pytest 심화"
seriesOrder: 5
tags: [pytest, fixture, scope, yield]
draft: true
---

> Outline — `@pytest.fixture(scope="function|class|module|package|session")`. *test 함수의 인자명*으로 fixture를 *주입*하는 DI 모델. `yield`로 setup·teardown 한 함수에. `autouse=True`로 자동 적용. `conftest.py`에 두면 *디렉터리 단위 공유*.
