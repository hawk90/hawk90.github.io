---
title: "3-03: 뮤텍스 내부 구현"
date: 2026-05-12T23:00:00
description: "3-03: 뮤텍스 내부 구현"
series: "Practical RTOS Internals"
seriesOrder: 23
tags: [mutex, owner, lock-count]
draft: true
---

> Outline — *Owner + recursion count*. Lock·unlock 짝 검증. ISR에서 호출 금지 (owner 없음).
