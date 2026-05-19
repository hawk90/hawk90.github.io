---
title: "Ch 1: 부트로더가 푸는 문제"
date: 2026-05-09T01:00:00
description: "ROM부터 init까지의 전체 흐름과, 부트로더가 그 사이에서 채우는 자리."
series: "Bootloader Internals"
seriesOrder: 1
tags: [embedded, bootloader, u-boot, boot]
draft: true
---

> Outline — 전원 인가 → reset vector → 1단계 ROM → 부트로더 → 커널 → init까지의 모든 인계 단계를 한눈에. *왜 부트로더가 필요한가* — DDR 초기화, 부트 미디어 추상화, 커널 로딩 ABI. 시리즈 전체에서 다룰 보드(QEMU virt, BeagleBone Black, i.MX 8M)와 아키텍처(ARMv7, ARMv8-A, RISC-V) 소개.
