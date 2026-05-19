---
title: "Ch 10: 첫 부팅 — 0%부터 login prompt까지"
date: 2026-05-09T10:00:00
description: "보드 켜는 순간부터 login prompt까지의 단계별 체크포인트 — 어디서 멈추는지를 안다."
series: "BSP Development"
seriesOrder: 10
tags: [embedded, bsp, boot, debugging]
draft: true
---

> Outline — 부트 progression의 10개 체크포인트. ROM 첫 출력 → SPL 첫 출력 → DRAM 초기화 → U-Boot 첫 출력 → kernel decompression → kernel 첫 printk → DT 파싱 → driver probe → systemd/busybox → login. *각 단계가 안 나오면* 무엇을 의심해야 하는지의 결정 트리.
