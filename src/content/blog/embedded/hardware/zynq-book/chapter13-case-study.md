---
title: "Ch 13: Case Study — Image Pipeline on Zynq"
date: 2026-05-19T13:00:00
description: "센서 → PL ISP → DDR → CPU → 표시 — Zynq에서 풀 SW 스택 한 번 보기."
series: "The Zynq Book"
seriesOrder: 13
tags: [zynq, case-study, image-pipeline, integration]
draft: true
---

> Outline — *예제 시스템* — MIPI 센서 → PL ISP IP → AXI DMA → DDR → Linux V4L2 → display. *데이터 경로*와 *제어 경로* 분리. *PetaLinux 설정*·DT overlay. *V4L2 sub-device* 노출. *Performance budget* — frame rate × 데이터량 vs bandwidth. *튜닝 포인트* — cache·DMA descriptor·IRQ coalescing.
