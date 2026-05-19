---
title: "Ch 3: unittest stdlib과 pytest 공존"
date: 2026-05-10T03:00:00
description: "기존 unittest 코드를 pytest로 그대로 돌리기 + 단계적 마이그레이션."
series: "pytest 심화"
seriesOrder: 3
tags: [pytest, unittest, migration]
draft: true
---

> Outline — pytest는 `unittest.TestCase` 서브클래스를 *그대로* 인식. `setUp/tearDown`도 동작. *부분 마이그레이션* 전략 — 새 코드는 pytest 스타일, 기존은 그대로. assert 메서드(`assertEqual` 등)를 plain `assert`로 치환할 때의 함정.
