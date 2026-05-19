---
title: "Ch 15: FIT image — multi-image, hash, configuration"
date: 2026-05-09T15:00:00
description: "Flattened Image Tree — kernel·DTB·initramfs·overlay를 한 컨테이너로 묶는 포맷."
series: "Bootloader Internals"
seriesOrder: 15
tags: [embedded, bootloader, u-boot, fit, mkimage]
draft: true
---

> Outline — *왜 FIT인가* — multi-image, configuration 선택, hash 검증, 서명 가능. `.its` 소스 → `mkimage -f` → `.itb` 바이너리. `bootm`이 FIT를 읽는 흐름. configuration node로 *같은 이미지에서 여러 보드 지원*.
