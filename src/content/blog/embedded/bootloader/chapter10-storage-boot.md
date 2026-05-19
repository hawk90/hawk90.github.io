---
title: "Ch 10: 스토리지 부트 — MMC, SCSI, NAND, SPI Flash"
date: 2026-05-09T10:00:00
description: "부트 미디어별 동작 차이 — eMMC, SD, SATA, NAND, SPI NOR/NAND의 부트 모드."
series: "Bootloader Internals"
seriesOrder: 10
tags: [embedded, bootloader, u-boot, storage, mmc, nand]
draft: true
---

> Outline — 각 부트 미디어의 *물리 레이어*와 *부트 ROM이 기대하는 헤더*. MMC boot partition·SPI NOR 메모리 맵·NAND ECC. `mmc info`·`sf probe`·`nand info` 명령 흐름. 부트 미디어 선택 핀(BOOTSEL).
