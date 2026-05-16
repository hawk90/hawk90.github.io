---
title: "Ch 17: 이미지 패키징 — flash layout, partition, GPT"
date: 2026-05-20T17:00:00
description: "최종 이미지 조립 — 파티션 테이블, flash layout, SD/eMMC/UFS 굽기 워크플로."
series: "BSP Development"
seriesOrder: 17
tags: [embedded, bsp, image, partition, gpt]
draft: true
---

> Outline — 부트 미디어별 *섹터 0의 의미* — MBR vs GPT vs SoC 부트 헤더. SPL·U-Boot·env·kernel·rootfs의 *offset 결정*. `genimage` 도구로 파일들을 한 `.img`로 조립. SD 카드 굽는 `dd` 명령과 `bmaptool`.
