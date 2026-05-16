---
title: "Ch 4: 부트 단계 — BL1 → SPL → TPL → U-Boot Proper"
date: 2026-05-18T04:00:00
description: "ARM64와 RISC-V의 다단 부트 — BL1·BL2·BL31·BL33, SPL·TPL·U-Boot Proper의 책임 분할."
series: "Bootloader Internals"
seriesOrder: 4
tags: [embedded, bootloader, u-boot, tf-a, spl]
draft: true
---

> Outline — ARM64 secure world boot (BL1·BL2·BL31·BL32·BL33). U-Boot의 SPL/TPL 모델 — *작은 첫 단계가 큰 다음 단계를 RAM에 로드*. RISC-V의 OpenSBI 위치. 각 단계의 *메모리 모델*과 *권한 수준*.
