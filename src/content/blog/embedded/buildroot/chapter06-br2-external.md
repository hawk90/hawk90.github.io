---
title: "Ch 6: 외부 트리 — BR2_EXTERNAL"
date: 2026-05-19T06:00:00
description: "회사·팀의 패키지·보드 정의를 Buildroot 본체와 분리하는 BR2_EXTERNAL 메커니즘."
series: "Buildroot Practical"
seriesOrder: 6
tags: [embedded, buildroot, br2-external, layer]
draft: true
---

> Outline — *왜 외부 트리인가* — Buildroot 본체에 patch 쌓지 않고 *내 트리만* 유지. `external.desc`·`Config.in`·`external.mk`·`configs/`·`package/`·`board/` 구조. `make BR2_EXTERNAL=... menuconfig` 흐름. 여러 외부 트리 stacking.
