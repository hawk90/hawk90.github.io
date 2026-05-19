---
title: "Ch 12: USB 부트 — fastboot, UMS, USB host"
date: 2026-05-09T12:00:00
description: "USB를 통한 부팅과 flash — fastboot, USB Mass Storage(UMS), USB host 부팅 흐름."
series: "Bootloader Internals"
seriesOrder: 12
tags: [embedded, bootloader, u-boot, usb, fastboot]
draft: true
---

> Outline — *fastboot* 프로토콜 — Android 생태계 표준, `fastboot flash boot boot.img`. *UMS* — U-Boot가 eMMC를 호스트 PC에 mass storage로 노출 (디버깅·복구용). USB host 부트 — USB stick에서 직접 부팅. NXP `uuu`·TI `uniflash` 같은 양산 도구와의 관계.
