---
title: "9-09: False sharing 해결"
date: 2026-05-16T13:00:00
description: "Cache line 공유·alignas·padding·per-CPU 변수."
series: "Modern Embedded Recipes"
seriesOrder: 109
tags: [recipes, concurrency, cache, false-sharing]
draft: true
---

> Outline — False sharing 영향·perf c2c로 감지·alignas(64) padding·per-CPU 변수·thread-local 활용.
