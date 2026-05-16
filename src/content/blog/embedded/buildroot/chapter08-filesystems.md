---
title: "Ch 8: 출력 파일시스템 — initramfs, squashfs, ext4, cpio"
date: 2026-05-19T08:00:00
description: "Buildroot가 생성하는 파일시스템 형식 비교 — 언제 무엇을, 크기·읽기성능·쓰기 가능성."
series: "Buildroot Practical"
seriesOrder: 8
tags: [embedded, buildroot, rootfs, ext4, squashfs, initramfs]
draft: true
---

> Outline — initramfs(부트 직후 ramdisk) vs ext4(쓰기 가능 영구) vs squashfs(읽기 전용 압축) vs cpio(아카이브). 각 포맷의 *생성 옵션*과 *제약*. read-only rootfs 패턴 (`overlayfs` + tmpfs). `BR2_TARGET_ROOTFS_*` 옵션들.
