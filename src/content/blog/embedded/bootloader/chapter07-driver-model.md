---
title: "Ch 7: Driver Model — uclass, driver, device"
date: 2026-05-18T07:00:00
description: "U-Boot Driver Model — uclass·driver·udevice 구조와 DT 기반 driver binding."
series: "Bootloader Internals"
seriesOrder: 7
tags: [embedded, bootloader, u-boot, driver-model]
draft: true
---

> Outline — *legacy driver* → *Driver Model* 전환의 동기. uclass(인터페이스)·driver(구현)·udevice(인스턴스) 삼각 구조. DT의 `compatible`을 통한 자동 binding. `dm tree`·`dm uclass` 명령으로 디버깅. 한 드라이버를 DM으로 작성하는 최소 예시.
