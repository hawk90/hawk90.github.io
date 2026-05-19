---
title: "Ch 19: 커널로 인계 — Linux boot ABI"
date: 2026-05-09T19:00:00
description: "부트로더 → 커널 인계 — ARM64·RISC-V·x86 boot ABI, 인자 전달, 레지스터 상태."
series: "Bootloader Internals"
seriesOrder: 19
tags: [embedded, bootloader, u-boot, linux-abi, kernel]
draft: true
---

> Outline — Linux kernel이 *부트로더에 요구하는 상태* — `Documentation/arm64/booting.rst`, `riscv/boot.rst`. 레지스터 ABI(x0=FDT, x1~x3=0). 캐시·MMU·인터럽트 상태. `bootm`·`booti`·`bootefi` 차이. initramfs 전달 방법.
