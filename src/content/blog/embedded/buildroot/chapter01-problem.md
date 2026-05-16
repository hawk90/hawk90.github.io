---
title: "Ch 1: Buildroot가 푸는 문제 — Yocto와의 비교"
date: 2026-05-19T01:00:00
description: "Buildroot의 위치 — 임베디드 리눅스 rootfs 빌드 시스템, Yocto와의 트레이드오프."
series: "Buildroot Practical"
seriesOrder: 1
tags: [embedded, buildroot, rootfs, yocto, embedded-linux]
draft: true
---

> Outline — *왜 rootfs 빌드 시스템이 필요한가* — cross-compile, busybox 통합, 패키지 의존성. Buildroot vs Yocto — *단순함 vs 유연함*의 축. Buildroot가 적합한 경우(소형 시스템, 빠른 iteration) / Yocto가 적합한 경우(대형 배포·SDK). 시리즈에서 다룰 보드(QEMU + BeagleBone Black).
