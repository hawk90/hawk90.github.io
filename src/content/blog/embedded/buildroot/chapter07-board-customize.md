---
title: "Ch 7: 보드 customize — overlay, post-build, post-image"
date: 2026-05-19T07:00:00
description: "보드별 파일 추가, 빌드 후 처리, 이미지 생성 후 처리 — 세 가지 hook."
series: "Buildroot Practical"
seriesOrder: 7
tags: [embedded, buildroot, overlay, post-build, post-image]
draft: true
---

> Outline — `BR2_ROOTFS_OVERLAY` — 파일 트리를 그대로 rootfs에 복사. `BR2_ROOTFS_POST_BUILD_SCRIPT` — rootfs 빌드 직후 *수정*. `BR2_ROOTFS_POST_IMAGE_SCRIPT` — `.img`·`.tar` 생성 후 *flash 이미지 조립*. 각 hook의 인자와 환경 변수.
