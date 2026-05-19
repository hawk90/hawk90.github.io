---
title: "Ch 20: Yocto로의 migration — 언제·어떻게 옮길까"
date: 2026-05-19T20:00:00
description: "Buildroot가 한계에 도달하는 신호와 Yocto/OE로 점진 이전하는 패턴, meta-buildroot 같은 hybrid 옵션."
series: "Buildroot Practical"
seriesOrder: 20
tags: [embedded, buildroot, yocto, openembedded, migration]
draft: true
---

Outline:
- Buildroot의 한계가 보이기 시작하는 신호
- migration 결정 기준 — board 수, package 수, 팀 크기
- 점진적 이전 — meta-buildroot, hybrid 운영
- recipe 변환 — .mk → .bb
- defconfig → MACHINE conf
- 운영 비용 비교
