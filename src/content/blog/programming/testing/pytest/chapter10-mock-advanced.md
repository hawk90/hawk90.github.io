---
title: "Ch 10: Mock 심화"
slug: "programming/testing/pytest/chapter10-mock-advanced"
date: 2026-05-10T10:00:00
description: "patch decorators·monkeypatch·pytest-mock — *어디서* mocking을 적용할지."
series: "pytest 심화"
seriesOrder: 10
tags: [pytest, mock, patch, monkeypatch, pytest-mock]
draft: true
topics: ["programming", "programming/testing"]
---

> Outline — `@patch("module.path.Function")`의 *위치 규칙* (정의된 자리가 아니라 *사용되는 자리*). `patch.object`·`patch.dict`. `pytest`의 `monkeypatch` fixture — 환경 변수·sys.path·class attr 임시 변경. *pytest-mock*의 `mocker` fixture — patch가 *test 종료 시 자동 정리*.
