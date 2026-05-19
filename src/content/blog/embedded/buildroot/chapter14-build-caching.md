---
title: "Ch 14: 빌드 캐싱 깊이 — dl, ccache, per-package"
date: 2026-05-19T14:00:00
description: "Buildroot의 캐싱 계층 — dl/ source 캐시, ccache compile 캐시, BR2_PER_PACKAGE_DIRECTORIES와 sstate가 없는 이유."
series: "Buildroot Practical"
seriesOrder: 14
tags: [embedded, buildroot, ccache, caching, performance]
draft: true
---

Outline:
- 캐싱 3계층 — dl/ · ccache · per-package
- dl/ 공유 (CI에서)
- ccache — BR2_CCACHE + BR2_CCACHE_DIR
- BR2_PER_PACKAGE_DIRECTORIES — sysroot 격리
- 왜 Yocto sstate 같은 게 없는가
- 빌드 시간 측정 — make timestamps + br2-builds
