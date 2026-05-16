---
title: "Ch 18: EFI in U-Boot — bootefi와 EFI loader"
date: 2026-05-18T18:00:00
description: "U-Boot이 UEFI Boot Services를 노출하는 방식 — bootefi, EBBR, Linux EFI stub과의 연결."
series: "Bootloader Internals"
seriesOrder: 18
tags: [embedded, bootloader, u-boot, efi, uefi, ebbr]
draft: true
---

> Outline — U-Boot의 *EFI loader* — Boot Services + Runtime Services 부분 구현. `bootefi`로 EFI 애플리케이션(GRUB, systemd-boot, Linux EFI stub) 실행. EBBR(Embedded Base Boot Requirements) 표준. *왜 임베디드에서도 EFI인가* — 표준화·distro 호환.
