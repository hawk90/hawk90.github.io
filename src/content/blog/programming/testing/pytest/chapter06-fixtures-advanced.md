---
title: "Ch 6: Fixtures 심화"
date: 2026-05-10T06:00:00
description: "request·params·indirect·factory fixture — fixture를 자유롭게 다루는 패턴."
series: "pytest 심화"
seriesOrder: 6
tags: [pytest, fixture, request, params, indirect]
draft: true
---

> Outline — `request` fixture로 메타 정보 (`request.param`, `request.node`). `@fixture(params=[...])`로 *fixture 자체를 parameterize*. `indirect=True`로 parametrize 값을 fixture에 *통과*. *factory pattern* — fixture가 함수를 반환해 test 안에서 호출. `tmp_path`·`monkeypatch` 등 built-in fixture.
