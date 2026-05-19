---
title: "Chapter 5: TF-A 4-Stage 개요"
date: 2026-05-22T05:00:00
description: "ARM Trusted Firmware-A의 BL1·BL2·BL31·BL32·BL33 각 단계의 역할과 EL 전환을 한 자리에 정리합니다."
series: "ARM Bare-Metal Boot"
seriesOrder: 5
tags: [arm, baremetal, tf-a, bl1, bl2, bl31, bl33, exception-level]
draft: true
---

> Outline — TF-A의 4단계 + BL32 옵션을 EL·world·메모리 위치별로 정리하고, 각 단계가 *왜 분리되어야 하는지*를 책임 분할 관점에서 설명합니다.
