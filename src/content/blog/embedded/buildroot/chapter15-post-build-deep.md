---
title: "Ch 15: post-build·post-image 심화 — overlay와 fakeroot 한계"
date: 2026-05-19T15:00:00
description: "rootfs overlay·post-build script·post-image script로 산출물을 정밀 제어하는 패턴과 fakeroot로 표현 불가능한 한계."
series: "Buildroot Practical"
seriesOrder: 15
tags: [embedded, buildroot, post-build, overlay, fakeroot]
draft: true
---

Outline:
- rootfs overlay 디렉터리 (BR2_ROOTFS_OVERLAY)
- post-build script — TARGET_DIR 변경
- post-image script — BINARIES_DIR 변경, 이미지 생성
- system-table.txt로 권한·major/minor 설정
- fakeroot 한계 — capabilities, xattr
- secure boot / FIT image 생성 패턴
