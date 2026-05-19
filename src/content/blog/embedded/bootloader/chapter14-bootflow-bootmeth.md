---
title: "Ch 14: bootflow / bootmeth — 모던 U-Boot 추상화"
date: 2026-05-09T14:00:00
description: "U-Boot의 새로운 부트 모델 — bootflow / bootmeth로 distro_bootcmd 스크립트를 대체."
series: "Bootloader Internals"
seriesOrder: 14
tags: [embedded, bootloader, u-boot, bootflow, bootmeth]
draft: true
---

> Outline — *기존 distro_bootcmd*의 문제 — 거대한 env 스크립트, 디버깅 어려움. *bootmeth*(부트 방법: extlinux, EFI, sandbox, …) + *bootflow*(시도된 부트 시나리오) 모델. `bootflow scan`·`bootflow list`·`bootflow boot` 명령. 환경 변수 의존을 줄이고 *C 코드*로 부트 로직을.
