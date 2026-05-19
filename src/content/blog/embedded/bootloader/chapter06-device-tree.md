---
title: "Ch 6: Device Tree와 부트로더 — DTB 로딩과 fixup"
date: 2026-05-09T06:00:00
description: "U-Boot가 DTB를 다루는 방식 — control DTB와 OS DTB, fdt 명령, 런타임 fixup."
series: "Bootloader Internals"
seriesOrder: 6
tags: [embedded, bootloader, u-boot, device-tree, dtb]
draft: true
---

> Outline — *control DTB*(U-Boot 자신이 쓰는 DT) vs *OS DTB*(커널에 넘기는 DT). `fdt_addr`·`fdt addr`·`fdt set` 명령. *fixup* 단계 — MAC 주소·메모리 크기·시리얼 번호를 부트 시 DT에 주입. embedded DT (`CONFIG_OF_EMBED`) vs separate DT.
